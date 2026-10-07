from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.order import OrderItemOut


class KitchenStationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    code: str
    name: str
    display_order: int
    is_active: bool


class KitchenOrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    order_id: str
    order_number: str
    table_number: str
    station_code: str
    status: str  # QUEUED, IN_PREP, READY, BUMPED
    ticket_priority: int
    estimated_prep_minutes: int
    timer_started_at: Optional[datetime] = None
    bumped_at: Optional[datetime] = None
    items: List[OrderItemOut] = []
    special_instructions: Optional[str] = None
    created_at: Optional[datetime] = None


class KitchenOrderBump(BaseModel):
    status: str = Field(default="READY", json_schema_extra={"example": "READY"})
