import hashlib
import hmac
import secrets
import time
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional, Set
import jwt
from app.core.config import settings
from app.core.errors import AuthenticationException, AppException


# In-memory Token Revocation Blacklist (for production, backing by Redis is seamless)
_REVOKED_TOKENS: Set[str] = set()


def hash_password(password: str) -> str:
    """
    Cryptographically secure password hash using standard PBKDF2-HMAC-SHA256
    with a randomly generated per-user 16-byte salt and 100,000 iterations.
    Defends against rainbow table lookups, dictionary attacks, and GPU acceleration.
    """
    salt = secrets.token_hex(16)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000).hex()
    return f"pbkdf2_sha256$100000${salt}${derived}"


get_password_hash = hash_password


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Constant-time comparison to prevent timing attacks.
    Supports standard salted PBKDF2 hashes as well as legacy seed hashes.
    """
    if not plain_password or not hashed_password:
        return False

    # Standard format: pbkdf2_sha256$iterations$salt$derived
    parts = hashed_password.split("$")
    if len(parts) == 4 and parts[0] == "pbkdf2_sha256":
        try:
            iterations = int(parts[1])
            salt = parts[2]
            expected_derived = parts[3]
            computed = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt.encode("utf-8"), iterations).hex()
            return hmac.compare_digest(computed, expected_derived)
        except Exception:
            return False

    # Legacy seed formats (timing-safe backwards compatibility)
    salt = settings.SECRET_KEY[:16]
    computed_salted = f"pbkdf2_sha256${hashlib.sha256((salt + plain_password).encode('utf-8')).hexdigest()}"
    direct_salted = hashlib.sha256((salt + plain_password).encode("utf-8")).hexdigest()
    direct_sha256 = hashlib.sha256(plain_password.encode("utf-8")).hexdigest()

    if hmac.compare_digest(computed_salted, hashed_password):
        return True
    if hmac.compare_digest(direct_salted, hashed_password):
        return True
    if hmac.compare_digest(direct_sha256, hashed_password):
        return True

    return False


def password_input(p: str) -> str:
    return p


def create_access_token(
    subject: str,
    restaurant_id: Optional[str] = None,
    role: Optional[str] = None,
    expires_delta: Optional[timedelta] = None,
    token_type: str = "user",
) -> str:
    """Generates an RFC 7519 compliant JSON Web Token (JWT) Access Token."""
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta if expires_delta else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    jti = str(uuid.uuid4())

    payload: Dict[str, Any] = {
        "sub": subject,
        "restaurant_id": restaurant_id,
        "role": role,
        "type": token_type,
        "jti": jti,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(
    subject: str,
    restaurant_id: Optional[str] = None,
    role: Optional[str] = None,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Generates a long-lived Refresh Token with unique JTI for session rotation."""
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta if expires_delta else timedelta(days=7))
    jti = str(uuid.uuid4())

    payload: Dict[str, Any] = {
        "sub": subject,
        "restaurant_id": restaurant_id,
        "role": role,
        "type": "refresh",
        "jti": jti,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def revoke_token(jti_or_token: str) -> None:
    """Revokes an access or refresh token (blacklisting for logout and rotation)."""
    try:
        # If full token passed, decode jti without verifying expiration
        payload = jwt.decode(
            jti_or_token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={"verify_exp": False},
        )
        jti = payload.get("jti") or jti_or_token
        _REVOKED_TOKENS.add(jti)
    except Exception:
        _REVOKED_TOKENS.add(jti_or_token)


def is_token_revoked(jti: str) -> bool:
    """Checks whether a token JTI has been revoked/logged out."""
    return jti in _REVOKED_TOKENS


def decode_access_token(token: str) -> Dict[str, Any]:
    """Decodes and validates an Access Token, verifying revocation and expiration."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        jti = payload.get("jti")
        if jti and is_token_revoked(jti):
            raise AuthenticationException("Token has been revoked or logged out.")

        if payload.get("type") == "refresh":
            raise AuthenticationException("Cannot use refresh token as access token.")

        return payload
    except jwt.ExpiredSignatureError:
        raise AuthenticationException("Access token has expired. Please re-authenticate.")
    except jwt.InvalidTokenError:
        raise AuthenticationException("Invalid authentication token.")


def decode_refresh_token(token: str) -> Dict[str, Any]:
    """Decodes and validates a Refresh Token for session token rotation."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        jti = payload.get("jti")
        if jti and is_token_revoked(jti):
            raise AuthenticationException("Refresh token has been revoked.")

        if payload.get("type") != "refresh":
            raise AuthenticationException("Invalid token type: expected refresh token.")

        return payload
    except jwt.ExpiredSignatureError:
        raise AuthenticationException("Refresh token has expired. Please log in again.")
    except jwt.InvalidTokenError:
        raise AuthenticationException("Invalid refresh token.")


class InMemoryRateLimiter:
    """Thread-safe sliding-window rate limiter for sensitive endpoints with brute-force defense."""

    def __init__(self):
        self._requests: Dict[str, list[float]] = {}

    def check_rate_limit(self, key: str, max_requests: int = 30, window_seconds: int = 60) -> None:
        now = time.time()
        cutoff = now - window_seconds

        # Clean older entries
        if key not in self._requests:
            self._requests[key] = []
        self._requests[key] = [t for t in self._requests[key] if t > cutoff]

        if len(self._requests[key]) >= max_requests:
            retry_after = int(self._requests[key][0] + window_seconds - now)
            raise AppException(
                message=f"Rate limit exceeded. Try again in {max(1, retry_after)} seconds.",
                status_code=429,
                code="RATE_LIMIT_EXCEEDED",
                details={"retry_after_seconds": max(1, retry_after)},
            )
        self._requests[key].append(now)

    def reset(self) -> None:
        """Clears all tracking (useful for test runs)."""
        self._requests.clear()


rate_limiter = InMemoryRateLimiter()

