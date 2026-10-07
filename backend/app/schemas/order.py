from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_serializer


class OrderItemOptionCreate(BaseModel):
    option_name: str
    value_name: str
    price_modifier: Decimal = Decimal("0.00")


class OrderItemOptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    option_name: str
    value_name: str
    price_modifier: Decimal


class OrderItemCreate(BaseModel):
    product_id: str
    quantity: int = Field(default=1, ge=1, le=100)
    notes: Optional[str] = Field(None, max_length=500)
    options: List[OrderItemOptionCreate] = []


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    order_id: str
    product_id: str
    product_name: str
    quantity: int
    unit_price: Decimal
    subtotal: Decimal
    status: str
    notes: Optional[str] = None
    options: List[OrderItemOptionOut] = []


class PaymentCreate(BaseModel):
    order_id: str
    payment_method: str = Field(..., json_schema_extra={"example": "CREDIT_CARD"})  # CREDIT_CARD, CASH, APPLE_PAY
    amount: Decimal = Field(..., gt=0, description="Payment principal must be greater than zero")
    tip_amount: Decimal = Field(default=Decimal("0.00"), ge=0, description="Tip amount cannot be negative")
    transaction_reference: Optional[str] = Field(None, max_length=120)


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    order_id: str
    payment_method: str
    amount: Decimal
    tip_amount: Decimal
    tax_amount: Decimal
    transaction_reference: Optional[str] = None
    status: str
    processed_at: Optional[datetime] = None


class OrderCreate(BaseModel):
    table_id: str
    items: List[OrderItemCreate] = Field(..., min_length=1, max_length=100)
    special_instructions: Optional[str] = Field(None, max_length=1000)
    tip_amount: Optional[Decimal] = Field(default=Decimal("0.00"), ge=0)
    idempotency_key: Optional[str] = Field(None, max_length=64, description="Client-supplied idempotency key to prevent duplicate orders")


class OrderCalculationOut(BaseModel):
    subtotal: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    service_fee: Decimal
    tip_amount: Decimal
    total_amount: Decimal
    item_count: int


class OrderStatusUpdate(BaseModel):
    status: str = Field(..., json_schema_extra={"example": "CONFIRMED"})


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    restaurant_id: str
    table_id: str
    table_number: Optional[str] = None
    order_number: str
    status: str
    subtotal: Decimal
    tax_amount: Decimal
    service_fee: Decimal
    tip_amount: Decimal
    total_amount: Decimal
    payment_status: str
    special_instructions: Optional[str] = None
    idempotency_key: Optional[str] = None
    placed_at: datetime
    accepted_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    items: List[OrderItemOut] = []
    payments: List[PaymentOut] = []

    @field_serializer("placed_at", "accepted_at", "completed_at", when_used="json")
    def serialize_datetime(self, dt: Optional[datetime]) -> Optional[str]:
        if dt is None:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()
