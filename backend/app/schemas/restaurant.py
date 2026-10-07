from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class RestaurantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    slug: str
    currency: str
    tax_rate: Decimal
    service_fee_rate: Decimal
    address: Optional[str] = None
    phone: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None


class RestaurantUpdate(BaseModel):
    name: Optional[str] = None
    currency: Optional[str] = None
    tax_rate: Optional[Decimal] = None
    service_fee_rate: Optional[Decimal] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    is_active: Optional[bool] = None
