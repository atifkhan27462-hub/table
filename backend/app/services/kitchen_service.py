from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from app.core.errors import EntityNotFoundException, ValidationException
from app.models import KitchenOrder, KitchenStation, Order, OrderItem
from app.schemas.kitchen import KitchenOrderOut, KitchenStationOut


class KitchenService:
    @staticmethod
    def list_stations(db: Session, restaurant_id: Optional[str] = None) -> List[KitchenStation]:
        query = db.query(KitchenStation).filter_by(is_active=True)
        if restaurant_id:
            query = query.filter_by(restaurant_id=restaurant_id)
        return query.order_by(KitchenStation.display_order).all()

    @staticmethod
    def list_kitchen_orders(
        db: Session,
        station_code: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[KitchenOrderOut]:
        query = (
            db.query(KitchenOrder)
            .join(KitchenOrder.order)
            .join(KitchenOrder.station)
            .options(
                joinedload(KitchenOrder.order).joinedload(Order.items).joinedload(OrderItem.options),
                joinedload(KitchenOrder.order).joinedload(Order.table),
                joinedload(KitchenOrder.station),
            )
        )
        if station_code:
            query = query.filter(KitchenStation.code == station_code.upper())
        if status:
            query = query.filter(KitchenOrder.status == status.upper())
        else:
            # By default exclude fully bumped tickets
            query = query.filter(KitchenOrder.status.in_(["QUEUED", "IN_PREP", "READY"]))

        kitchen_orders = query.order_by(KitchenOrder.ticket_priority, KitchenOrder.created_at).all()

        results = []
        for ko in kitchen_orders:
            table_num = ko.order.table.table_number if ko.order and ko.order.table else "Table --"
            results.append(
                KitchenOrderOut(
                    id=ko.id,
                    order_id=ko.order_id,
                    order_number=ko.order.order_number if ko.order else "ORD-XXXX",
                    table_number=table_num,
                    station_code=ko.station.code if ko.station else "ALL",
                    status=ko.status,
                    ticket_priority=ko.ticket_priority,
                    estimated_prep_minutes=ko.estimated_prep_minutes,
                    timer_started_at=ko.timer_started_at,
                    bumped_at=ko.bumped_at,
                    items=ko.order.items if ko.order else [],
                    special_instructions=ko.order.special_instructions if ko.order else None,
                    created_at=ko.created_at,
                )
            )
        return results

    @staticmethod
    def bump_kitchen_order(db: Session, kitchen_order_id: str, new_status: str = "READY") -> KitchenOrder:
        from app.core.websocket_manager import ws_manager
        from app.schemas.realtime import RealtimeEvent, RealtimeEventType

        VALID_KITCHEN_STATUSES = {"QUEUED", "IN_PREP", "READY", "BUMPED", "CANCELLED"}
        normalized_status = new_status.upper().strip()
        if normalized_status not in VALID_KITCHEN_STATUSES:
            raise ValidationException(f"Invalid kitchen ticket status '{new_status}'. Allowed values: {sorted(list(VALID_KITCHEN_STATUSES))}")

        ko = db.query(KitchenOrder).filter_by(id=kitchen_order_id).first()
        if not ko:
            raise EntityNotFoundException("KitchenOrder", kitchen_order_id)

        now = datetime.now(timezone.utc)
        ko.status = normalized_status
        if normalized_status in ["READY", "BUMPED"]:
            ko.bumped_at = now

        # If parent order exists, update order status to match
        order = ko.order
        if order:
            if normalized_status == "READY":
                order.status = "READY"
                if not order.ready_at:
                    order.ready_at = now
            elif normalized_status == "BUMPED":
                # Check if all other tickets are bumped
                other_active = (
                    db.query(KitchenOrder)
                    .filter(KitchenOrder.order_id == order.id, KitchenOrder.id != ko.id)
                    .filter(KitchenOrder.status.in_(["QUEUED", "IN_PREP"]))
                    .count()
                )
                if other_active == 0:
                    order.status = "READY"
                    if not order.ready_at:
                        order.ready_at = now

        db.commit()
        db.refresh(ko)

        # Broadcast realtime event to Table, KDS, and Admin
        if order:
            event_type = (
                RealtimeEventType.ORDER_READY
                if order.status == "READY"
                else RealtimeEventType.ORDER_PREPARING
            )
            try:
                ws_manager.dispatch_sync(
                    RealtimeEvent(
                        type=event_type,
                        restaurant_id=order.restaurant_id,
                        table_id=order.table_id,
                        data={
                            "order_id": order.id,
                            "order_number": order.order_number,
                            "table_id": order.table_id,
                            "kitchen_order_id": ko.id,
                            "status": order.status,
                            "ticket_status": ko.status,
                            "bumped_at": ko.bumped_at.isoformat() if ko.bumped_at else now.isoformat(),
                        },
                    )
                )
            except Exception as ws_err:
                pass

        return ko
