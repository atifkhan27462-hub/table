import pytest
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy.exc import IntegrityError
from app.core.database import SessionLocal
from app.models import (
    Restaurant,
    User,
    Role,
    Permission,
    Table,
    TableDevice,
    Session as TableSession,
    Category,
    Product,
    ProductOption,
    Order,
    OrderItem,
    Payment,
    KitchenStation,
    KitchenOrder,
    AuditLog,
    Notification,
    Game,
    AiGeneration,
)



@pytest.fixture(scope="module")
def db_session():
    """Provides a database session for database layer testing."""
    session = SessionLocal()
    yield session
    session.close()


def test_seed_restaurant_exists(db_session):
    restaurant = db_session.query(Restaurant).filter_by(slug="luminary-dining").first()
    assert restaurant is not None
    assert restaurant.name == "The Luminary Dining & Bistro"
    assert restaurant.currency == "USD"
    assert restaurant.tax_rate == Decimal("8.50")


def test_seed_users_and_roles(db_session):
    admin = db_session.query(User).filter_by(email="admin@smarttable.io").first()
    assert admin is not None
    assert admin.role.code == "SUPERADMIN"
    assert admin.is_active is True

    chef = db_session.query(User).filter_by(email="chef@smarttable.io").first()
    assert chef is not None
    assert chef.role.code == "KITCHEN"


def test_seed_tables_and_device_hardware(db_session):
    tables = db_session.query(Table).all()
    assert len(tables) >= 16

    table_4 = db_session.query(Table).filter_by(table_number="Table 04").first()
    assert table_4 is not None
    assert len(table_4.devices) > 0

    device = table_4.devices[0]
    assert device.device_token is not None
    assert device.screen_resolution == "1920x1080"
    assert "touch_latency_ms" in device.telemetry


def test_seed_menu_and_modifiers(db_session):
    categories = db_session.query(Category).all()
    assert len(categories) >= 5

    ribeye = db_session.query(Product).filter_by(slug="prime-dry-aged-ribeye").first()
    assert ribeye is not None
    assert ribeye.base_price == Decimal("58.00")
    assert ribeye.category is not None

    # Check relationship to options and option values
    assert len(ribeye.options) >= 2
    doneness_opt = next((o for o in ribeye.options if o.name == "Meat Doneness"), None)
    assert doneness_opt is not None
    assert len(doneness_opt.values) >= 4


def test_seed_order_lifecycle_and_payments(db_session):
    order = db_session.query(Order).filter_by(order_number="ORD-9021").first()
    assert order is not None
    assert order.status in ["PREPARING", "READY"]
    assert order.total_amount == Decimal("189.92")

    # Order -> Items relationship
    assert len(order.items) >= 1
    item = order.items[0]
    assert item.product_name == "Prime Dry-Aged Ribeye (14oz)"
    assert len(item.options) >= 1

    # Order -> Payments relationship
    assert len(order.payments) >= 1
    payment = order.payments[0]
    assert payment.payment_method == "CREDIT_CARD"
    assert payment.status == "COMPLETED"

    # Order -> KDS Kitchen routing relationship
    assert len(order.kitchen_orders) >= 1
    kds_ticket = order.kitchen_orders[0]
    assert kds_ticket.station.code == "GRILL"
    assert kds_ticket.status in ["IN_PREP", "READY", "BUMPED"]



def test_unique_constraint_table_number(db_session):
    restaurant = db_session.query(Restaurant).filter_by(slug="luminary-dining").first()
    duplicate_table = Table(
        restaurant_id=restaurant.id,
        table_number="Table 04",  # Already exists!
        name="Duplicate Table 04",
        capacity=4,
    )
    db_session.add(duplicate_table)
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()


def test_unique_constraint_user_email(db_session):
    restaurant = db_session.query(Restaurant).filter_by(slug="luminary-dining").first()
    role = db_session.query(Role).first()
    duplicate_user = User(
        restaurant_id=restaurant.id,
        role_id=role.id,
        email="admin@smarttable.io",  # Already exists!
        password_hash="test",
        full_name="Duplicate Admin",
    )
    db_session.add(duplicate_user)
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()


def test_multi_tenant_table_isolation(db_session):
    """
    Verifies that two distinct restaurants can safely share identical table numbers ('Table 04')
    without collision, validating multi-tenant schema isolation.
    """
    second_restaurant = db_session.query(Restaurant).filter_by(slug="bistro-deux").first()
    if not second_restaurant:
        second_restaurant = Restaurant(
            name="Bistro Deux (Second Branch)",
            slug="bistro-deux",
            currency="USD",
        )
        db_session.add(second_restaurant)
        db_session.flush()

    # Create Table 04 under Bistro Deux - must succeed despite Table 04 existing in Luminary Dining
    bistro_table_4 = db_session.query(Table).filter_by(
        restaurant_id=second_restaurant.id, table_number="Table 04"
    ).first()
    if not bistro_table_4:
        bistro_table_4 = Table(
            restaurant_id=second_restaurant.id,
            table_number="Table 04",
            name="Bistro Deux Table 04",
            capacity=2,
        )
        db_session.add(bistro_table_4)
        db_session.flush()

    assert bistro_table_4.id is not None
    assert bistro_table_4.table_number == "Table 04"
    assert bistro_table_4.restaurant_id == second_restaurant.id
    db_session.commit()


def test_audit_logging_integrity(db_session):
    restaurant = db_session.query(Restaurant).filter_by(slug="luminary-dining").first()
    log = AuditLog(
        restaurant_id=restaurant.id,
        actor_id="admin-01",
        actor_type="USER",
        action="UPDATE_MENU_PRICE",
        entity_name="Product",
        entity_id="prod-ribeye",
        ip_address="192.168.1.5",
        diff_before={"price": 54.00},
        diff_after={"price": 58.00},
        status="SUCCESS",
    )
    db_session.add(log)
    db_session.commit()

    saved_log = db_session.query(AuditLog).filter_by(id=log.id).first()
    assert saved_log is not None
    assert saved_log.action == "UPDATE_MENU_PRICE"
    assert saved_log.diff_before["price"] == 54.00
    assert saved_log.diff_after["price"] == 58.00


def test_notification_delivery_flow(db_session):
    restaurant = db_session.query(Restaurant).filter_by(slug="luminary-dining").first()
    notif = Notification(
        restaurant_id=restaurant.id,
        recipient_type="STAFF",
        title="Water Refill Requested",
        message="Table 04 requested sparkling water",
        notification_type="WATER_REFILL",
        is_read=False,
    )
    db_session.add(notif)
    db_session.commit()

    saved_notif = db_session.query(Notification).filter_by(id=notif.id).first()
    assert saved_notif.is_read is False

    # Mark as read
    now = datetime.now(timezone.utc)
    saved_notif.is_read = True
    saved_notif.read_at = now
    db_session.commit()

    refetched = db_session.query(Notification).filter_by(id=notif.id).first()
    assert refetched.is_read is True
    assert refetched.read_at is not None


def test_soft_delete_preservation(db_session):
    prod = db_session.query(Product).first()
    assert prod.is_deleted is False
    prod.is_deleted = True
    db_session.flush()

    refetched = db_session.query(Product).filter_by(id=prod.id).first()
    assert refetched.is_deleted is True
    # Restore
    prod.is_deleted = False
    db_session.commit()


def test_permission_and_role_relationship(db_session):
    """Verifies Role <-> Permission many-to-many association."""
    perm = db_session.query(Permission).filter_by(code="menu:write").first()
    if not perm:
        perm = Permission(code="menu:write", category="MENU", description="Edit dishes and pricing")
        db_session.add(perm)
        db_session.flush()

    role = db_session.query(Role).filter_by(code="SUPERADMIN").first()
    assert role is not None
    if perm not in role.permissions:
        role.permissions.append(perm)
        db_session.commit()

    reloaded_role = db_session.query(Role).filter_by(code="SUPERADMIN").first()
    assert any(p.code == "menu:write" for p in reloaded_role.permissions)


def test_table_session_lifecycle(db_session):
    """Verifies customer table dining session creation, orders linking, and closing."""
    table_1 = db_session.query(Table).filter_by(table_number="Table 01").first()
    assert table_1 is not None

    now = datetime.now(timezone.utc)
    session = TableSession(
        table_id=table_1.id,
        guest_count=3,
        status="ACTIVE",
        opened_at=now,
        total_spent=Decimal("0.00"),
        notes="VIP Party",
    )
    db_session.add(session)
    db_session.commit()

    assert session.id is not None
    assert session.table.table_number == "Table 01"

    # Close session
    session.status = "COMPLETED"
    session.closed_at = datetime.now(timezone.utc)
    session.total_spent = Decimal("142.50")
    db_session.commit()

    refetched_session = db_session.query(TableSession).filter_by(id=session.id).first()
    assert refetched_session.status == "COMPLETED"
    assert refetched_session.total_spent == Decimal("142.50")


def test_ai_generation_and_game_catalog(db_session):
    """Verifies AI generation isolation logging and game entities."""
    restaurant = db_session.query(Restaurant).filter_by(slug="luminary-dining").first()
    table_1 = db_session.query(Table).filter_by(table_number="Table 01").first()

    ai_gen = AiGeneration(
        restaurant_id=restaurant.id,
        table_id=table_1.id,
        generation_type="SOMMELIER_PAIRING",
        prompt="Pair a dry red wine with 45-day dry-aged ribeye steak",
        result_content="Recommended: 2018 Napa Valley Cabernet Sauvignon.",
        model_name="gemini-1.5-flash",
        tokens_used=180,
        is_approved=True,
    )
    db_session.add(ai_gen)
    db_session.commit()

    saved_gen = db_session.query(AiGeneration).filter_by(id=ai_gen.id).first()
    assert saved_gen is not None
    assert saved_gen.generation_type == "SOMMELIER_PAIRING"
    assert "Cabernet Sauvignon" in saved_gen.result_content

    games = db_session.query(Game).filter_by(is_active=True).all()
    assert len(games) >= 3

