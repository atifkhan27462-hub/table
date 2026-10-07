from typing import List, Optional
from sqlalchemy.orm import Session
from app.core.errors import EntityNotFoundException, PermissionDeniedException, ValidationException
from app.core.security import hash_password
from app.models import AuditLog, Permission, Role, User
from app.schemas.user import UserCreate, UserUpdate


def normalize_code(code: str) -> str:
    c = code.upper().strip()
    if c in ["SUPERADMIN", "SUPER_ADMIN"]:
        return "SUPER_ADMIN"
    return c


class UserService:
    @staticmethod
    def list_users(db: Session, restaurant_id: Optional[str] = None) -> List[User]:
        query = db.query(User).filter(User.is_deleted == False)
        if restaurant_id:
            query = query.filter(User.restaurant_id == restaurant_id)
        return query.all()

    @staticmethod
    def get_user_by_id(db: Session, user_id: str) -> User:
        user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
        if not user:
            raise EntityNotFoundException("User", user_id)
        return user

    @staticmethod
    def create_user(db: Session, data: UserCreate, actor: Optional[User] = None) -> User:
        existing = db.query(User).filter_by(email=data.email, is_deleted=False).first()
        if existing:
            raise ValidationException(f"User with email '{data.email}' already exists.")

        target_role = db.query(Role).filter_by(id=data.role_id).first()
        if not target_role:
            raise EntityNotFoundException("Role", data.role_id)

        target_role_code = normalize_code(target_role.code)

        # Defense against privilege escalation
        if actor:
            actor_role_code = normalize_code(actor.role.code if actor.role else "STAFF")

            # Only SUPER_ADMIN can create SUPER_ADMIN users
            if target_role_code == "SUPER_ADMIN" and actor_role_code != "SUPER_ADMIN":
                log = AuditLog(
                    restaurant_id=actor.restaurant_id or data.restaurant_id,
                    actor_id=actor.id,
                    actor_type="USER",
                    action="ROLE_ESCALATION_BLOCKED",
                    entity_name="User",
                    status="BLOCKED",
                    diff_before={"attempted_role": target_role_code},
                )
                db.add(log)
                db.commit()
                raise PermissionDeniedException(
                    "Privilege escalation blocked: Only Super Administrators can provision Super Administrator accounts."
                )

            # Cross-tenant creation defense
            if actor_role_code != "SUPER_ADMIN" and data.restaurant_id and actor.restaurant_id != data.restaurant_id:
                raise PermissionDeniedException(
                    "Cross-restaurant access blocked: Cannot provision staff for another restaurant tenant."
                )

        restaurant_id = data.restaurant_id or (actor.restaurant_id if actor else None)

        user = User(
            restaurant_id=restaurant_id,
            role_id=data.role_id,
            email=data.email,
            password_hash=hash_password(data.password),
            full_name=data.full_name,
            phone=data.phone,
            is_active=True,
        )
        db.add(user)

        # Audit staff creation
        if actor:
            log = AuditLog(
                restaurant_id=restaurant_id or actor.restaurant_id,
                actor_id=actor.id,
                actor_type="USER",
                action="USER_CREATED",
                entity_name="User",
                entity_id=user.id,
                status="SUCCESS",
                diff_after={"email": user.email, "role": target_role_code},
            )
            db.add(log)

        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def update_user(db: Session, user_id: str, data: UserUpdate, actor: Optional[User] = None) -> User:
        user = UserService.get_user_by_id(db, user_id)
        update_data = data.model_dump(exclude_unset=True)

        if actor:
            actor_role_code = normalize_code(actor.role.code if actor.role else "STAFF")
            # Cross-tenant defense
            if actor_role_code != "SUPER_ADMIN" and actor.restaurant_id != user.restaurant_id:
                raise PermissionDeniedException(
                    "Cross-restaurant access blocked: Cannot modify staff of another restaurant tenant."
                )

            # Prevent role escalation
            if "role_id" in update_data and update_data["role_id"]:
                target_role = db.query(Role).filter_by(id=update_data["role_id"]).first()
                if target_role and normalize_code(target_role.code) == "SUPER_ADMIN" and actor_role_code != "SUPER_ADMIN":
                    log = AuditLog(
                        restaurant_id=actor.restaurant_id,
                        actor_id=actor.id,
                        actor_type="USER",
                        action="ROLE_ESCALATION_BLOCKED",
                        entity_name="User",
                        entity_id=user.id,
                        status="BLOCKED",
                    )
                    db.add(log)
                    db.commit()
                    raise PermissionDeniedException(
                        "Privilege escalation blocked: Cannot elevate user to Super Administrator."
                    )

        if "password" in update_data and update_data["password"]:
            user.password_hash = hash_password(update_data.pop("password"))

        for key, value in update_data.items():
            setattr(user, key, value)

        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def list_roles(db: Session) -> List[Role]:
        return db.query(Role).all()

    @staticmethod
    def list_permissions(db: Session) -> List[Permission]:
        return db.query(Permission).all()
