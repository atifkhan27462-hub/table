from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ProductOptionValueOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    price_modifier: Decimal
    is_default: bool


class ProductOptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    option_type: str
    is_required: bool
    max_selections: int
    values: List[ProductOptionValueOut] = []


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    restaurant_id: str
    category_id: str
    name: str
    slug: str
    description: Optional[str] = None
    base_price: Decimal
    image_url: Optional[str] = None
    prep_station_code: str
    calories: Optional[int] = None
    prep_time_minutes: int
    allergens: List[str] = []
    tags: List[str] = []
    stock_status: str
    is_available: bool
    options: List[ProductOptionOut] = []


class ProductCreate(BaseModel):
    category_id: str
    name: str
    slug: Optional[str] = None
    description: Optional[str] = None
    base_price: Decimal
    image_url: Optional[str] = None
    prep_station_code: Optional[str] = "GRILL"
    calories: Optional[int] = None
    prep_time_minutes: Optional[int] = 15
    allergens: List[str] = []
    tags: List[str] = []
    stock_status: Optional[str] = "IN_STOCK"
    is_available: Optional[bool] = True


class ProductUpdate(BaseModel):
    category_id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    base_price: Optional[Decimal] = None
    image_url: Optional[str] = None
    prep_station_code: Optional[str] = None
    calories: Optional[int] = None
    prep_time_minutes: Optional[int] = None
    allergens: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    stock_status: Optional[str] = None
    is_available: Optional[bool] = None


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    restaurant_id: str
    name: str
    slug: str
    description: Optional[str] = None
    sort_order: int
    icon: Optional[str] = None
    is_active: bool
    products: List[ProductOut] = []


class CategoryCreate(BaseModel):
    name: str
    slug: Optional[str] = None
    description: Optional[str] = None
    sort_order: Optional[int] = 0
    icon: Optional[str] = "🍽️"


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    sort_order: Optional[int] = None
    icon: Optional[str] = None
    is_active: Optional[bool] = None


class MenuCatalogResponse(BaseModel):
    restaurant_id: str
    restaurant_name: str
    currency: str
    categories: List[CategoryOut]
