import hashlib
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine
from app.models import (
    Base,
    Restaurant,
    Role,
    Permission,
    User,
    Table,
    TableDevice,
    Session as TableSession,
    Category,
    Product,
    ProductOption,
    ProductOptionValue,
    KitchenStation,
    KitchenOrder,
    Order,
    OrderItem,
    OrderItemOption,
    Payment,
    Game,
    AuditLog,
)
from app.core.logging import logger


def hash_password(password: str) -> str:
    """Deterministic hash for development seeding."""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def seed_database(db: Session) -> None:
    """Seed foundational data for development testing."""
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)

    # 1. Demo Restaurant
    restaurant = db.query(Restaurant).filter_by(slug="luminary-dining").first()
    if not restaurant:
        restaurant = Restaurant(
            id="b13713fa-b009-4f0f-9d1a-bf64e247bed2",
            name="The Luminary Dining & Bistro",
            slug="luminary-dining",
            currency="USD",
            tax_rate=Decimal("8.50"),
            service_fee_rate=Decimal("0.00"),
            address="100 Grand Avenue, Financial District",
            phone="+1 (555) 234-5678",
            is_active=True,
        )
        db.add(restaurant)
        db.flush()
        logger.info(f"Created Restaurant: {restaurant.name} [{restaurant.id}]")

    # 2. Permissions & Roles
    roles = {}
    for code, name in [
        ("SUPER_ADMIN", "Super Administrator"),
        ("SUPERADMIN", "Super Administrator (Legacy Alias)"),
        ("RESTAURANT_ADMIN", "Restaurant General Administrator"),
        ("MANAGER", "Floor & General Manager"),
        ("KITCHEN", "Kitchen Chef / Line Cook"),
        ("STAFF", "Waitstaff & Service Staff"),
        ("WAITER", "Waitstaff (Legacy Alias)"),
        ("TABLE_DEVICE", "Interactive 32-inch Table Hardware"),
    ]:
        role = db.query(Role).filter_by(restaurant_id=restaurant.id, code=code).first()
        if not role:
            role = Role(
                restaurant_id=restaurant.id,
                code=code,
                name=name,
                description=f"Standard role for {name}",
                is_system=True,
            )
            db.add(role)
            db.flush()
        roles[code] = role


    # 3. Users (Admin, Kitchen, Manager)
    admin_user = db.query(User).filter_by(restaurant_id=restaurant.id, email="admin@smarttable.io").first()
    if not admin_user:
        admin_user = User(
            restaurant_id=restaurant.id,
            role_id=roles["SUPERADMIN"].id,
            email="admin@smarttable.io",
            password_hash=hash_password("admin12345"),
            full_name="Abdullah Niazi & Muhammad Atif",
            phone="+1 (555) 000-0001",
            is_active=True,
        )
        db.add(admin_user)

    kitchen_user = db.query(User).filter_by(restaurant_id=restaurant.id, email="chef@smarttable.io").first()
    if not kitchen_user:
        kitchen_user = User(
            restaurant_id=restaurant.id,
            role_id=roles["KITCHEN"].id,
            email="chef@smarttable.io",
            password_hash=hash_password("chef12345"),
            full_name="Elena Rostova (Executive Chef)",
            phone="+1 (555) 000-0002",
            is_active=True,
        )
        db.add(kitchen_user)

    # 4. Kitchen Stations
    stations = {}
    for code, name, disp in [
        ("GRILL", "Wood-Fired Grill Line", 1),
        ("SAUTE", "Saute & Pasta Line", 2),
        ("OVEN", "Wood Stone Pizza Oven", 3),
        ("COLD", "Garde Manger & Crudo", 4),
        ("BAR", "Craft Cocktail Bar", 5),
    ]:
        station = db.query(KitchenStation).filter_by(restaurant_id=restaurant.id, code=code).first()
        if not station:
            station = KitchenStation(
                restaurant_id=restaurant.id,
                code=code,
                name=name,
                display_order=disp,
                is_active=True,
            )
            db.add(station)
            db.flush()
        stations[code] = station

    # 5. Tables & Devices (16 physical dining tables)
    table_map = {}
    for num in range(1, 17):
        table_num = f"Table {num:02d}"
        tbl = db.query(Table).filter_by(restaurant_id=restaurant.id, table_number=table_num).first()
        if not tbl:
            tbl_kwargs = {
                "restaurant_id": restaurant.id,
                "table_number": table_num,
                "name": f"{table_num} (Main Hall)",
                "capacity": 4 if num % 2 == 0 else 2,
                "section": "Main Dining Room",
                "status": "OCCUPIED" if num in [2, 4, 7, 9, 12] else "AVAILABLE",
                "is_active": True,
            }
            if num == 8:
                tbl_kwargs["id"] = "8a45db00-eb87-4e64-b097-a8ddc3085462"
            tbl = Table(**tbl_kwargs)
            db.add(tbl)
            db.flush()

            # Pair device
            device = TableDevice(
                table_id=tbl.id,
                restaurant_id=restaurant.id,
                device_token=f"dev_token_{num:02d}_secret_abc123",
                hardware_id=f"MINIPC-SN-900{num:02d}",
                mac_address=f"00:1B:44:11:3A:{num:02X}",
                ip_address=f"192.168.1.{100 + num}",
                network_status="CONNECTED" if num != 15 else "DEGRADED",
                app_version="2.4.0",
                screen_resolution="1920x1080",
                status="ONLINE" if num != 15 else "WARNING",
                last_heartbeat=datetime.now(timezone.utc),
                kiosk_mode_enabled=True,
                telemetry={"cpu_temp_c": 44, "fan_rpm": 1200, "touch_latency_ms": 14},
            )
            db.add(device)
        table_map[table_num] = tbl

    # 6. Categories
    category_map = {}
    for name, slug, icon, disp in [
        ("Starters & Crudo", "starters", "🥗", 1),
        ("Prime Wood-Fired Steaks", "steaks", "🥩", 2),
        ("Artisanal Pastas & Mains", "mains", "🍝", 3),
        ("Handcrafted Drinks", "drinks", "🍸", 4),
        ("Decadent Desserts", "desserts", "🍰", 5),
    ]:
        cat = db.query(Category).filter_by(restaurant_id=restaurant.id, slug=slug).first()
        if not cat:
            cat = Category(
                restaurant_id=restaurant.id,
                name=name,
                slug=slug,
                description=f"Chef's curated {name.lower()}",
                sort_order=disp,
                icon=icon,
                is_active=True,
            )
            db.add(cat)
            db.flush()
        category_map[slug] = cat

    # 7. Products & Options
    product_map = {}
    products_data = [
        {
            "name": "Prime Dry-Aged Ribeye (14oz)",
            "slug": "prime-dry-aged-ribeye",
            "category": "steaks",
            "price": Decimal("58.00"),
            "station": "GRILL",
            "calories": 890,
            "prep_time": 18,
            "desc": "45-day dry aged USDA Prime, grilled over white oak with black truffle compound butter.",
            "allergens": ["Dairy"],
            "tags": ["Chef Signature", "Gluten-Free"],
            "options": [
                {
                    "name": "Meat Doneness",
                    "type": "DONENESS",
                    "required": True,
                    "values": [("Rare", 0), ("Medium Rare", 0), ("Medium", 0), ("Well Done", 0)],
                },
                {
                    "name": "Choice of Artisanal Side",
                    "type": "SIDE",
                    "required": True,
                    "values": [("Truffle Parmesan Fries", 0), ("Charred Broccolini", 0), ("Potato Purée", 0)],
                },
            ],
        },
        {
            "name": "Pan-Seared Chilean Sea Bass",
            "slug": "pan-seared-chilean-sea-bass",
            "category": "mains",
            "price": Decimal("46.00"),
            "station": "SAUTE",
            "calories": 620,
            "prep_time": 14,
            "desc": "Wild-caught sea bass with saffron velouté, charred broccolini, and sweet corn purée.",
            "allergens": ["Fish"],
            "tags": ["Seafood", "Gluten-Free"],
            "options": [],
        },
        {
            "name": "Truffle Wild Mushroom Risotto",
            "slug": "truffle-wild-mushroom-risotto",
            "category": "mains",
            "price": Decimal("34.00"),
            "station": "SAUTE",
            "calories": 740,
            "prep_time": 12,
            "desc": "Acquerello carnaroli rice, foraged chanterelles, black summer truffle carpaccio.",
            "allergens": ["Dairy", "Gluten"],
            "tags": ["Vegetarian"],
            "options": [],
        },
        {
            "name": "Smoked Bourbon Old Fashioned",
            "slug": "smoked-bourbon-old-fashioned",
            "category": "drinks",
            "price": Decimal("18.00"),
            "station": "BAR",
            "calories": 210,
            "prep_time": 4,
            "desc": "Woodford Reserve bourbon, smoked maple syrup, presented under a cloche with charred rosemary.",
            "allergens": [],
            "tags": ["Signature Drink"],
            "options": [],
        },
    ]

    for pdata in products_data:
        prod = db.query(Product).filter_by(restaurant_id=restaurant.id, slug=pdata["slug"]).first()
        if not prod:
            prod = Product(
                restaurant_id=restaurant.id,
                category_id=category_map[pdata["category"]].id,
                name=pdata["name"],
                slug=pdata["slug"],
                description=pdata["desc"],
                base_price=pdata["price"],
                prep_station_code=pdata["station"],
                calories=pdata["calories"],
                prep_time_minutes=pdata["prep_time"],
                allergens=pdata["allergens"],
                tags=pdata["tags"],
                stock_status="IN_STOCK",
                is_available=True,
            )
            db.add(prod)
            db.flush()

            for opt_data in pdata["options"]:
                opt = ProductOption(
                    product_id=prod.id,
                    name=opt_data["name"],
                    option_type=opt_data["type"],
                    is_required=opt_data["required"],
                )
                db.add(opt)
                db.flush()
                for val_name, extra in opt_data["values"]:
                    val = ProductOptionValue(
                        option_id=opt.id,
                        name=val_name,
                        price_modifier=Decimal(str(extra)),
                        is_default=(val_name == "Medium Rare"),
                    )
                    db.add(val)

        product_map[pdata["slug"]] = prod

    # 8. Sample Order & KDS Ticket
    sample_order = db.query(Order).filter_by(restaurant_id=restaurant.id, order_number="ORD-9021").first()
    if not sample_order:
        table_4 = table_map["Table 04"]
        now = datetime.now(timezone.utc)
        sample_order = Order(
            restaurant_id=restaurant.id,
            table_id=table_4.id,
            order_number="ORD-9021",
            status="PREPARING",
            subtotal=Decimal("152.00"),
            tax_amount=Decimal("12.92"),
            service_fee=Decimal("0.00"),
            tip_amount=Decimal("25.00"),
            total_amount=Decimal("189.92"),
            payment_status="PAID",
            placed_at=now - timedelta(minutes=12),
            accepted_at=now - timedelta(minutes=10),
            special_instructions="Customer requested sear charred on steak",
        )
        db.add(sample_order)
        db.flush()

        # Order Items
        ribeye = product_map["prime-dry-aged-ribeye"]
        item1 = OrderItem(
            order_id=sample_order.id,
            product_id=ribeye.id,
            product_name=ribeye.name,
            quantity=2,
            unit_price=ribeye.base_price,
            subtotal=ribeye.base_price * 2,
            status="COOKING",
            notes="Medium Rare, Truffle Fries",
        )
        db.add(item1)
        db.flush()

        # Order Item Options
        opt1 = OrderItemOption(
            order_item_id=item1.id,
            option_name="Meat Doneness",
            value_name="Medium Rare",
            price_modifier=Decimal("0.00"),
        )
        db.add(opt1)

        # Payment record
        payment = Payment(
            order_id=sample_order.id,
            payment_method="CREDIT_CARD",
            amount=Decimal("189.92"),
            tip_amount=Decimal("25.00"),
            tax_amount=Decimal("12.92"),
            transaction_reference="AUTH_VISA_984210",
            status="COMPLETED",
            processed_at=now - timedelta(minutes=11),
        )
        db.add(payment)

        # Kitchen KDS Ticket
        kds_ticket = KitchenOrder(
            order_id=sample_order.id,
            station_id=stations["GRILL"].id,
            status="IN_PREP",
            ticket_priority=1,
            estimated_prep_minutes=18,
            timer_started_at=now - timedelta(minutes=10),
        )
        db.add(kds_ticket)

    # 9. Sample Games
    for g_slug, g_title, g_cat in [
        ("gourmet-trivia", "Gourmet Trivia Challenge", "Social Trivia"),
        ("air-hockey-touch", "Air Hockey Touch 32", "Arcade Physics"),
        ("memory-match", "Culinary Memory Match", "Family"),
    ]:
        if not db.query(Game).filter_by(slug=g_slug).first():
            game = Game(
                title=g_title,
                slug=g_slug,
                description=f"Touch game: {g_title}",
                category=g_cat,
                min_players=1,
                max_players=4,
                rating=Decimal("4.8"),
                is_active=True,
            )
            db.add(game)

    db.commit()
    logger.info("Database seeding completed successfully.")


if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
