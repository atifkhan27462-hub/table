from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db, require_roles
from app.models import User
from app.schemas.common import ApiResponse
from app.schemas.menu import CategoryCreate, CategoryOut, CategoryUpdate
from app.services.menu_service import MenuService
from app.services.restaurant_service import RestaurantService

router = APIRouter(prefix="/categories", tags=["Menu Categories"])


@router.get("", response_model=ApiResponse[List[CategoryOut]], summary="List all menu categories")
def list_categories(
    restaurant_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    categories = MenuService.list_categories(db, restaurant_id)
    return ApiResponse(data=[CategoryOut.model_validate(c) for c in categories])


@router.get("/{category_id}", response_model=ApiResponse[CategoryOut], summary="Get category details")
def get_category(category_id: str, db: Session = Depends(get_db)):
    category = MenuService.get_category_by_id(db, category_id)
    return ApiResponse(data=CategoryOut.model_validate(category))


@router.post("", response_model=ApiResponse[CategoryOut], summary="Create new menu category")
def create_category(
    payload: CategoryCreate,
    db: Session = Depends(get_db),
):
    restaurant = RestaurantService.get_current_restaurant(db)
    category = MenuService.create_category(db, restaurant.id, payload)
    return ApiResponse(data=CategoryOut.model_validate(category), message="Category created successfully.")


@router.patch("/{category_id}", response_model=ApiResponse[CategoryOut], summary="Update menu category")
def update_category(
    category_id: str,
    payload: CategoryUpdate,
    db: Session = Depends(get_db),
):
    category = MenuService.update_category(db, category_id, payload)
    return ApiResponse(data=CategoryOut.model_validate(category), message="Category updated successfully.")


@router.delete("/all/clear", response_model=ApiResponse[dict], summary="Delete all menu categories")
@router.post("/all/clear", response_model=ApiResponse[dict], summary="Delete all menu categories")
def clear_all_categories(db: Session = Depends(get_db)):
    count = MenuService.clear_all_categories(db)
    return ApiResponse(data={"cleared_count": count}, message=f"Successfully cleared {count} categories.")


@router.delete("/{category_id}", response_model=ApiResponse[dict], summary="Delete a menu category")
def delete_category(
    category_id: str,
    db: Session = Depends(get_db),
):
    MenuService.delete_category(db, category_id)
    return ApiResponse(data={"deleted_id": category_id}, message="Category deleted successfully.")


