from sqlalchemy import Column, String, Integer, Numeric, Text, ForeignKey, UniqueConstraint, DateTime, JSON, Index
from sqlalchemy.orm import relationship
from app.models.base import Base, generate_uuid, TimestampMixin, SoftDeleteMixin


class Order(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "orders"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    restaurant_id = Column(String(36), ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False, index=True)
    table_id = Column(String(36), ForeignKey("tables.id", ondelete="RESTRICT"), nullable=False, index=True)
    session_id = Column(String(36), ForeignKey("sessions.id", ondelete="SET NULL"), nullable=True, index=True)
    server_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    order_number = Column(String(32), nullable=False, index=True)
    status = Column(String(30), nullable=False, default="PLACED", index=True)
    subtotal = Column(Numeric(10, 2), nullable=False, default=0.00)
    tax_amount = Column(Numeric(10, 2), nullable=False, default=0.00)
    service_fee = Column(Numeric(10, 2), nullable=False, default=0.00)
    tip_amount = Column(Numeric(10, 2), nullable=False, default=0.00)
    total_amount = Column(Numeric(10, 2), nullable=False, default=0.00)
    payment_status = Column(String(30), nullable=False, default="UNPAID", index=True)
    special_instructions = Column(Text, nullable=True)
    idempotency_key = Column(String(64), nullable=True, unique=True, index=True)
    placed_at = Column(DateTime(timezone=True), nullable=False)
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    ready_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("restaurant_id", "order_number", name="uq_order_restaurant_number"),
        Index("ix_order_restaurant_status_created", "restaurant_id", "status", "created_at"),
    )

    restaurant = relationship("Restaurant", back_populates="orders")
    table = relationship("Table", back_populates="orders")
    session = relationship("Session", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="order", cascade="all, delete-orphan")
    kitchen_orders = relationship("KitchenOrder", back_populates="order", cascade="all, delete-orphan")

    @property
    def table_number(self):
        if self.table:
            return self.table.table_number
        return None


class OrderItem(Base, TimestampMixin):
    __tablename__ = "order_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    order_id = Column(String(36), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(String(36), ForeignKey("products.id", ondelete="RESTRICT"), nullable=False, index=True)
    product_name = Column(String(120), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Numeric(10, 2), nullable=False)
    subtotal = Column(Numeric(10, 2), nullable=False)
    status = Column(String(30), nullable=False, default="PENDING", index=True)
    notes = Column(String(255), nullable=True)

    order = relationship("Order", back_populates="items")
    options = relationship("OrderItemOption", back_populates="order_item", cascade="all, delete-orphan")


class OrderItemOption(Base, TimestampMixin):
    __tablename__ = "order_item_options"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    order_item_id = Column(String(36), ForeignKey("order_items.id", ondelete="CASCADE"), nullable=False, index=True)
    option_name = Column(String(80), nullable=False)
    value_name = Column(String(80), nullable=False)
    price_modifier = Column(Numeric(10, 2), nullable=False, default=0.00)

    order_item = relationship("OrderItem", back_populates="options")


class Payment(Base, TimestampMixin):
    __tablename__ = "payments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    order_id = Column(String(36), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(String(36), ForeignKey("sessions.id", ondelete="SET NULL"), nullable=True, index=True)
    payment_method = Column(String(30), nullable=False, default="CREDIT_CARD")
    amount = Column(Numeric(10, 2), nullable=False)
    tip_amount = Column(Numeric(10, 2), nullable=False, default=0.00)
    tax_amount = Column(Numeric(10, 2), nullable=False, default=0.00)
    transaction_reference = Column(String(100), nullable=True, index=True)
    status = Column(String(30), nullable=False, default="COMPLETED", index=True)
    gateway_response = Column(JSON, nullable=True, default=dict)
    processed_at = Column(DateTime(timezone=True), nullable=False)

    order = relationship("Order", back_populates="payments")
