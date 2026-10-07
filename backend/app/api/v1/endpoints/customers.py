from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.api.deps import get_db
from app.models.customer import Customer
from app.models.restaurant import Restaurant
from app.schemas.common import ApiResponse
from app.schemas.customer import CustomerCreate, CustomerOut, CustomerUpdate, RecordVisitRequest

router = APIRouter(prefix="/customers", tags=["Customer CRM & Loyalty"])


@router.get("", response_model=ApiResponse[List[CustomerOut]], summary="List all CRM customers")
def list_customers(
    search: Optional[str] = Query(None, description="Search by name, phone or email"),
    vip_tier: Optional[str] = Query(None, description="Filter by VIP tier"),
    db: Session = Depends(get_db),
):
    query = db.query(Customer).filter(Customer.is_deleted == False)

    if search:
        search_filter = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Customer.name.ilike(search_filter),
                Customer.phone.ilike(search_filter),
                Customer.email.ilike(search_filter),
            )
        )

    if vip_tier and vip_tier != "All":
        query = query.filter(Customer.vip_tier == vip_tier)

    customers = query.order_by(Customer.lifetime_spent.desc(), Customer.total_visits.desc()).all()
    return ApiResponse(
        data=[CustomerOut.model_validate(c) for c in customers],
        message="Customers fetched successfully"
    )


@router.post("", response_model=ApiResponse[CustomerOut], status_code=status.HTTP_201_CREATED, summary="Register new customer")
def create_customer(
    payload: CustomerCreate,
    db: Session = Depends(get_db),
):
    restaurant = db.query(Restaurant).first()
    restaurant_id = restaurant.id if restaurant else None

    # Calculate initial points if lifetime spent provided
    points = payload.loyalty_points or int((payload.lifetime_spent or 0) * 0.1)

    customer = Customer(
        restaurant_id=restaurant_id,
        name=payload.name.strip(),
        phone=payload.phone.strip() if payload.phone else None,
        email=payload.email.strip().lower() if payload.email else None,
        vip_tier=payload.vip_tier or "Regular",
        favorite_dish=payload.favorite_dish,
        dietary_notes=payload.dietary_notes,
        table_preferences=payload.table_preferences,
        total_visits=payload.total_visits if payload.total_visits is not None else 1,
        lifetime_spent=payload.lifetime_spent or 0.00,
        loyalty_points=points,
        last_visit_at=datetime.utcnow().strftime("%Y-%m-%d %H:%M"),
        is_active=True,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return ApiResponse(data=CustomerOut.model_validate(customer), message="Customer registered successfully.")


@router.get("/{customer_id}", response_model=ApiResponse[CustomerOut], summary="Get customer profile")
def get_customer(customer_id: str, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id, Customer.is_deleted == False).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return ApiResponse(data=CustomerOut.model_validate(customer))


@router.patch("/{customer_id}", response_model=ApiResponse[CustomerOut], summary="Update customer profile")
def update_customer(
    customer_id: str,
    payload: CustomerUpdate,
    db: Session = Depends(get_db),
):
    customer = db.query(Customer).filter(Customer.id == customer_id, Customer.is_deleted == False).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(customer, field, val)

    db.commit()
    db.refresh(customer)
    return ApiResponse(data=CustomerOut.model_validate(customer), message="Customer updated successfully.")


@router.delete("/{customer_id}", response_model=ApiResponse[dict], summary="Delete customer")
def delete_customer(customer_id: str, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id, Customer.is_deleted == False).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    customer.is_deleted = True
    customer.deleted_at = datetime.utcnow()
    db.commit()
    return ApiResponse(data={"deleted_id": customer_id}, message="Customer removed from CRM.")


@router.post("/{customer_id}/visits", response_model=ApiResponse[CustomerOut], summary="Record dining visit and update VIP tier")
def record_visit(
    customer_id: str,
    payload: RecordVisitRequest,
    db: Session = Depends(get_db),
):
    customer = db.query(Customer).filter(Customer.id == customer_id, Customer.is_deleted == False).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    customer.total_visits = (customer.total_visits or 0) + 1
    new_spent = float(customer.lifetime_spent or 0) + float(payload.spend_amount)
    customer.lifetime_spent = new_spent
    customer.loyalty_points = (customer.loyalty_points or 0) + int(payload.spend_amount * 0.1)
    customer.last_visit_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M")

    if payload.favorite_dish:
        customer.favorite_dish = payload.favorite_dish

    # Auto-adjust VIP tier based on loyalty & spend
    if new_spent >= 50000 or customer.total_visits >= 20:
        customer.vip_tier = "Platinum VIP"
    elif new_spent >= 25000 or customer.total_visits >= 10:
        customer.vip_tier = "Gold VIP"
    elif new_spent >= 10000 or customer.total_visits >= 5:
        customer.vip_tier = "Silver VIP"

    db.commit()
    db.refresh(customer)
    return ApiResponse(data=CustomerOut.model_validate(customer), message="Dining visit and points recorded.")
