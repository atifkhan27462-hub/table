from datetime import datetime, timezone
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from app.core.errors import AuthenticationException, EntityNotFoundException
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    revoke_token,
    verify_password,
)
from app.models import AuditLog, Restaurant, Table, TableDevice, User
from app.schemas.auth import (
    DeviceAuthRequest,
    DeviceAuthResponse,
    LoginRequest,
    RefreshTokenRequest,
    TokenResponse,
    UserBriefOut,
)


class AuthService:
    @staticmethod
    def authenticate_user(
        db: Session,
        credentials: LoginRequest,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> TokenResponse:
        user = db.query(User).filter(User.email == credentials.email, User.is_deleted == False).first()

        # Handle failed login & audit log
        if not user or not verify_password(credentials.password, user.password_hash):
            if user:
                # Log failed attempt
                log = AuditLog(
                    restaurant_id=user.restaurant_id,
                    actor_id=user.id,
                    actor_type="USER",
                    action="LOGIN_FAILED",
                    entity_name="User",
                    entity_id=user.id,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    status="FAILURE",
                )
                db.add(log)
                db.commit()
            raise AuthenticationException("Invalid email or password.")

        # Check account status
        if not user.is_active:
            log = AuditLog(
                restaurant_id=user.restaurant_id,
                actor_id=user.id,
                actor_type="USER",
                action="LOGIN_BLOCKED_INACTIVE",
                entity_name="User",
                entity_id=user.id,
                ip_address=ip_address,
                user_agent=user_agent,
                status="BLOCKED",
            )
            db.add(log)
            db.commit()
            raise AuthenticationException("User account is inactive or suspended. Access denied.")

        # Update last login timestamp
        now = datetime.now(timezone.utc)
        user.last_login_at = now

        role_code = user.role.code if user.role else "STAFF"

        # Generate Access Token & Refresh Token pair
        access_token = create_access_token(
            subject=user.id,
            restaurant_id=user.restaurant_id,
            role=role_code,
        )
        refresh_token = create_refresh_token(
            subject=user.id,
            restaurant_id=user.restaurant_id,
            role=role_code,
        )

        # Record Successful Login Audit
        log = AuditLog(
            restaurant_id=user.restaurant_id,
            actor_id=user.id,
            actor_type="USER",
            action="LOGIN_SUCCESS",
            entity_name="User",
            entity_id=user.id,
            ip_address=ip_address,
            user_agent=user_agent,
            status="SUCCESS",
        )
        db.add(log)
        db.commit()

        user_out = UserBriefOut(
            id=user.id,
            restaurant_id=user.restaurant_id,
            email=user.email,
            full_name=user.full_name,
            role_code=role_code,
            is_active=user.is_active,
        )

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=60 * 24 * 7 * 60,
            user=user_out,
        )

    @staticmethod
    def refresh_session_tokens(
        db: Session,
        payload: RefreshTokenRequest,
        ip_address: Optional[str] = None,
    ) -> TokenResponse:
        """Rotates refresh token and issues fresh access token."""
        decoded = decode_refresh_token(payload.refresh_token)
        user_id = decoded.get("sub")
        old_jti = decoded.get("jti")

        user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
        if not user or not user.is_active:
            raise AuthenticationException("User account associated with refresh token is invalid or inactive.")

        # Revoke the old refresh token (Token Rotation defense against reuse)
        if old_jti:
            revoke_token(old_jti)

        role_code = user.role.code if user.role else "STAFF"

        new_access_token = create_access_token(
            subject=user.id,
            restaurant_id=user.restaurant_id,
            role=role_code,
        )
        new_refresh_token = create_refresh_token(
            subject=user.id,
            restaurant_id=user.restaurant_id,
            role=role_code,
        )

        # Audit token refresh
        log = AuditLog(
            restaurant_id=user.restaurant_id,
            actor_id=user.id,
            actor_type="USER",
            action="TOKEN_REFRESH",
            entity_name="Session",
            entity_id=old_jti,
            ip_address=ip_address,
            status="SUCCESS",
        )
        db.add(log)
        db.commit()

        user_out = UserBriefOut(
            id=user.id,
            restaurant_id=user.restaurant_id,
            email=user.email,
            full_name=user.full_name,
            role_code=role_code,
            is_active=user.is_active,
        )

        return TokenResponse(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            token_type="bearer",
            expires_in=60 * 24 * 7 * 60,
            user=user_out,
        )

    @staticmethod
    def logout(
        db: Session,
        user: User,
        access_token: str,
        refresh_token: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> None:
        """Revokes access and refresh tokens, invalidating session."""
        revoke_token(access_token)
        if refresh_token:
            revoke_token(refresh_token)

        log = AuditLog(
            restaurant_id=user.restaurant_id,
            actor_id=user.id,
            actor_type="USER",
            action="LOGOUT",
            entity_name="Session",
            entity_id=user.id,
            ip_address=ip_address,
            status="SUCCESS",
        )
        db.add(log)
        db.commit()

    @staticmethod
    def authenticate_table_device(db: Session, data: DeviceAuthRequest) -> DeviceAuthResponse:
        device = db.query(TableDevice).filter_by(device_token=data.device_token).first()
        if not device or not device.is_active:
            raise AuthenticationException("Unregistered or deactivated hardware device token.")

        # Update hardware telemetry
        device.hardware_id = data.hardware_id
        if data.screen_resolution:
            device.screen_resolution = data.screen_resolution
        if data.app_version:
            device.app_version = data.app_version
        device.last_heartbeat = datetime.now(timezone.utc)
        device.status = "ONLINE"
        db.commit()

        table = device.table
        restaurant_id = table.restaurant_id if table else ""

        token = create_access_token(
            subject=device.id,
            restaurant_id=restaurant_id,
            role="TABLE_DEVICE",
            token_type="device",
        )

        log = AuditLog(
            restaurant_id=restaurant_id,
            actor_id=device.id,
            actor_type="DEVICE",
            action="DEVICE_HANDSHAKE",
            entity_name="TableDevice",
            entity_id=device.id,
            status="SUCCESS",
        )
        db.add(log)
        db.commit()

        return DeviceAuthResponse(
            access_token=token,
            table_id=device.table_id,
            table_number=table.table_number if table else "Table 00",
            restaurant_id=restaurant_id,
            device_id=device.id,
        )
