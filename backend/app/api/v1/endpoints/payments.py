from typing import List, Optional
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.api.deps import get_db, require_roles
from app.core.security import rate_limiter
from app.models import User
from app.schemas.common import ApiResponse
from app.schemas.order import PaymentCreate, PaymentOut
from app.services.payment_service import PaymentService

router = APIRouter(prefix="/payments", tags=["Payments & Transactions"])


@router.post("", response_model=ApiResponse[PaymentOut], summary="Process dining payment transaction")
def process_payment(request: Request, payload: PaymentCreate, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    rate_limiter.check_rate_limit(f"pay_{client_ip}", max_requests=20, window_seconds=60)
    payment = PaymentService.process_payment(db, payload)
    return ApiResponse(data=PaymentOut.model_validate(payment), message="Payment processed successfully.")


@router.get("", response_model=ApiResponse[List[PaymentOut]], summary="List payments history (Manager only)")
def list_payments(
    order_id: Optional[str] = None,
    db: Session = Depends(get_db),
    _user: User = Depends(require_roles("SUPER_ADMIN", "RESTAURANT_ADMIN", "MANAGER")),
):
    payments = PaymentService.list_payments(db, order_id)
    return ApiResponse(data=[PaymentOut.model_validate(p) for p in payments])


@router.get("/{payment_id}", response_model=ApiResponse[PaymentOut], summary="Get payment transaction record (Manager only)")
def get_payment(
    payment_id: str,
    db: Session = Depends(get_db),
    _user: User = Depends(require_roles("SUPER_ADMIN", "RESTAURANT_ADMIN", "MANAGER")),
):
    payment = PaymentService.get_payment_by_id(db, payment_id)
    return ApiResponse(data=PaymentOut.model_validate(payment))
