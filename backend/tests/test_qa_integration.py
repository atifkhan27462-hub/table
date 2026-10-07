import pytest
from decimal import Decimal
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


@pytest.fixture(scope="module")
def admin_headers():
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@smarttable.io", "password": "admin12345"},
    )
    token = res.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ============================================================================
# 1. FRONTEND → API CONTRACT INTEGRATION TESTS
# ============================================================================

def test_frontend_api_response_envelope_contract():
    """
    INTEGRATION TEST: Frontend → API Contract
    Verifies that all API responses strictly adhere to the standard ApiResponse envelope:
    { "success": bool, "data": Any, "message": str | None, "error": dict | None }
    """
    res = client.get("/api/v1/tables")
    assert res.status_code == 200
    body = res.json()
    assert "success" in body
    assert "data" in body
    assert body["success"] is True
    assert isinstance(body["data"], list)

    # Correlation and Timing headers
    assert "X-Request-ID" in res.headers
    assert "X-Response-Time" in res.headers


def test_frontend_api_error_contract():
    """
    INTEGRATION TEST: Frontend Error Contract
    Verifies error responses return standardized format parseable by frontend fetch client:
    { "success": False, "error": { "code": str, "message": str, "details": dict | None } }
    """
    res = client.get("/api/v1/tables/non-existent-table-uuid-12345")
    assert res.status_code == 404
    body = res.json()
    assert body["success"] is False
    assert "error" in body
    assert body["error"]["code"] == "ENTITY_NOT_FOUND"
    assert "message" in body["error"]


# ============================================================================
# 2. API → DATABASE PERSISTENCE INTEGRATION TESTS
# ============================================================================

def test_api_database_relational_order_persistence():
    """
    INTEGRATION TEST: API → Database
    Verifies that creating an order persists all normalized relational models:
    Order -> OrderItems -> OrderItemOptions, and that fetching returns the complete hierarchy.
    """
    tables = client.get("/api/v1/tables").json()["data"]
    table_id = tables[0]["id"]
    products = client.get("/api/v1/products").json()["data"]
    product = products[0]

    payload = {
        "table_id": table_id,
        "items": [
            {
                "product_id": product["id"],
                "quantity": 2,
                "notes": "No garlic, extra rosemary",
                "options": [
                    {
                        "option_name": "Preparation",
                        "value_name": "Medium Rare",
                        "price_modifier": 0.00,
                    }
                ],
            }
        ],
        "special_instructions": "VIP Anniversary Table",
        "tip_amount": 20.00,
    }

    create_res = client.post("/api/v1/orders", json=payload)
    assert create_res.status_code == 200
    order_data = create_res.json()["data"]
    order_id = order_data["id"]

    # Verify retrieval preserves all relational children
    get_res = client.get(f"/api/v1/orders/{order_id}")
    assert get_res.status_code == 200
    fetched = get_res.json()["data"]
    assert fetched["id"] == order_id
    assert len(fetched["items"]) == 1
    assert fetched["items"][0]["quantity"] == 2
    assert fetched["items"][0]["notes"] == "No garlic, extra rosemary"
    assert len(fetched["items"][0]["options"]) == 1
    assert fetched["items"][0]["options"][0]["value_name"] == "Medium Rare"


# ============================================================================
# 3. API → KDS (KITCHEN DISPLAY SYSTEM) INTEGRATION TESTS
# ============================================================================

def test_api_kds_ticket_creation_and_bump_lifecycle():
    """
    INTEGRATION TEST: API → KDS
    Verifies that placing an order automatically routes a ticket to the Kitchen Display System,
    and bumping the KDS ticket reflects on both ticket status and order status.
    """
    tables = client.get("/api/v1/tables").json()["data"]
    table_id = tables[1]["id"]
    products = client.get("/api/v1/products").json()["data"]
    product = products[0]

    # 1. Place order
    order_res = client.post(
        "/api/v1/orders",
        json={"table_id": table_id, "items": [{"product_id": product["id"], "quantity": 1, "options": []}]},
    )
    order_id = order_res.json()["data"]["id"]

    # 2. Check that KDS received tickets
    kds_res = client.get("/api/v1/kitchen/orders")
    assert kds_res.status_code == 200
    tickets = kds_res.json()["data"]
    target_ticket = next((t for t in tickets if t["order_id"] == order_id), None)
    assert target_ticket is not None
    assert target_ticket["status"] in ["QUEUED", "IN_PREP"]

    # 3. Bump ticket to READY
    bump_res = client.patch(
        f"/api/v1/kitchen/orders/{target_ticket['id']}/bump",
        json={"status": "READY"},
    )
    assert bump_res.status_code == 200
    assert bump_res.json()["data"]["status"] == "READY"

    # 4. Verify parent order transitioned to READY
    parent_order_res = client.get(f"/api/v1/orders/{order_id}")
    assert parent_order_res.json()["data"]["status"] == "READY"


# ============================================================================
# 4. API → AI ENGINE INTEGRATION TESTS
# ============================================================================

def test_api_ai_engine_integration_and_telemetry(admin_headers):
    """
    INTEGRATION TEST: API → AI
    Verifies the end-to-end integration:
    Prompt Manager -> AI Provider -> Safety Validator -> Output Sanitizer -> DB Telemetry
    """
    # 1. Request culinary sommelier recommendation
    sommelier_payload = {
        "prompt": "Recommend a bold red wine pairing for Prime Dry-Aged Ribeye",
        "generation_type": "SOMMELIER_PAIRING",
    }
    gen_res = client.post("/api/v1/ai/generate", json=sommelier_payload)
    assert gen_res.status_code == 200
    gen_data = gen_res.json()["data"]
    assert gen_data["generation_type"] == "SOMMELIER_PAIRING"
    assert len(gen_data["result_content"]) > 0
    assert gen_data["tokens_used"] > 0
    assert gen_data["latency_ms"] >= 0

    # 2. Verify generation was recorded in database usage telemetry
    usage_res = client.get("/api/v1/ai/usage", headers=admin_headers)
    assert usage_res.status_code == 200
    usage = usage_res.json()["data"]
    assert usage["total_generations"] >= 1
    assert "SOMMELIER_PAIRING" in usage["generations_by_type"]
