import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional
from sqlalchemy.orm import Session
from app.core.errors import EntityNotFoundException, ValidationException
from app.models import Order, Payment
from app.schemas.order import PaymentCreate


class PaymentService:
    @staticmethod
    def process_payment(db: Session, data: PaymentCreate) -> Payment:
        order = db.query(Order).filter_by(id=data.order_id, is_deleted=False).first()
        if not order:
            raise EntityNotFoundException("Order", data.order_id)

        if order.payment_status == "PAID":
            raise ValidationException("This order has already been fully settled.")

        if data.amount <= Decimal("0.00"):
            raise ValidationException("Payment amount must be greater than zero.")

        # Financial integrity check: prevent underpayment tampering
        expected_total = order.total_amount
        if data.amount < expected_total:
            raise ValidationException(
                f"Insufficient payment: submitted amount (${data.amount}) does not cover order total (${expected_total})."
            )

        now = datetime.now(timezone.utc)
        ref = data.transaction_reference or f"TXN_{uuid.uuid4().hex[:12].upper()}"

        payment = Payment(
            order_id=order.id,
            payment_method=data.payment_method.upper(),
            amount=data.amount,
            tip_amount=data.tip_amount,
            tax_amount=order.tax_amount,
            transaction_reference=ref,
            status="COMPLETED",
            processed_at=now,
        )
        db.add(payment)

        # Update order status
        order.payment_status = "PAID"
        if data.tip_amount > Decimal("0.00"):
            order.tip_amount = data.tip_amount
            order.total_amount = order.subtotal + order.tax_amount + order.service_fee + data.tip_amount

        db.commit()
        db.refresh(payment)
        return payment

    @staticmethod
    def get_payment_by_id(db: Session, payment_id: str) -> Payment:
        payment = db.query(Payment).filter_by(id=payment_id).first()
        if not payment:
            raise EntityNotFoundException("Payment", payment_id)
        return payment

    @staticmethod
    def list_payments(db: Session, order_id: Optional[str] = None) -> List[Payment]:
        query = db.query(Payment)
        if order_id:
            query = query.filter_by(order_id=order_id)
        return query.order_by(Payment.processed_at.desc()).all()
