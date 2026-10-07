from sqlalchemy import Column, String, Numeric, Boolean, JSON
from sqlalchemy.orm import relationship
from app.models.base import Base, generate_uuid, TimestampMixin, SoftDeleteMixin


class Restaurant(Base, TimestampMixin, SoftDeleteMixin):
    """
    Multi-tenant root entity for the Smart Interactive Dining Table platform.
    Enforces strict tenant isolation across all operational records.
    """
    __tablename__ = "restaurants"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(120), nullable=False)
    slug = Column(String(120), nullable=False, unique=True, index=True)
    currency = Column(String(3), nullable=False, default="USD")
    tax_rate = Column(Numeric(5, 2), nullable=False, default=8.50)
    service_fee_rate = Column(Numeric(5, 2), nullable=False, default=0.00)
    address = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    settings = Column(JSON, nullable=True, default=dict)
    is_active = Column(Boolean, nullable=False, default=True)

    # Tenant Relationships
    users = relationship("User", back_populates="restaurant", cascade="all, delete-orphan")
    tables = relationship("Table", back_populates="restaurant", cascade="all, delete-orphan")
    categories = relationship("Category", back_populates="restaurant", cascade="all, delete-orphan")
    products = relationship("Product", back_populates="restaurant", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="restaurant", cascade="all, delete-orphan")
    kitchen_stations = relationship("KitchenStation", back_populates="restaurant", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="restaurant", cascade="all, delete-orphan")
