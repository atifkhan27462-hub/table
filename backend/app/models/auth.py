from sqlalchemy import Column, String, Boolean, ForeignKey, Table, UniqueConstraint, DateTime, Index
from sqlalchemy.orm import relationship
from app.models.base import Base, generate_uuid, TimestampMixin, SoftDeleteMixin

# Many-to-Many Association: Roles <-> Permissions
role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", String(36), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", String(36), ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
)


class Permission(Base, TimestampMixin):
    __tablename__ = "permissions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    code = Column(String(100), nullable=False, unique=True, index=True)
    category = Column(String(50), nullable=False)
    description = Column(String(255), nullable=True)

    roles = relationship("Role", secondary=role_permissions, back_populates="permissions")


class Role(Base, TimestampMixin):
    __tablename__ = "roles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    restaurant_id = Column(String(36), ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String(60), nullable=False)
    code = Column(String(60), nullable=False, index=True)
    description = Column(String(255), nullable=True)
    is_system = Column(Boolean, nullable=False, default=False)

    __table_args__ = (
        UniqueConstraint("restaurant_id", "code", name="uq_role_restaurant_code"),
    )

    permissions = relationship("Permission", secondary=role_permissions, back_populates="roles")
    users = relationship("User", back_populates="role")


class User(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    restaurant_id = Column(String(36), ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=True, index=True)
    role_id = Column(String(36), ForeignKey("roles.id", ondelete="RESTRICT"), nullable=False, index=True)
    email = Column(String(255), nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(120), nullable=False)
    phone = Column(String(50), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("restaurant_id", "email", name="uq_user_restaurant_email"),
        Index("ix_user_active_email", "email", "is_active"),
    )

    restaurant = relationship("Restaurant", back_populates="users")
    role = relationship("Role", back_populates="users")
