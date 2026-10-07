from typing import Callable, Generator, List, Optional, Set, Union
from fastapi import Depends, Header, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.errors import AuthenticationException, EntityNotFoundException, PermissionDeniedException
from app.core.security import decode_access_token
from app.models import Restaurant, Role, Table, TableDevice, User

security_scheme = HTTPBearer(auto_error=False)


def get_db() -> Generator[Session, None, None]:
    """Provides a transactional database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def normalize_role(role_code: str) -> str:
    """Normalizes role codes to canonical Phase 5 naming standards."""
    code = role_code.upper().strip()
    if code in ["SUPERADMIN", "SUPER_ADMIN"]:
        return "SUPER_ADMIN"
    if code in ["RESTAURANT_ADMIN", "REST_ADMIN"]:
        return "RESTAURANT_ADMIN"
    if code in ["WAITER", "STAFF"]:
        return "STAFF"
    return code


# Canonical Role Hierarchy
# SUPER_ADMIN > RESTAURANT_ADMIN > MANAGER > STAFF / KITCHEN > TABLE_DEVICE
ROLE_HIERARCHY = {
    "SUPER_ADMIN": {"SUPER_ADMIN", "RESTAURANT_ADMIN", "MANAGER", "KITCHEN", "STAFF", "TABLE_DEVICE"},
    "RESTAURANT_ADMIN": {"RESTAURANT_ADMIN", "MANAGER", "KITCHEN", "STAFF"},
    "MANAGER": {"MANAGER", "STAFF"},
    "KITCHEN": {"KITCHEN"},
    "STAFF": {"STAFF"},
    "TABLE_DEVICE": {"TABLE_DEVICE"},
}


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Authenticates JWT Bearer token and resolves active user."""
    if not credentials:
        raise AuthenticationException("Authorization header required with Bearer token.")

    token = credentials.credentials
    payload = decode_access_token(token)

    # Reject table device tokens from masquerading as user tokens
    if payload.get("type") == "device":
        raise PermissionDeniedException("Device tokens cannot access user/staff endpoints.")

    user_id = payload.get("sub")
    if not user_id:
        raise AuthenticationException("Invalid token payload: missing subject.")

    user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
    if not user:
        raise AuthenticationException("User account associated with this token not found.")

    if not user.is_active:
        raise AuthenticationException("User account is inactive or suspended. Access denied.")

    return user


def require_roles(*allowed_roles: str) -> Callable[[User], User]:
    """
    Dependency factory enforcing Role-Based Access Control (RBAC).
    Checks that user's canonical role satisfies at least one required role,
    respecting hierarchical inheritance.
    """
    canonical_allowed = {normalize_role(r) for r in allowed_roles}

    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role = normalize_role(current_user.role.code if current_user.role else "GUEST")

        # Super admin always passes
        if user_role == "SUPER_ADMIN":
            return current_user

        # Explicit allowed role match
        if user_role in canonical_allowed:
            return current_user

        # Check hierarchical inheritance
        user_permissions = ROLE_HIERARCHY.get(user_role, set())
        if any(allowed in user_permissions for allowed in canonical_allowed):
            return current_user

        raise PermissionDeniedException(
            f"Access forbidden: Role '{user_role}' has insufficient privileges. Requires: {list(canonical_allowed)}"
        )

    return role_checker


def require_permissions(*required_permissions: str) -> Callable[[User], User]:
    """Dependency factory checking that user's role has specific permission codes."""

    def perm_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role = normalize_role(current_user.role.code if current_user.role else "GUEST")
        if user_role == "SUPER_ADMIN":
            return current_user

        role_perms = {p.code for p in (current_user.role.permissions if current_user.role else [])}
        if not any(req in role_perms for req in required_permissions):
            raise PermissionDeniedException(
                f"Access forbidden: Missing required permission in {list(required_permissions)}"
            )
        return current_user

    return perm_checker


def verify_tenant_access(current_user: User, target_restaurant_id: str) -> None:
    """
    Enforces multi-tenant data isolation.
    Ensures that a user can only read or modify resources belonging to their own restaurant,
    unless they hold SUPER_ADMIN platform privileges.
    """
    user_role = normalize_role(current_user.role.code if current_user.role else "GUEST")
    if user_role == "SUPER_ADMIN":
        return

    if current_user.restaurant_id != target_restaurant_id:
        raise PermissionDeniedException(
            "Access denied: Cross-restaurant resource access is strictly prohibited."
        )


def get_table_device(
    x_device_token: Optional[str] = Header(None, alias="X-Device-Token"),
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_scheme),
    db: Session = Depends(get_db),
) -> TableDevice:
    """
    Authenticates physical 32-inch table device using either:
    1. 'X-Device-Token' header (hardware device secret)
    2. Bearer token issued during device handshake
    Strictly forbids unauthenticated fallbacks.
    """
    # 1. Bearer Token Check
    if credentials and credentials.credentials:
        try:
            payload = decode_access_token(credentials.credentials)
            if payload.get("type") == "device":
                device_id = payload.get("sub")
                device = db.query(TableDevice).filter_by(id=device_id, is_active=True).first()
                if device:
                    return device
        except Exception:
            pass

    # 2. X-Device-Token Header Check
    if x_device_token:
        device = db.query(TableDevice).filter_by(device_token=x_device_token, is_active=True).first()
        if device:
            return device
        raise AuthenticationException("Unrecognized or revoked table device hardware token.")

    raise AuthenticationException("Valid X-Device-Token header or device Bearer token is required.")


def get_user_or_device(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_scheme),
    x_device_token: Optional[str] = Header(None, alias="X-Device-Token"),
    db: Session = Depends(get_db),
) -> Union[User, TableDevice]:
    """
    Authenticates a request from either an authorized Staff User OR an authorized Table Device.
    Strictly forbids anonymous unauthenticated access.
    """
    # 1. Bearer Token Check
    if credentials and credentials.credentials:
        try:
            payload = decode_access_token(credentials.credentials)
            if payload.get("type") == "device":
                device_id = payload.get("sub")
                device = db.query(TableDevice).filter_by(id=device_id, is_active=True).first()
                if device:
                    return device
            else:
                user_id = payload.get("sub")
                if user_id:
                    user = db.query(User).filter(User.id == user_id, User.is_deleted == False, User.is_active == True).first()
                    if user:
                        return user
        except Exception:
            pass

    # 2. X-Device-Token Header Check
    if x_device_token:
        device = db.query(TableDevice).filter_by(device_token=x_device_token, is_active=True).first()
        if device:
            return device

    raise AuthenticationException("Authentication required: valid User Bearer token or Table Device credentials.")


def get_current_restaurant(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(lambda: None),
) -> Restaurant:
    """Resolves active multi-tenant restaurant instance."""
    restaurant = db.query(Restaurant).filter_by(is_active=True).first()
    if not restaurant:
        raise EntityNotFoundException("Restaurant", "active")
    return restaurant
