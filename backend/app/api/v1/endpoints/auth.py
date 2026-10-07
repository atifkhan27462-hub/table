from fastapi import APIRouter, Depends, Header, Request, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.core.security import rate_limiter
from app.models import User
from app.schemas.auth import (
    DeviceAuthRequest,
    DeviceAuthResponse,
    LoginRequest,
    LogoutRequest,
    RefreshTokenRequest,
    TokenResponse,
    UserBriefOut,
)
from app.schemas.common import ApiResponse, MessageResponse
from app.services.auth_service import AuthService

security_scheme = HTTPBearer(auto_error=False)
router = APIRouter(prefix="/auth", tags=["Authentication & Access"])


@router.post("/login", response_model=ApiResponse[TokenResponse], summary="Authenticate staff credentials and issue JWT tokens")
def login(request: Request, payload: LoginRequest, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("User-Agent")
    max_reqs = 100 if settings.DEBUG else 10
    rate_limiter.check_rate_limit(f"login_{client_ip}", max_requests=max_reqs, window_seconds=60)

    token_data = AuthService.authenticate_user(db, payload, ip_address=client_ip, user_agent=user_agent)
    return ApiResponse(data=token_data, message="Authentication successful.")


@router.post("/refresh", response_model=ApiResponse[TokenResponse], summary="Rotate refresh token and issue fresh access token")
def refresh_token(request: Request, payload: RefreshTokenRequest, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    max_reqs = 100 if settings.DEBUG else 20
    rate_limiter.check_rate_limit(f"refresh_{client_ip}", max_requests=max_reqs, window_seconds=60)
    token_data = AuthService.refresh_session_tokens(db, payload, ip_address=client_ip)
    return ApiResponse(data=token_data, message="Tokens refreshed successfully.")


@router.post("/logout", response_model=ApiResponse[MessageResponse], summary="Revoke tokens and terminate user session")
def logout(
    request: Request,
    payload: LogoutRequest = LogoutRequest(),
    credentials: HTTPAuthorizationCredentials = Security(security_scheme),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    client_ip = request.client.host if request.client else "unknown"
    access_token = credentials.credentials if credentials else ""
    AuthService.logout(db, current_user, access_token, payload.refresh_token, ip_address=client_ip)
    return ApiResponse(data=MessageResponse(message="Logged out successfully. Tokens revoked."))


@router.post("/device-pair", response_model=ApiResponse[DeviceAuthResponse], summary="Handshake for 32-inch table hardware")
def pair_device(request: Request, payload: DeviceAuthRequest, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    max_reqs = 100 if settings.DEBUG else 15
    rate_limiter.check_rate_limit(f"devpair_{client_ip}", max_requests=max_reqs, window_seconds=60)
    device_data = AuthService.authenticate_table_device(db, payload)
    return ApiResponse(data=device_data, message="Table device hardware paired successfully.")


@router.get("/me", response_model=ApiResponse[UserBriefOut], summary="Get current authenticated user profile")
def get_me(current_user: User = Depends(get_current_user)):
    user_out = UserBriefOut(
        id=current_user.id,
        restaurant_id=current_user.restaurant_id,
        email=current_user.email,
        full_name=current_user.full_name,
        role_code=current_user.role.code if current_user.role else "STAFF",
        is_active=current_user.is_active,
    )
    return ApiResponse(data=user_out)
