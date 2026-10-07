from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, Text, ForeignKey, DateTime, JSON, Index
from sqlalchemy.orm import relationship
from app.models.base import Base, generate_uuid, TimestampMixin


class AuditLog(Base):
    """
    Immutable ledger of operational and security changes (price modifications, order cancellations, table clears).
    """
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    restaurant_id = Column(String(36), ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False, index=True)
    actor_id = Column(String(36), nullable=True, index=True)
    actor_type = Column(String(30), nullable=False, default="USER")
    action = Column(String(60), nullable=False, index=True)
    entity_name = Column(String(60), nullable=False)
    entity_id = Column(String(64), nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)
    diff_before = Column(JSON, nullable=True)
    diff_after = Column(JSON, nullable=True)
    status = Column(String(30), nullable=False, default="SUCCESS")
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    __table_args__ = (
        Index("ix_audit_restaurant_created", "restaurant_id", "created_at"),
    )

    restaurant = relationship("Restaurant", back_populates="audit_logs")


class Notification(Base, TimestampMixin):
    """
    Real-time staff alerts (Call Waiter, Water Refill, Bill Request, Delayed Ticket Warning).
    """
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    restaurant_id = Column(String(36), ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False, index=True)
    recipient_id = Column(String(36), nullable=True, index=True)
    recipient_type = Column(String(30), nullable=False, default="STAFF")
    title = Column(String(120), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), nullable=False, index=True)
    is_read = Column(Boolean, nullable=False, default=False, index=True)
    read_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_notification_restaurant_read", "restaurant_id", "is_read", "created_at"),
    )
