from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db, require_roles, verify_tenant_access
from app.models import User
from app.schemas.common import ApiResponse
from app.schemas.restaurant import RestaurantOut, RestaurantUpdate
from app.services.restaurant_service import RestaurantService

router = APIRouter(prefix="/restaurants", tags=["Multi-Tenant Restaurants"])


@router.get("/current", response_model=ApiResponse[RestaurantOut], summary="Get active restaurant settings")
def get_current_restaurant(db: Session = Depends(get_db)):
    restaurant = RestaurantService.get_current_restaurant(db)
    return ApiResponse(data=RestaurantOut.model_validate(restaurant))


@router.get("", response_model=ApiResponse[List[RestaurantOut]], summary="List all restaurant tenants")
def list_restaurants(
    db: Session = Depends(get_db),
    _user: User = Depends(require_roles("SUPER_ADMIN")),
):
    restaurants = RestaurantService.list_restaurants(db)
    return ApiResponse(data=[RestaurantOut.model_validate(r) for r in restaurants])


@router.patch("/{restaurant_id}", response_model=ApiResponse[RestaurantOut], summary="Update restaurant tax, fees, or profile")
def update_restaurant(
    restaurant_id: str,
    payload: RestaurantUpdate,
    db: Session = Depends(get_db),
    _user: User = Depends(require_roles("SUPER_ADMIN", "RESTAURANT_ADMIN")),
):
    verify_tenant_access(_user, restaurant_id)
    updated = RestaurantService.update_restaurant(db, restaurant_id, payload)
    return ApiResponse(data=RestaurantOut.model_validate(updated), message="Restaurant updated successfully.")
