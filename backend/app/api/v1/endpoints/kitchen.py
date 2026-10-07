from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db, require_roles
from app.models import User
from app.schemas.common import ApiResponse
from app.schemas.kitchen import KitchenOrderBump, KitchenOrderOut, KitchenStationOut
from app.services.kitchen_service import KitchenService

router = APIRouter(prefix="/kitchen", tags=["Kitchen Display System (KDS)"])


@router.get("/orders", response_model=ApiResponse[List[KitchenOrderOut]], summary="Get active KDS kitchen tickets")
def list_kitchen_orders(
    station: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    tickets = KitchenService.list_kitchen_orders(db, station_code=station, status=status)
    return ApiResponse(data=tickets)


@router.patch("/orders/{kitchen_order_id}/bump", response_model=ApiResponse[dict], summary="Bump or complete kitchen order ticket")
def bump_ticket(
    kitchen_order_id: str,
    payload: Optional[KitchenOrderBump] = None,
    db: Session = Depends(get_db),
):
    bump_status = payload.status if payload else "READY"
    ko = KitchenService.bump_kitchen_order(db, kitchen_order_id, bump_status)
    return ApiResponse(data={"id": ko.id, "status": ko.status}, message=f"Kitchen ticket bumped to {ko.status}.")


@router.get("/stations", response_model=ApiResponse[List[KitchenStationOut]], summary="List all active prep stations")
def list_kitchen_stations(
    restaurant_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    stations = KitchenService.list_stations(db, restaurant_id)
    return ApiResponse(data=[KitchenStationOut.model_validate(s) for s in stations])
