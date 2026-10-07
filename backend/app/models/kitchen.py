from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, UniqueConstraint, DateTime, Index
from sqlalchemy.orm import relationship
from app.models.base import Base, generate_uuid, TimestampMixin


class KitchenStation(Base, TimestampMixin):
    __tablename__ = "kitchen_stations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    restaurant_id = Column(String(36), ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(60), nullable=False)
    code = Column(String(30), nullable=False, index=True)
    display_order = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)

    __table_args__ = (
        UniqueConstraint("restaurant_id", "code", name="uq_station_restaurant_code"),
    )

    restaurant = relationship("Restaurant", back_populates="kitchen_stations")
    kitchen_orders = relationship("KitchenOrder", back_populates="station", cascade="all, delete-orphan")


class KitchenOrder(Base, TimestampMixin):
    """
    Station-level routing ticket displayed on line cook KDS screens.
    """
    __tablename__ = "kitchen_orders"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    order_id = Column(String(36), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    station_id = Column(String(36), ForeignKey("kitchen_stations.id", ondelete="RESTRICT"), nullable=False, index=True)
    status = Column(String(30), nullable=False, default="QUEUED", index=True)
    ticket_priority = Column(Integer, nullable=False, default=1)
    estimated_prep_minutes = Column(Integer, nullable=False, default=15)
    timer_started_at = Column(DateTime(timezone=True), nullable=True)
    bumped_at = Column(DateTime(timezone=True), nullable=True)
    bumped_by_user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    __table_args__ = (
        Index("ix_kitchen_order_station_status", "station_id", "status"),
    )

    order = relationship("Order", back_populates="kitchen_orders")
    station = relationship("KitchenStation", back_populates="kitchen_orders")
