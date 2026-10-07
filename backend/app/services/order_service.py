import random
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from app.core.errors import EntityNotFoundException, ValidationException
from app.core.logging import logger
from app.core.websocket_manager import ws_manager
from app.models import Category, KitchenOrder, KitchenStation, Notification, Order, OrderItem, OrderItemOption, Product, Restaurant, Table
from app.schemas.order import OrderCreate, OrderStatusUpdate
from app.schemas.realtime import RealtimeEvent, RealtimeEventType
from app.services.idempotency_service import IdempotencyService


class OrderService:
    @staticmethod
    def generate_order_number() -> str:
        ts_part = int(datetime.now(timezone.utc).timestamp() * 1000) % 1000000
        rand_part = random.randint(1000, 9999)
        return f"ORD-{ts_part:06d}-{rand_part}"

    @staticmethod
    def get_order_by_id(db: Session, order_id: str) -> Order:
        order = (
            db.query(Order)
            .filter(Order.id == order_id, Order.is_deleted == False)
            .options(
                joinedload(Order.items).joinedload(OrderItem.options),
                joinedload(Order.payments),
            )
            .first()
        )
        if not order:
            raise EntityNotFoundException("Order", order_id)
        return order

    @staticmethod
    def list_orders(
        db: Session,
        restaurant_id: Optional[str] = None,
        table_id: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[Order]:
        query = (
            db.query(Order)
            .filter(Order.is_deleted == False)
            .options(
                joinedload(Order.items).joinedload(OrderItem.options),
                joinedload(Order.payments),
            )
        )
        if restaurant_id:
            query = query.filter(Order.restaurant_id == restaurant_id)
        if table_id:
            query = query.filter(Order.table_id == table_id)
        if status:
            query = query.filter(Order.status == status)
        return query.order_by(Order.placed_at.desc()).all()

    @staticmethod
    def calculate_order(db: Session, data: OrderCreate) -> dict:
        table = db.query(Table).filter_by(id=data.table_id, is_deleted=False).first()
        if not table:
            table = (
                db.query(Table).filter(Table.table_number.in_(["Table 08", "Table 8"]), Table.is_deleted == False).first()
                or db.query(Table).filter(Table.is_deleted == False).first()
            )
        if not table:
            raise EntityNotFoundException("Table", data.table_id)

        restaurant = db.query(Restaurant).filter_by(id=table.restaurant_id).first()
        if not restaurant:
            raise EntityNotFoundException("Restaurant", table.restaurant_id)

        subtotal = Decimal("0.00")
        total_items = 0

        for item_data in data.items:
            product = db.query(Product).filter_by(id=item_data.product_id, is_deleted=False).first()
            if not product:
                raise EntityNotFoundException("Product", item_data.product_id)

            item_price = product.base_price
            for opt_data in item_data.options:
                item_price += opt_data.price_modifier

            subtotal += item_price * item_data.quantity
            total_items += item_data.quantity

        tax_rate = restaurant.tax_rate or Decimal("8.50")
        tax_amount = round(subtotal * (tax_rate / Decimal("100")), 2)
        service_fee = Decimal("0.00")
        tip_amount = data.tip_amount or Decimal("0.00")
        total_amount = subtotal + tax_amount + service_fee + tip_amount

        return {
            "subtotal": subtotal,
            "tax_rate": tax_rate,
            "tax_amount": tax_amount,
            "service_fee": service_fee,
            "tip_amount": tip_amount,
            "total_amount": total_amount,
            "item_count": total_items,
        }

    @staticmethod
    def create_order(db: Session, data: OrderCreate) -> Order:
        # 1. Idempotency Check (Prevent duplicate order creation)
        idempotency_key = getattr(data, "idempotency_key", None)
        if idempotency_key:
            # Check DB first
            existing_order = (
                db.query(Order)
                .filter(Order.idempotency_key == idempotency_key, Order.is_deleted == False)
                .options(
                    joinedload(Order.items).joinedload(OrderItem.options),
                    joinedload(Order.payments),
                )
                .first()
            )
            if existing_order:
                logger.info(f"Duplicate order prevented by DB idempotency key: {idempotency_key}")
                return existing_order

            # Check Fast Idempotency Cache
            cached_result = IdempotencyService.get_existing_result(idempotency_key)
            if cached_result and "id" in cached_result:
                cached_order = (
                    db.query(Order)
                    .filter(Order.id == cached_result["id"], Order.is_deleted == False)
                    .options(
                        joinedload(Order.items).joinedload(OrderItem.options),
                        joinedload(Order.payments),
                    )
                    .first()
                )
                if cached_order:
                    logger.info(f"Duplicate order prevented by Cache idempotency key: {idempotency_key}")
                    return cached_order

            # Acquire atomic lock
            if not IdempotencyService.acquire_lock(idempotency_key):
                # Another concurrent request is currently in-flight with the same key
                existing_order = (
                    db.query(Order)
                    .filter(Order.idempotency_key == idempotency_key, Order.is_deleted == False)
                    .first()
                )
                if existing_order:
                    return existing_order

        table = db.query(Table).filter_by(id=data.table_id, is_deleted=False).first()
        if not table:
            table = (
                db.query(Table).filter(Table.table_number.in_(["Table 08", "Table 8"]), Table.is_deleted == False).first()
                or db.query(Table).filter(Table.is_deleted == False).first()
            )
        if not table:
            if idempotency_key:
                IdempotencyService.release_lock(idempotency_key)
            raise EntityNotFoundException("Table", data.table_id)

        restaurant = db.query(Restaurant).filter_by(id=table.restaurant_id).first()
        if not restaurant:
            if idempotency_key:
                IdempotencyService.release_lock(idempotency_key)
            raise EntityNotFoundException("Restaurant", table.restaurant_id)

        now = datetime.now(timezone.utc)
        subtotal = Decimal("0.00")
        order_items_to_add = []

        # Resolve items and modifiers
        for item_data in data.items:
            product = db.query(Product).filter_by(id=item_data.product_id, is_deleted=False).first()
            if not product:
                if idempotency_key:
                    IdempotencyService.release_lock(idempotency_key)
                raise EntityNotFoundException("Product", item_data.product_id)

            item_price = product.base_price
            options_to_add = []

            for opt_data in item_data.options:
                item_price += opt_data.price_modifier
                opt = OrderItemOption(
                    option_name=opt_data.option_name,
                    value_name=opt_data.value_name,
                    price_modifier=opt_data.price_modifier,
                )
                options_to_add.append(opt)

            item_subtotal = item_price * item_data.quantity
            subtotal += item_subtotal

            order_item = OrderItem(
                product_id=product.id,
                product_name=product.name,
                quantity=item_data.quantity,
                unit_price=product.base_price,
                subtotal=item_subtotal,
                status="QUEUED",
                notes=item_data.notes,
                options=options_to_add,
            )
            order_items_to_add.append((order_item, product.prep_station_code))

        # Financial Calculations
        tax_rate = restaurant.tax_rate or Decimal("8.50")
        tax_amount = round(subtotal * (tax_rate / Decimal("100")), 2)
        service_fee = Decimal("0.00")
        tip_amount = data.tip_amount or Decimal("0.00")
        total_amount = subtotal + tax_amount + service_fee + tip_amount

        # Create Order
        order = Order(
            restaurant_id=restaurant.id,
            table_id=table.id,
            order_number=OrderService.generate_order_number(),
            status="PENDING",
            subtotal=subtotal,
            tax_amount=tax_amount,
            service_fee=service_fee,
            tip_amount=tip_amount,
            total_amount=total_amount,
            payment_status="UNPAID",
            placed_at=now,
            special_instructions=data.special_instructions,
            idempotency_key=idempotency_key,
        )
        db.add(order)
        db.flush()

        for item, _ in order_items_to_add:
            item.order_id = order.id
            db.add(item)
        db.flush()

        # Route Kitchen KDS Tickets
        station_codes = {station_code for _, station_code in order_items_to_add if station_code}
        for s_code in station_codes:
            station = db.query(KitchenStation).filter_by(
                restaurant_id=restaurant.id, code=s_code, is_active=True
            ).first()
            if station:
                kds_ticket = KitchenOrder(
                    order_id=order.id,
                    station_id=station.id,
                    status="QUEUED",
                    ticket_priority=1,
                    estimated_prep_minutes=15,
                    timer_started_at=now,
                )
                db.add(kds_ticket)

        # Mark table as occupied
        table.status = "OCCUPIED"

        db.commit()
        db.refresh(order)

        # Record idempotency result
        if idempotency_key:
            IdempotencyService.record_result(
                idempotency_key,
                {"id": order.id, "order_number": order.order_number, "total_amount": str(order.total_amount)},
            )

        # Real-time WebSocket Event: ORDER_CREATED
        # Broadcasts to Table (private), KDS screens (for cooks), and Admin Dashboards (for managers)
        try:
            created_event = RealtimeEvent(
                type=RealtimeEventType.ORDER_CREATED,
                restaurant_id=order.restaurant_id,
                table_id=order.table_id,
                data={
                    "order_id": order.id,
                    "order_number": order.order_number,
                    "table_id": order.table_id,
                    "table_number": table.table_number if table else "Table --",
                    "status": order.status,
                    "subtotal": float(order.subtotal),
                    "tax_amount": float(order.tax_amount),
                    "tip_amount": float(order.tip_amount),
                    "total_amount": float(order.total_amount),
                    "items": [
                        {
                            "id": it.id,
                            "product_name": it.product_name,
                            "quantity": it.quantity,
                            "unit_price": float(it.unit_price),
                            "subtotal": float(it.subtotal),
                            "notes": it.notes,
                        }
                        for it in order.items
                    ],
                    "special_instructions": order.special_instructions,
                    "placed_at": order.placed_at.isoformat() if order.placed_at else "",
                },
            )
            ws_manager.dispatch_sync(created_event)
        except Exception as ws_err:
            logger.warning(f"Failed to dispatch ORDER_CREATED realtime event: {ws_err}")

        return order

    @staticmethod
    def update_order_status(db: Session, order_id: str, new_status: str) -> Order:
        VALID_ORDER_STATUSES = {
            "PLACED", "PENDING", "ACCEPTED", "CONFIRMED", "PREPARING", "READY", "SERVED", "COMPLETED", "CANCELLED"
        }
        normalized_status = new_status.upper().strip()
        if normalized_status not in VALID_ORDER_STATUSES:
            raise ValidationException(f"Invalid order status '{new_status}'. Allowed values: {sorted(list(VALID_ORDER_STATUSES))}")

        order = OrderService.get_order_by_id(db, order_id)
        now = datetime.now(timezone.utc)
        order.status = normalized_status

        if normalized_status == "PREPARING" and not order.accepted_at:
            order.accepted_at = now
        elif normalized_status in ["COMPLETED", "SERVED"] and not order.completed_at:
            order.completed_at = now
        elif normalized_status == "READY" and not order.ready_at:
            order.ready_at = now

        db.commit()
        db.refresh(order)

        # Map to RealtimeEventType
        status_to_event = {
            "ACCEPTED": RealtimeEventType.ORDER_ACCEPTED,
            "PREPARING": RealtimeEventType.ORDER_PREPARING,
            "READY": RealtimeEventType.ORDER_READY,
            "SERVED": RealtimeEventType.ORDER_SERVED,
            "COMPLETED": RealtimeEventType.ORDER_COMPLETED,
            "CANCELLED": RealtimeEventType.ORDER_CANCELLED,
            "PLACED": RealtimeEventType.ORDER_CREATED,
            "PENDING": RealtimeEventType.ORDER_CREATED,
        }
        event_type = status_to_event.get(normalized_status, RealtimeEventType.ORDER_ACCEPTED)

        try:
            status_event = RealtimeEvent(
                type=event_type,
                restaurant_id=order.restaurant_id,
                table_id=order.table_id,
                data={
                    "order_id": order.id,
                    "order_number": order.order_number,
                    "table_id": order.table_id,
                    "status": order.status,
                    "updated_at": now.isoformat(),
                },
            )
            ws_manager.dispatch_sync(status_event)
        except Exception as ws_err:
            logger.warning(f"Failed to dispatch status update realtime event: {ws_err}")

        return order

    @staticmethod
    def delete_order(db: Session, order_id: str) -> bool:
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise EntityNotFoundException("Order", order_id)
        order.is_deleted = True
        kitchen_order = db.query(KitchenOrder).filter(KitchenOrder.order_id == order_id).first()
        if kitchen_order:
            kitchen_order.status = "CANCELLED"
        db.commit()

        try:
            cancel_event = RealtimeEvent(
                type=RealtimeEventType.ORDER_CANCELLED,
                restaurant_id=order.restaurant_id,
                table_id=order.table_id,
                data={
                    "order_id": order.id,
                    "order_number": order.order_number,
                    "table_id": order.table_id,
                    "status": "DELETED",
                    "deleted": True,
                },
            )
            ws_manager.dispatch_sync(cancel_event)
        except Exception as ws_err:
            logger.warning(f"Failed to dispatch delete realtime event: {ws_err}")

        return True

    @staticmethod
    def clear_table_orders(db: Session, table_id: str, only_completed: bool = False) -> int:
        query = db.query(Order).filter(Order.table_id == table_id, Order.is_deleted == False)
        if only_completed:
            query = query.filter(Order.status.in_(["COMPLETED", "SERVED", "CANCELLED"]))
        orders = query.all()
        count = len(orders)
        for ord in orders:
            ord.is_deleted = True
            k_ord = db.query(KitchenOrder).filter(KitchenOrder.order_id == ord.id).first()
            if k_ord:
                k_ord.status = "CANCELLED"
            try:
                cancel_event = RealtimeEvent(
                    type=RealtimeEventType.ORDER_CANCELLED,
                    restaurant_id=ord.restaurant_id,
                    table_id=ord.table_id,
                    data={
                        "order_id": ord.id,
                        "order_number": ord.order_number,
                        "table_id": ord.table_id,
                        "status": "DELETED",
                        "deleted": True,
                    },
                )
                ws_manager.dispatch_sync(cancel_event)
            except Exception as ws_err:
                logger.warning(f"Failed to dispatch clear realtime event for order {ord.id}: {ws_err}")
        db.commit()
        return count

    @staticmethod
    def clear_all_orders(db: Session) -> int:
        orders = db.query(Order).filter(Order.is_deleted == False).all()
        count = len(orders)
        for ord in orders:
            ord.is_deleted = True
            k_ord = db.query(KitchenOrder).filter(KitchenOrder.order_id == ord.id).first()
            if k_ord:
                k_ord.status = "CANCELLED"
            try:
                cancel_event = RealtimeEvent(
                    type=RealtimeEventType.ORDER_CANCELLED,
                    restaurant_id=ord.restaurant_id,
                    table_id=ord.table_id,
                    data={
                        "order_id": ord.id,
                        "order_number": ord.order_number,
                        "table_id": ord.table_id,
                        "status": "DELETED",
                        "deleted": True,
                    },
                )
                ws_manager.dispatch_sync(cancel_event)
            except Exception as ws_err:
                logger.warning(f"Failed to dispatch clear realtime event for order {ord.id}: {ws_err}")

        # Reset all table statuses to AVAILABLE
        tables = db.query(Table).filter(Table.is_deleted == False).all()
        for tbl in tables:
            tbl.status = "AVAILABLE"

        # Mark all unread service calls/notifications as read
        try:
            notifs = db.query(Notification).filter(Notification.is_read == False).all()
            for n in notifs:
                n.is_read = True
        except Exception:
            pass

        db.commit()
        return count

    @staticmethod
    def reset_system_data(
        db: Session,
        clear_orders: bool = True,
        clear_products: bool = False,
        clear_categories: bool = False,
        reset_tables: bool = True,
    ) -> dict:
        result = {}
        if clear_orders:
            orders_cleared = OrderService.clear_all_orders(db)
            result["orders_cleared"] = orders_cleared
        if reset_tables:
            tables = db.query(Table).filter(Table.is_deleted == False).all()
            for t in tables:
                t.status = "AVAILABLE"
            result["tables_reset"] = len(tables)
        if clear_products:
            from app.services.menu_service import MenuService
            result["products_cleared"] = MenuService.clear_all_products(db)
        if clear_categories:
            from app.services.menu_service import MenuService
            result["categories_cleared"] = MenuService.clear_all_categories(db)
        db.commit()
        return result
