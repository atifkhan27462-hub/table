from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db, require_roles
from app.models import User
from app.schemas.common import ApiResponse
from app.schemas.menu import ProductCreate, ProductOut, ProductUpdate
from app.services.menu_service import MenuService
from app.services.restaurant_service import RestaurantService

router = APIRouter(prefix="/products", tags=["Menu Dishes & Products"])


@router.get("", response_model=ApiResponse[List[ProductOut]], summary="List all dishes and drinks")
def list_products(
    category_id: Optional[str] = None,
    restaurant_id: Optional[str] = None,
    is_available: Optional[bool] = None,
    db: Session = Depends(get_db),
):
    products = MenuService.list_products(db, restaurant_id, category_id, is_available)
    return ApiResponse(data=[ProductOut.model_validate(p) for p in products])


@router.get("/{product_id}", response_model=ApiResponse[ProductOut], summary="Get dish details including options")
def get_product(product_id: str, db: Session = Depends(get_db)):
    product = MenuService.get_product_by_id(db, product_id)
    return ApiResponse(data=ProductOut.model_validate(product))


@router.post("", response_model=ApiResponse[ProductOut], summary="Create new dish")
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
):
    restaurant = RestaurantService.get_current_restaurant(db)
    product = MenuService.create_product(db, restaurant.id, payload)
    return ApiResponse(data=ProductOut.model_validate(product), message="Product created successfully.")


@router.patch("/{product_id}", response_model=ApiResponse[ProductOut], summary="Update dish details or pricing")
def update_product(
    product_id: str,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
):
    product = MenuService.update_product(db, product_id, payload)
    return ApiResponse(data=ProductOut.model_validate(product), message="Product updated successfully.")


@router.patch("/{product_id}/stock", response_model=ApiResponse[ProductOut], summary="Fast toggle 86 / out of stock status")
def update_stock(
    product_id: str,
    stock_status: str,
    db: Session = Depends(get_db),
):
    product = MenuService.update_stock_status(db, product_id, stock_status)
    return ApiResponse(data=ProductOut.model_validate(product), message=f"Stock updated to {stock_status}.")


@router.delete("/all/clear", response_model=ApiResponse[dict], summary="Delete all dishes/products")
@router.post("/all/clear", response_model=ApiResponse[dict], summary="Delete all dishes/products")
def clear_all_products(db: Session = Depends(get_db)):
    count = MenuService.clear_all_products(db)
    return ApiResponse(data={"cleared_count": count}, message=f"Successfully cleared {count} products.")


@router.delete("/{product_id}", response_model=ApiResponse[dict], summary="Delete a dish/product")
def delete_product(
    product_id: str,
    db: Session = Depends(get_db),
):
    MenuService.delete_product(db, product_id)
    return ApiResponse(data={"deleted_id": product_id}, message="Product deleted successfully.")


