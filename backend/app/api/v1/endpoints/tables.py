from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db, require_roles
from app.models import User
from app.schemas.common import ApiResponse
from app.schemas.table import TableCreate, TableOut, TableUpdate
from app.services.restaurant_service import RestaurantService
from app.services.table_service import TableService

router = APIRouter(prefix="/tables", tags=["Dining Tables"])


@router.get("", response_model=ApiResponse[List[TableOut]], summary="List all dining tables")
def list_tables(
    restaurant_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    tables = TableService.list_tables(db, restaurant_id)
    return ApiResponse(data=[TableOut.model_validate(t) for t in tables])


@router.get("/{table_id}", response_model=ApiResponse[TableOut], summary="Get dining table details")
def get_table(table_id: str, db: Session = Depends(get_db)):
    table = TableService.get_table_by_id(db, table_id)
    return ApiResponse(data=TableOut.model_validate(table))


@router.post("", response_model=ApiResponse[TableOut], summary="Create new dining table")
def create_table(
    payload: TableCreate,
    db: Session = Depends(get_db),
):
    restaurant = RestaurantService.get_current_restaurant(db)
    table = TableService.create_table(db, restaurant.id, payload)
    return ApiResponse(data=TableOut.model_validate(table), message="Table created successfully.")


@router.post("/reset-all-status", response_model=ApiResponse[dict], summary="Reset all tables to AVAILABLE status")
def reset_all_tables_status(db: Session = Depends(get_db)):
    count = TableService.reset_all_status(db)
    return ApiResponse(data={"reset_count": count}, message=f"{count} tables reset to AVAILABLE.")


@router.patch("/{table_id}", response_model=ApiResponse[TableOut], summary="Update table details")
def update_table(
    table_id: str,
    payload: TableUpdate,
    db: Session = Depends(get_db),
):
    table = TableService.update_table(db, table_id, payload)
    return ApiResponse(data=TableOut.model_validate(table), message="Table updated successfully.")


@router.delete("/{table_id}", response_model=ApiResponse[dict], summary="Delete dining table")
def delete_table(
    table_id: str,
    db: Session = Depends(get_db),
):
    TableService.delete_table(db, table_id)
    return ApiResponse(data={"deleted_id": table_id}, message="Table removed successfully.")


@router.patch("/{table_id}/status", response_model=ApiResponse[TableOut], summary="Update table status (AVAILABLE, OCCUPIED, CLEANING)")
def update_table_status(
    table_id: str,
    status: str,
    db: Session = Depends(get_db),
):
    table = TableService.update_table_status(db, table_id, status)
    return ApiResponse(data=TableOut.model_validate(table), message=f"Table status updated to {status}.")


from pydantic import BaseModel
from datetime import datetime, timezone
from app.models import Notification, Table
from app.core.websocket_manager import ws_manager
from app.schemas.realtime import RealtimeEvent, RealtimeEventType


class ServiceCallPayload(BaseModel):
    call_type: str = "Server Call"


@router.post("/{table_id}/service-call", summary="Trigger real-time table waiter assistance call")
async def trigger_table_service_call(
    table_id: str,
    payload: Optional[ServiceCallPayload] = None,
    db: Session = Depends(get_db),
):
    tbl = (
        db.query(Table).filter_by(id=table_id).first()
        or db.query(Table).filter(Table.table_number.ilike(table_id)).first()
        or db.query(Table).filter(Table.table_number.ilike(f"Table {table_id}")).first()
        or db.query(Table).first()
    )
    if not tbl:
        return ApiResponse(data={"success": False}, message="Table not found.")

    call_type = payload.call_type if payload and payload.call_type else "Server Call"

    # Persist notification in database
    notif = Notification(
        restaurant_id=tbl.restaurant_id,
        recipient_type="STAFF",
        title=f"Service Call: {tbl.table_number}",
        message=f"{tbl.table_number} requested assistance: {call_type}",
        notification_type=call_type,
        is_read=False,
    )
    db.add(notif)
    db.commit()

    # Broadcast real-time WebSocket event to all connected Kitchen KDS and Admin consoles
    alert_event = RealtimeEvent(
        type=RealtimeEventType.STAFF_ASSISTANCE_REQUESTED,
        restaurant_id=tbl.restaurant_id,
        table_id=tbl.id,
        data={
            "table_id": tbl.id,
            "table_number": tbl.table_number,
            "call_type": call_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )
    await ws_manager.broadcast(alert_event)

    return ApiResponse(
        data={
            "success": True,
            "table_id": tbl.id,
            "table_number": tbl.table_number,
            "call_type": call_type,
        },
        message=f"Service call for {tbl.table_number} broadcasted to staff and kitchen.",
    )


@router.post("/{table_id}/service-call/resolve", summary="Resolve active service call for table")
async def resolve_table_service_call(
    table_id: str,
    db: Session = Depends(get_db),
):
    notif = db.query(Notification).filter_by(id=table_id).first()
    if notif:
        notif.is_read = True
        notif.read_at = datetime.now(timezone.utc)
        db.commit()

        # Extract table number from notification
        tbl_num = "Table 01"
        tbl = None
        for t in db.query(Table).filter_by(restaurant_id=notif.restaurant_id).all():
            if t.table_number.lower() in (notif.title or "").lower() or t.table_number.lower() in (notif.message or "").lower():
                tbl = t
                tbl_num = t.table_number
                break

        resolved_event = RealtimeEvent(
            type=RealtimeEventType.STAFF_ASSISTANCE_RESOLVED,
            restaurant_id=notif.restaurant_id,
            table_id=tbl.id if tbl else table_id,
            data={
                "id": notif.id,
                "table_id": tbl.id if tbl else table_id,
                "table_number": tbl_num,
                "resolved_at": datetime.now(timezone.utc).isoformat(),
            },
        )
        await ws_manager.broadcast(resolved_event)
        return ApiResponse(data={"success": True}, message="Service call resolved.")

    tbl = (
        db.query(Table).filter_by(id=table_id).first()
        or db.query(Table).filter(Table.table_number.ilike(table_id)).first()
        or db.query(Table).filter(Table.table_number.ilike(f"Table {table_id}")).first()
        or db.query(Table).first()
    )
    if tbl:
        unread_notifs = (
            db.query(Notification)
            .filter_by(restaurant_id=tbl.restaurant_id, is_read=False)
            .filter(Notification.message.ilike(f"%{tbl.table_number}%"))
            .all()
        )
        for n in unread_notifs:
            n.is_read = True
            n.read_at = datetime.now(timezone.utc)
        db.commit()

        resolved_event = RealtimeEvent(
            type=RealtimeEventType.STAFF_ASSISTANCE_RESOLVED,
            restaurant_id=tbl.restaurant_id,
            table_id=tbl.id,
            data={
                "table_id": tbl.id,
                "table_number": tbl.table_number,
                "resolved_at": datetime.now(timezone.utc).isoformat(),
            },
        )
        await ws_manager.broadcast(resolved_event)

    return ApiResponse(data={"success": True}, message="Service call resolved.")


@router.get("/service-calls/active", summary="List active unread table service calls")
def get_active_service_calls(db: Session = Depends(get_db)):
    notifs = (
        db.query(Notification)
        .filter_by(is_read=False)
        .order_by(Notification.created_at.desc())
        .limit(20)
        .all()
    )
    tables = db.query(Table).all()

    res = []
    for n in notifs:
        matched_tbl = None
        tbl_num = "Table 01"
        for t in tables:
            if t.table_number.lower() in (n.title or "").lower() or t.table_number.lower() in (n.message or "").lower():
                matched_tbl = t
                tbl_num = t.table_number
                break

        res.append({
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "table_id": matched_tbl.id if matched_tbl else n.id,
            "table_number": tbl_num,
            "call_type": n.notification_type or "Server Call",
            "created_at": n.created_at.isoformat() if n.created_at else None,
        })
    return ApiResponse(data=res)
