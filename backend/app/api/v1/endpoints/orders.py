from typing import List, Optional
from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session
from app.api.deps import get_db, require_roles
from app.models import User
from app.schemas.common import ApiResponse
from app.schemas.order import OrderCreate, OrderOut, OrderStatusUpdate, OrderCalculationOut
from app.services.order_service import OrderService

router = APIRouter(prefix="/orders", tags=["Orders & Guest Billing"])


@router.post("/calculate", response_model=ApiResponse[OrderCalculationOut], summary="Calculate order totals, subtotal, tax, and tips on backend")
def calculate_order(payload: OrderCreate, db: Session = Depends(get_db)):
    result = OrderService.calculate_order(db, payload)
    return ApiResponse(data=OrderCalculationOut(**result), message="Backend calculation complete.")


@router.post("", response_model=ApiResponse[OrderOut], summary="Place new dining table order")
def place_order(
    payload: OrderCreate,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    x_idempotency_key: Optional[str] = Header(None, alias="X-Idempotency-Key"),
    db: Session = Depends(get_db),
):
    key = payload.idempotency_key or idempotency_key or x_idempotency_key
    if key:
        payload.idempotency_key = key
    order = OrderService.create_order(db, payload)
    return ApiResponse(data=OrderOut.model_validate(order), message="Order placed and routed to kitchen.")


@router.get("", response_model=ApiResponse[List[OrderOut]], summary="List all orders")
def list_orders(
    restaurant_id: Optional[str] = None,
    table_id: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    orders = OrderService.list_orders(db, restaurant_id, table_id, status)
    return ApiResponse(data=[OrderOut.model_validate(o) for o in orders])


@router.get("/{order_id}", response_model=ApiResponse[OrderOut], summary="Get order details with items and modifiers")
def get_order(order_id: str, db: Session = Depends(get_db)):
    order = OrderService.get_order_by_id(db, order_id)
    return ApiResponse(data=OrderOut.model_validate(order))


@router.patch("/{order_id}/status", response_model=ApiResponse[OrderOut], summary="Transition order status (PENDING, PREPARING, READY, SERVED, COMPLETED)")
def update_order_status(
    order_id: str,
    payload: OrderStatusUpdate,
    db: Session = Depends(get_db),
):
    order = OrderService.update_order_status(db, order_id, payload.status)
    return ApiResponse(data=OrderOut.model_validate(order), message=f"Order status changed to {payload.status}.")


@router.delete("/table/{table_id}/clear", response_model=ApiResponse[dict], summary="Clear all orders for a dining table")
def clear_table_orders(
    table_id: str,
    only_completed: bool = False,
    db: Session = Depends(get_db),
):
    cleared_count = OrderService.clear_table_orders(db, table_id, only_completed=only_completed)
    return ApiResponse(
        data={"table_id": table_id, "cleared_count": cleared_count},
        message=f"{cleared_count} orders successfully cleared from table."
    )


from pydantic import BaseModel


class SystemResetPayload(BaseModel):
    clear_orders: bool = True
    clear_products: bool = False
    clear_categories: bool = False
    reset_tables: bool = True


@router.delete("/all/clear", response_model=ApiResponse[dict], summary="Clear and cancel all orders across all tables and reset table status")
@router.post("/all/clear", response_model=ApiResponse[dict], summary="Clear and cancel all orders across all tables and reset table status")
def clear_all_orders(db: Session = Depends(get_db)):
    cleared_count = OrderService.clear_all_orders(db)
    return ApiResponse(
        data={"cleared_count": cleared_count},
        message=f"{cleared_count} orders successfully cleared and all tables reset to available."
    )


@router.post("/reset-system", response_model=ApiResponse[dict], summary="Comprehensive system-wide data reset")
def reset_system_data(
    payload: Optional[SystemResetPayload] = None,
    db: Session = Depends(get_db),
):
    opts = payload or SystemResetPayload()
    res = OrderService.reset_system_data(
        db,
        clear_orders=opts.clear_orders,
        clear_products=opts.clear_products,
        clear_categories=opts.clear_categories,
        reset_tables=opts.reset_tables,
    )
    return ApiResponse(
        data=res,
        message="System data reset completed successfully."
    )


@router.delete("/{order_id}", response_model=ApiResponse[dict], summary="Delete or cancel an order")
def delete_order(order_id: str, db: Session = Depends(get_db)):
    OrderService.delete_order(db, order_id)
    return ApiResponse(
        data={"order_id": order_id, "deleted": True},
        message="Order successfully deleted and cancelled."
    )
