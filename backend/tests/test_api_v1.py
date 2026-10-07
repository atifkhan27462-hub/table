import pytest
from decimal import Decimal
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


@pytest.fixture(scope="module")
def admin_token():
    """Authenticates admin and returns valid JWT token."""
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@smarttable.io", "password": "admin12345"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    return data["data"]["access_token"]


def test_auth_login_success():
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@smarttable.io", "password": "admin12345"},
    )
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    assert "access_token" in res["data"]
    assert res["data"]["user"]["email"] == "admin@smarttable.io"


def test_auth_login_invalid_password():
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@smarttable.io", "password": "wrong_password_99"},
    )
    assert response.status_code == 401
    res = response.json()
    assert res["success"] is False
    assert res["error"]["code"] == "AUTHENTICATION_FAILED"


def test_auth_device_pair():
    response = client.post(
        "/api/v1/auth/device-pair",
        json={
            "hardware_id": "MINIPC-SN-90004",
            "device_token": "dev_token_04_secret_abc123",
            "screen_resolution": "1920x1080",
            "app_version": "2.4.0",
        },
    )
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    assert res["data"]["table_number"] == "Table 04"
    assert "access_token" in res["data"]


def test_auth_get_me(admin_token):
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    assert res["data"]["email"] == "admin@smarttable.io"


def test_restaurant_current():
    response = client.get("/api/v1/restaurants/current")
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    assert res["data"]["name"] == "The Luminary Dining & Bistro"
    assert res["data"]["currency"] == "USD"


def test_users_and_roles(admin_token):
    # Roles
    res_roles = client.get(
        "/api/v1/roles",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_roles.status_code == 200
    assert len(res_roles.json()["data"]) >= 5

    # Users
    res_users = client.get(
        "/api/v1/users",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_users.status_code == 200
    assert len(res_users.json()["data"]) >= 2


def test_tables_listing_and_status(admin_token):
    # List tables
    response = client.get("/api/v1/tables")
    assert response.status_code == 200
    tables = response.json()["data"]
    assert len(tables) >= 16

    table_1 = next(t for t in tables if t["table_number"] == "Table 01")

    # Update status
    res_status = client.patch(
        f"/api/v1/tables/{table_1['id']}/status?status=CLEANING",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_status.status_code == 200
    assert res_status.json()["data"]["status"] == "CLEANING"

    # Revert to AVAILABLE
    client.patch(
        f"/api/v1/tables/{table_1['id']}/status?status=AVAILABLE",
        headers={"Authorization": f"Bearer {admin_token}"},
    )


def test_table_sessions_lifecycle(admin_token):
    # Fetch Table 02
    tbls = client.get("/api/v1/tables").json()["data"]
    table_2 = next(t for t in tbls if t["table_number"] == "Table 02")

    headers = {"Authorization": f"Bearer {admin_token}"}

    # Open session (authorized)
    open_res = client.post(
        "/api/v1/sessions/open",
        json={"table_id": table_2["id"], "guest_count": 4, "notes": "VIP anniversary"},
        headers=headers,
    )
    assert open_res.status_code == 200
    session_data = open_res.json()["data"]
    assert session_data["status"] == "ACTIVE"
    assert session_data["guest_count"] == 4

    # Close session (authorized)
    close_res = client.post(
        f"/api/v1/sessions/{session_data['id']}/close",
        json={"notes": "Completed successfully"},
        headers=headers,
    )
    assert close_res.status_code == 200
    assert close_res.json()["data"]["status"] == "COMPLETED"


def test_menu_catalog_full():
    response = client.get("/api/v1/menu")
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    catalog = res["data"]
    assert len(catalog["categories"]) >= 5

    # Check products inside category
    steak_cat = next(c for c in catalog["categories"] if c["slug"] == "steaks")
    assert len(steak_cat["products"]) >= 1
    ribeye = steak_cat["products"][0]
    assert ribeye["slug"] == "prime-dry-aged-ribeye"
    assert len(ribeye["options"]) >= 2


def test_categories_and_products(admin_token):
    res_cat = client.get("/api/v1/categories")
    assert res_cat.status_code == 200
    assert len(res_cat.json()["data"]) >= 5

    res_prod = client.get("/api/v1/products")
    assert res_prod.status_code == 200
    products = res_prod.json()["data"]
    assert len(products) >= 4

    ribeye = next(p for p in products if p["slug"] == "prime-dry-aged-ribeye")

    # Stock toggle
    res_stock = client.patch(
        f"/api/v1/products/{ribeye['id']}/stock?stock_status=OUT_OF_STOCK",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_stock.status_code == 200
    assert res_stock.json()["data"]["stock_status"] == "OUT_OF_STOCK"

    # Restore stock
    client.patch(
        f"/api/v1/products/{ribeye['id']}/stock?stock_status=IN_STOCK",
        headers={"Authorization": f"Bearer {admin_token}"},
    )


def test_order_creation_and_lifecycle():
    # Fetch Table 01 and Ribeye
    tbls = client.get("/api/v1/tables").json()["data"]
    table_1 = next(t for t in tbls if t["table_number"] == "Table 01")

    prods = client.get("/api/v1/products").json()["data"]
    ribeye = next(p for p in prods if p["slug"] == "prime-dry-aged-ribeye")

    # Place order
    payload = {
        "table_id": table_1["id"],
        "items": [
            {
                "product_id": ribeye["id"],
                "quantity": 1,
                "notes": "Rare please",
                "options": [
                    {
                        "option_name": "Meat Doneness",
                        "value_name": "Rare",
                        "price_modifier": 0.0,
                    }
                ],
            }
        ],
        "special_instructions": "Table 01 anniversary",
        "tip_amount": 10.00,
    }
    res_order = client.post("/api/v1/orders", json=payload)
    assert res_order.status_code == 200
    order_data = res_order.json()["data"]
    assert order_data["status"] == "PENDING"
    assert Decimal(str(order_data["subtotal"])) == Decimal("58.00")
    assert Decimal(str(order_data["tip_amount"])) == Decimal("10.00")

    # Update status
    res_status = client.patch(
        f"/api/v1/orders/{order_data['id']}/status",
        json={"status": "PREPARING"},
    )
    assert res_status.status_code == 200
    assert res_status.json()["data"]["status"] == "PREPARING"

    # Payment settlement
    res_pay = client.post(
        "/api/v1/payments",
        json={
            "order_id": order_data["id"],
            "payment_method": "CREDIT_CARD",
            "amount": float(order_data["total_amount"]),
            "tip_amount": 10.00,
            "transaction_reference": "TEST_CARD_AUTH_123",
        },
    )
    assert res_pay.status_code == 200
    assert res_pay.json()["data"]["status"] == "COMPLETED"


def test_kitchen_kds_tickets_and_bumping():
    res = client.get("/api/v1/kitchen/orders")
    assert res.status_code == 200
    tickets = res.json()["data"]
    assert len(tickets) >= 1

    first_ticket = tickets[0]
    bump_res = client.patch(
        f"/api/v1/kitchen/orders/{first_ticket['id']}/bump",
        json={"status": "READY"},
    )
    assert bump_res.status_code == 200
    assert bump_res.json()["data"]["status"] == "READY"


def test_ai_sommelier_generation():
    res = client.post(
        "/api/v1/ai/generate",
        json={
            "prompt": "What wine goes best with a wood-fired dry-aged ribeye?",
            "generation_type": "SOMMELIER_PAIRING",
        },
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert "Cabernet Sauvignon" in data["result_content"]
    assert data["model_name"] == "gemini-1.5-flash"


def test_interactive_games_catalog():
    res = client.get("/api/v1/games")
    assert res.status_code == 200
    games = res.json()["data"]
    assert len(games) >= 3
    assert any(g["slug"] == "air-hockey-touch" for g in games)


def test_analytics_and_reports(admin_token):
    # Analytics Dashboard
    res_analytics = client.get(
        "/api/v1/analytics/dashboard",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_analytics.status_code == 200
    data = res_analytics.json()["data"]
    assert "total_revenue_today" in data
    assert len(data["popular_dishes"]) > 0

    # Daily Report
    res_report = client.get(
        "/api/v1/reports/daily",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_report.status_code == 200
    rep = res_report.json()["data"]
    assert "report_date" in rep

    # Audit Logs
    res_audit = client.get(
        "/api/v1/audit/logs",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_audit.status_code == 200
