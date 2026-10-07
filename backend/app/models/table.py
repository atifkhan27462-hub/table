from sqlalchemy import Column, String, Integer, Numeric, Boolean, ForeignKey, UniqueConstraint, DateTime, JSON, Index
from sqlalchemy.orm import relationship
from app.models.base import Base, generate_uuid, TimestampMixin, SoftDeleteMixin


class Table(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "tables"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    restaurant_id = Column(String(36), ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False, index=True)
    table_number = Column(String(30), nullable=False)
    name = Column(String(100), nullable=False)
    capacity = Column(Integer, nullable=False, default=4)
    section = Column(String(60), nullable=False, default="Main Dining Room")
    qr_code_token = Column(String(64), nullable=False, unique=True, default=generate_uuid)
    status = Column(String(30), nullable=False, default="AVAILABLE", index=True)
    is_active = Column(Boolean, nullable=False, default=True)

    __table_args__ = (
        UniqueConstraint("restaurant_id", "table_number", name="uq_table_restaurant_number"),
        Index("ix_table_restaurant_status", "restaurant_id", "status"),
    )

    restaurant = relationship("Restaurant", back_populates="tables")
    devices = relationship("TableDevice", back_populates="table", cascade="all, delete-orphan")
    sessions = relationship("Session", back_populates="table", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="table")


class TableDevice(Base, TimestampMixin):
    """
    Physical 32-inch dining table hardware mapping (Mini PC, USB touch interface, fans).
    """
    __tablename__ = "table_devices"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    table_id = Column(String(36), ForeignKey("tables.id", ondelete="CASCADE"), nullable=False, index=True)
    restaurant_id = Column(String(36), ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=True, index=True)
    device_token = Column(String(128), nullable=False, unique=True, index=True)
    hardware_id = Column(String(100), nullable=True)
    mac_address = Column(String(50), nullable=True)
    ip_address = Column(String(45), nullable=True)
    network_status = Column(String(30), nullable=False, default="CONNECTED")
    app_version = Column(String(30), nullable=False, default="1.0.0")
    screen_resolution = Column(String(30), nullable=False, default="1920x1080")
    status = Column(String(30), nullable=False, default="ONLINE")
    last_heartbeat = Column(DateTime(timezone=True), nullable=True)
    telemetry = Column(JSON, nullable=True, default=dict)
    kiosk_mode_enabled = Column(Boolean, nullable=False, default=True)
    kiosk_pin = Column(String(10), nullable=True, default="7788")
    is_active = Column(Boolean, nullable=False, default=True)

    __table_args__ = (
        Index("ix_table_device_health", "restaurant_id", "status", "last_heartbeat"),
    )

    table = relationship("Table", back_populates="devices")
    restaurant = relationship("Restaurant")


class Session(Base, TimestampMixin):
    """
    Represents an active or historic dining session at a table.
    """
    __tablename__ = "sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    table_id = Column(String(36), ForeignKey("tables.id", ondelete="CASCADE"), nullable=False, index=True)
    guest_count = Column(Integer, nullable=False, default=2)
    status = Column(String(30), nullable=False, default="ACTIVE", index=True)
    opened_at = Column(DateTime(timezone=True), nullable=False)
    closed_at = Column(DateTime(timezone=True), nullable=True)
    total_spent = Column(Numeric(10, 2), nullable=False, default=0.00)
    notes = Column(String(255), nullable=True)

    __table_args__ = (
        Index("ix_session_table_status", "table_id", "status"),
    )

    table = relationship("Table", back_populates="sessions")
    orders = relationship("Order", back_populates="session")
