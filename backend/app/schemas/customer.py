from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict
from datetime import datetime


class CustomerBase(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    vip_tier: Optional[str] = "Regular"
    favorite_dish: Optional[str] = None
    dietary_notes: Optional[str] = None
    table_preferences: Optional[str] = None
    total_visits: Optional[int] = 1
    lifetime_spent: Optional[float] = 0.00
    loyalty_points: Optional[int] = 0


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    vip_tier: Optional[str] = None
    favorite_dish: Optional[str] = None
    dietary_notes: Optional[str] = None
    table_preferences: Optional[str] = None
    total_visits: Optional[int] = None
    lifetime_spent: Optional[float] = None
    loyalty_points: Optional[int] = None
    is_active: Optional[bool] = None


class RecordVisitRequest(BaseModel):
    spend_amount: float
    notes: Optional[str] = None
    favorite_dish: Optional[str] = None


class CustomerOut(CustomerBase):
    id: str
    restaurant_id: Optional[str] = None
    last_visit_at: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    extra_data: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)
