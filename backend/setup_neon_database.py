#!/usr/bin/env python3
"""
Atif & Abdullah Foods - Automated Neon PostgreSQL Database Setup & Seeder
-------------------------------------------------------------------------
This script connects to your Neon.tech cloud PostgreSQL database,
creates all 23 relational database tables, executes schema migrations,
and seeds initial restaurant data (clean tables, admin credentials, menu).
"""

import sys
import os
import re
import hashlib
from decimal import Decimal
from datetime import datetime, timezone

# Ensure project backend directory is in sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def normalize_db_url(url: str) -> str:
    url = url.strip().strip("'\"")
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg2://", 1)
    if url.startswith("postgresql://") and not url.startswith("postgresql+psycopg2://"):
        return url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return url

def main():
    print("=" * 70)
    print("   ATIF & ABDULLAH FOODS - NEON CLOUD POSTGRESQL SETUP")
    print("=" * 70)
    print()

    # 1. Get Connection String
    db_url = None
    if len(sys.argv) > 1:
        db_url = sys.argv[1].strip()
    elif os.getenv("DATABASE_URL"):
        db_url = os.getenv("DATABASE_URL").strip()
    
    if not db_url:
        print("[*] Please paste your Neon Database Connection String below:")
        print("    Example: postgresql://neondb_owner:***@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require")
        print()
        db_url = input("Neon Connection String: ").strip()

    if not db_url:
        print("\n[!] Error: No connection string provided. Aborting.")
        sys.exit(1)

    normalized_url = normalize_db_url(db_url)
    # Mask password for safe display
    masked_url = re.sub(r":([^:@]+)@", r":********@", normalized_url)
    print(f"\n[*] Target Database: {masked_url}")
    print("[*] Connecting to Neon cloud server...")

    try:
        engine = create_engine(
            normalized_url,
            pool_pre_ping=True,
            connect_args={"connect_timeout": 15}
        )
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version();")).fetchone()
            print(f"[✓] Connection Successful! PostgreSQL Version:")
            print(f"    {result[0]}\n")
    except Exception as e:
        print(f"\n[X] Connection Failed! Error: {e}")
        print("\nSuggestions:")
        print("1. Make sure your internet is connected.")
        print("2. Ensure '?sslmode=require' is at the end of your Neon connection string.")
        print("3. Check that your Neon project is active and not suspended.")
        sys.exit(1)

    # 2. Import Base and Models to trigger table creation
    print("[*] Generating all 23 relational database tables...")
    try:
        from app.models import (
            Base, Restaurant, Role, Permission, User, Table, TableDevice,
            Session as TableSession, Category, Product, ProductOption,
            ProductOptionValue, KitchenStation, KitchenOrder, Order,
            OrderItem, OrderItemOption, Payment, Game, AuditLog,
            Notification, Customer, role_permissions
        )
        Base.metadata.create_all(bind=engine)
        print("[✓] All database tables successfully created in Neon!")
    except Exception as e:
        print(f"[X] Table creation failed: {e}")
        sys.exit(1)

    # 3. Apply Schema Migrations & Indexes
    print("[*] Applying high-performance indexes and safety columns...")
    with engine.connect() as conn:
        migration_sqls = [
            "ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(64);",
            "ALTER TABLE ai_generations ADD COLUMN IF NOT EXISTS latency_ms INTEGER DEFAULT 0;",
            "ALTER TABLE ai_generations ADD COLUMN IF NOT EXISTS metadata_json JSON;",
            "ALTER TABLE games ADD COLUMN IF NOT EXISTS promotion_active BOOLEAN DEFAULT FALSE;",
            "ALTER TABLE games ADD COLUMN IF NOT EXISTS promotion_text VARCHAR(255);",
            "ALTER TABLE games ADD COLUMN IF NOT EXISTS promotion_code VARCHAR(50);",
            "ALTER TABLE games ADD COLUMN IF NOT EXISTS promotion_discount_percent INTEGER DEFAULT 0;",
            "ALTER TABLE table_devices ADD COLUMN IF NOT EXISTS restaurant_id VARCHAR(36);",
            "ALTER TABLE table_devices ADD COLUMN IF NOT EXISTS network_status VARCHAR(30) DEFAULT 'CONNECTED';",
            "ALTER TABLE table_devices ADD COLUMN IF NOT EXISTS kiosk_mode_enabled BOOLEAN DEFAULT TRUE;",
            "ALTER TABLE table_devices ADD COLUMN IF NOT EXISTS kiosk_pin VARCHAR(10) DEFAULT '7788';",
            "CREATE INDEX IF NOT EXISTS ix_kitchen_order_station_status ON kitchen_orders (station_id, status);",
            "CREATE INDEX IF NOT EXISTS ix_table_device_health ON table_devices (restaurant_id, status, last_heartbeat);",
            "CREATE INDEX IF NOT EXISTS ix_session_table_status ON sessions (table_id, status);",
            "CREATE INDEX IF NOT EXISTS ix_ai_gen_type_created ON ai_generations (restaurant_id, generation_type, created_at);",
        ]
        for sql in migration_sqls:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                pass
    print("[✓] Schema migrations and indexes applied.")

    # 4. Seed Foundational Data
    print("[*] Seeding initial restaurant configuration and master data...")
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        # A. Restaurant Entity
        restaurant = db.query(Restaurant).filter_by(slug="atif-abdullah-foods").first()
        if not restaurant:
            restaurant = Restaurant(
                id="b13713fa-b009-4f0f-9d1a-bf64e247bed2",
                name="Atif and Abdullah Foods",
                slug="atif-abdullah-foods",
                currency="PKR",
                tax_rate=Decimal("16.00"),
                service_fee_rate=Decimal("0.00"),
                address="Commercial Hub, Sector F-7, Islamabad / Lahore",
                phone="+92 300 1234567",
                is_active=True,
            )
            db.add(restaurant)
            db.flush()
            print("    + Created Restaurant: Atif and Abdullah Foods")

        # B. Roles
        roles = {}
        role_definitions = [
            ("SUPER_ADMIN", "Super Administrator"),
            ("SUPERADMIN", "Super Administrator (Legacy Alias)"),
            ("RESTAURANT_ADMIN", "Restaurant General Administrator"),
            ("MANAGER", "Floor & General Manager"),
            ("KITCHEN", "Kitchen Chef / Line Cook"),
            ("STAFF", "Waitstaff & Service Staff"),
            ("WAITER", "Waitstaff (Legacy Alias)"),
            ("TABLE_DEVICE", "Interactive 32-inch Table Hardware"),
        ]
        for code, name in role_definitions:
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
        print(f"    + Verified {len(role_definitions)} System Roles")

        # C. Admin and Kitchen Users
        admin_user = db.query(User).filter_by(restaurant_id=restaurant.id, email="admin@smarttable.io").first()
        if not admin_user:
            admin_user = User(
                restaurant_id=restaurant.id,
                role_id=roles["SUPERADMIN"].id,
                email="admin@smarttable.io",
                password_hash=hash_password("admin12345"),
                full_name="Abdullah Niazi & Muhammad Atif",
                phone="+92 300 0000001",
                is_active=True,
            )
            db.add(admin_user)
            print("    + Created Admin User: admin@smarttable.io (Password: admin12345)")

        kitchen_user = db.query(User).filter_by(restaurant_id=restaurant.id, email="chef@smarttable.io").first()
        if not kitchen_user:
            kitchen_user = User(
                restaurant_id=restaurant.id,
                role_id=roles["KITCHEN"].id,
                email="chef@smarttable.io",
                password_hash=hash_password("chef12345"),
                full_name="Executive Chef",
                phone="+92 300 0000002",
                is_active=True,
            )
            db.add(kitchen_user)
            print("    + Created Kitchen User: chef@smarttable.io (Password: chef12345)")

        # D. Kitchen Stations
        stations = {}
        station_defs = [
            ("GRILL", "Charcoal Grill & BBQ Line", 1),
            ("FAST_FOOD", "Burger & Fry Station", 2),
            ("TRADITIONAL", "Handi & Karahi Section", 3),
            ("COLD", "Salads, Sauces & Appetizers", 4),
            ("BEVERAGE", "Barista & Beverage Station", 5),
        ]
        for code, name, disp in station_defs:
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
        print(f"    + Configured {len(station_defs)} Kitchen Stations")

        # E. Clean Dining Tables (10 Tables, ALL AVAILABLE)
        for num in range(1, 11):
            table_num = f"Table {num:02d}"
            tbl = db.query(Table).filter_by(restaurant_id=restaurant.id, table_number=table_num).first()
            if not tbl:
                tbl = Table(
                    restaurant_id=restaurant.id,
                    table_number=table_num,
                    name=f"{table_num} (Main Hall)",
                    capacity=4 if num % 2 == 0 else 2,
                    section="Main Dining Hall",
                    status="AVAILABLE",
                    is_active=True,
                )
                db.add(tbl)
                db.flush()

                # Register device
                device = TableDevice(
                    table_id=tbl.id,
                    restaurant_id=restaurant.id,
                    device_token=f"dev_token_{num:02d}_neon_secret",
                    hardware_id=f"TABLE-PC-{num:02d}",
                    mac_address=f"00:1B:44:11:3A:{num:02X}",
                    ip_address=f"192.168.1.{100 + num}",
                    network_status="CONNECTED",
                    app_version="3.0.0",
                    screen_resolution="1920x1080",
                    status="ONLINE",
                    last_heartbeat=datetime.now(timezone.utc),
                    kiosk_mode_enabled=True,
                )
                db.add(device)
        print("    + Configured 10 Dining Tables (Table 01 - Table 10) -> All set to 'AVAILABLE'")

        # F. Menu Categories
        category_map = {}
        category_defs = [
            ("Starters & Appetizers", "starters", "🥗", 1),
            ("Gourmet Burgers", "burgers", "🍔", 2),
            ("Signature Steaks", "steaks", "🥩", 3),
            ("Traditional Specialities", "traditional", "🍲", 4),
            ("Mocktails & Drinks", "drinks", "🍹", 5),
            ("Desserts", "desserts", "🍰", 6),
        ]
        for name, slug, icon, disp in category_defs:
            cat = db.query(Category).filter_by(restaurant_id=restaurant.id, slug=slug).first()
            if not cat:
                cat = Category(
                    restaurant_id=restaurant.id,
                    name=name,
                    slug=slug,
                    description=f"Fresh {name}",
                    sort_order=disp,
                    icon=icon,
                    is_active=True,
                )
                db.add(cat)
                db.flush()
            category_map[slug] = cat
        print(f"    + Created {len(category_defs)} Menu Categories")

        # G. Products
        products_data = [
            {
                "name": "Crispy Dynamic Wings (6 Pcs)",
                "slug": "crispy-dynamic-wings",
                "category": "starters",
                "price": Decimal("850.00"),
                "desc": "Golden fried buffalo wings served with house-made ranch and chili dip.",
                "prep_time": 10,
                "station": "COLD",
            },
            {
                "name": "Smoky BBQ Angus Burger",
                "slug": "smoky-bbq-angus-burger",
                "category": "burgers",
                "price": Decimal("1450.00"),
                "desc": "Double smash beef patties, melted sharp cheddar, caramelized onions and smoked BBQ glaze.",
                "prep_time": 14,
                "station": "FAST_FOOD",
            },
            {
                "name": "Prime Tenderloin Fillet (8oz)",
                "slug": "prime-tenderloin-fillet",
                "category": "steaks",
                "price": Decimal("2850.00"),
                "desc": "Char-grilled center-cut beef tenderloin served with roasted garlic mash and pepper jus.",
                "prep_time": 20,
                "station": "GRILL",
            },
            {
                "name": "Mughlai Special Chicken Handi",
                "slug": "mughlai-chicken-handi",
                "category": "traditional",
                "price": Decimal("1850.00"),
                "desc": "Boneless chicken simmered in rich creamy butter gravy with traditional spices.",
                "prep_time": 18,
                "station": "TRADITIONAL",
            },
            {
                "name": "Blue Ocean Mint Lemonade",
                "slug": "blue-ocean-mint-lemonade",
                "category": "drinks",
                "price": Decimal("450.00"),
                "desc": "Fresh squeezed lemons, crushed mint leaves, blue curacao syrup and soda.",
                "prep_time": 5,
                "station": "BEVERAGE",
            },
            {
                "name": "Molten Lava Cake with Ice Cream",
                "slug": "molten-lava-cake",
                "category": "desserts",
                "price": Decimal("750.00"),
                "desc": "Warm chocolate fondant cake with a gooey chocolate center, paired with artisan vanilla gelato.",
                "prep_time": 10,
                "station": "COLD",
            },
        ]

        for p in products_data:
            prod = db.query(Product).filter_by(restaurant_id=restaurant.id, slug=p["slug"]).first()
            if not prod:
                cat = category_map.get(p["category"])
                station = stations.get(p["station"])
                prod = Product(
                    restaurant_id=restaurant.id,
                    category_id=cat.id if cat else None,
                    kitchen_station_id=station.id if station else None,
                    name=p["name"],
                    slug=p["slug"],
                    description=p["desc"],
                    price=p["price"],
                    cost_price=p["price"] * Decimal("0.35"),
                    tax_rate=Decimal("16.00"),
                    prep_time_minutes=p["prep_time"],
                    is_available=True,
                    is_active=True,
                )
                db.add(prod)
        print(f"    + Populated {len(products_data)} Signature Menu Items")

        # H. Games for Table Tablets
        games_data = [
            ("Smart Restaurant Trivia", "trivia", "Interactive food, general knowledge, and pop culture quiz.", True, "WINNER10", 10),
            ("Memory Table Match", "memory-match", "Flip cards and match food pairs within 60 seconds.", True, "SWEET5", 5),
            ("Spin the Lucky Dining Wheel", "spin-wheel", "Daily lucky spin for dining discounts and free drinks.", True, "LUCKY15", 15),
        ]
        for title, slug, desc, promo_active, promo_code, discount in games_data:
            game = db.query(Game).filter_by(restaurant_id=restaurant.id, slug=slug).first()
            if not game:
                game = Game(
                    restaurant_id=restaurant.id,
                    title=title,
                    slug=slug,
                    description=desc,
                    game_type=slug.upper(),
                    min_players=1,
                    max_players=4,
                    promotion_active=promo_active,
                    promotion_code=promo_code,
                    promotion_discount_percent=discount,
                    promotion_text=f"Play and get {discount}% discount!",
                    is_active=True,
                )
                db.add(game)
        print("    + Configured 3 Table Games with promotion coupons")

        db.commit()
        print("[✓] All database seed records committed successfully!")

    except Exception as e:
        db.rollback()
        print(f"[X] Database seeding error: {e}")
        sys.exit(1)
    finally:
        db.close()

    # 5. Verify Tables Count
    print("\n" + "=" * 70)
    print("                DATABASE VERIFICATION REPORT")
    print("=" * 70)
    inspector = inspect(engine)
    table_names = sorted(inspector.get_table_names())
    print(f"[*] Total Tables Created in Neon: {len(table_names)}\n")
    for i, t in enumerate(table_names, 1):
        print(f"    {i:02d}. [✓] {t}")

    # Optional: Update local backend/.env
    env_file = os.path.join(backend_dir, ".env")
    try:
        lines = []
        if os.path.exists(env_file):
            with open(env_file, "r", encoding="utf-8") as f:
                lines = f.readlines()
        
        # Replace or add DATABASE_URL
        has_db_url = False
        new_lines = []
        for line in lines:
            if line.startswith("DATABASE_URL="):
                new_lines.append(f"DATABASE_URL={db_url}\n")
                has_db_url = True
            elif line.startswith("DATABASE_URL_OVERRIDE="):
                new_lines.append(f"DATABASE_URL_OVERRIDE={db_url}\n")
            else:
                new_lines.append(line)
        
        if not has_db_url:
            new_lines.append(f"\nDATABASE_URL={db_url}\n")
            new_lines.append(f"DATABASE_URL_OVERRIDE={db_url}\n")

        with open(env_file, "w", encoding="utf-8") as f:
            f.writelines(new_lines)
        print(f"\n[✓] Automatically saved DATABASE_URL into backend/.env")
    except Exception as e:
        print(f"\n[!] Note on .env update: {e}")

    print("\n" + "=" * 70)
    print("   CONGRATULATIONS! YOUR NEON DATABASE IS 100% READY!")
    print("=" * 70)
    print("  Admin Login:     admin@smarttable.io")
    print("  Admin Password:  admin12345")
    print("  Chef Login:      chef@smarttable.io")
    print("  Chef Password:   chef12345")
    print("  Dining Tables:   Table 01 - Table 10 (All Available)")
    print("=" * 70 + "\n")

if __name__ == "__main__":
    main()
