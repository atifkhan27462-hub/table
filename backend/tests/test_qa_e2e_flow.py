import pytest
from decimal import Decimal
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_complete_end_to_end_customer_dining_lifecycle():
    """
    COMPLETE END-TO-END QA TEST:
    Welcome → Menu → Product → Cart → Order → Kitchen → Ready → Completed

    Simulates the entire operational lifecycle from physical smart table boot-up
    to customer checkout and table turnover.
    """
    # =========================================================================
    # STEP 1: WELCOME & DEVICE HANDSHAKE
    # =========================================================================
    device_pair_res = client.post(
        "/api/v1/auth/device-pair",
        json={
            "hardware_id": "MINIPC-SN-90004",
            "device_token": "dev_token_04_secret_abc123",
            "screen_resolution": "1920x1080",
            "app_version": "2.4.0",
        },
    )
    assert device_pair_res.status_code == 200
    device_data = device_pair_res.json()["data"]
    assert device_data["table_number"] == "Table 04"
    table_id = device_data["table_id"]
    device_token = device_data["access_token"]
    device_headers = {"Authorization": f"Bearer {device_token}"}

    # =========================================================================
    # STEP 2: OPEN DINING SESSION
    # =========================================================================
    session_res = client.post(
        "/api/v1/sessions/open",
        json={"table_id": table_id, "guest_count": 2, "notes": "Anniversary Dinner"},
        headers=device_headers,
    )
    assert session_res.status_code == 200
    session = session_res.json()["data"]
    session_id = session["id"]
    assert session["status"] == "ACTIVE"

    # =========================================================================
    # STEP 3: BROWSE MENU CATALOG
    # =========================================================================
    menu_res = client.get("/api/v1/menu")
    assert menu_res.status_code == 200
    catalog = menu_res.json()["data"]
    assert len(catalog["categories"]) >= 3
    steaks_cat = next(c for c in catalog["categories"] if c["slug"] == "steaks")
    assert len(steaks_cat["products"]) >= 1

    # =========================================================================
    # STEP 4: SELECT PRODUCT & CONFIGURE MODIFIERS
    # =========================================================================
    product = steaks_cat["products"][0]
    product_id = product["id"]
    product_detail_res = client.get(f"/api/v1/products/{product_id}")
    assert product_detail_res.status_code == 200
    product_detail = product_detail_res.json()["data"]
    assert product_detail["is_available"] is True

    # =========================================================================
    # STEP 5: CART & BACKEND PRICING CALCULATION
    # =========================================================================
    calc_res = client.post(
        "/api/v1/orders/calculate",
        json={
            "table_id": table_id,
            "items": [
                {
                    "product_id": product_id,
                    "quantity": 2,
                    "notes": "Medium-rare, extra crust",
                    "options": [],
                }
            ],
            "tip_amount": 18.00,
        },
    )
    assert calc_res.status_code == 200
    calc = calc_res.json()["data"]
    assert calc["item_count"] == 2
    assert float(calc["subtotal"]) > 0
    assert float(calc["total_amount"]) > float(calc["subtotal"])

    # =========================================================================
    # STEP 6: SUBMIT ORDER (WITH IDEMPOTENCY KEY)
    # =========================================================================
    import uuid
    idem_key = f"e2e_idem_{uuid.uuid4().hex[:12]}"
    order_res = client.post(
        "/api/v1/orders",
        json={
            "table_id": table_id,
            "items": [
                {
                    "product_id": product_id,
                    "quantity": 2,
                    "notes": "Medium-rare, extra crust",
                    "options": [],
                }
            ],
            "special_instructions": "Celebrating 10th anniversary",
            "tip_amount": 18.00,
            "idempotency_key": idem_key,
        },
    )
    assert order_res.status_code == 200
    order = order_res.json()["data"]
    order_id = order["id"]
    assert order["status"] == "PENDING"
    assert order["payment_status"] in ["UNPAID", "PENDING"]

    # =========================================================================
    # STEP 7: KITCHEN DISPLAY SYSTEM (KDS) RECEIVES TICKET
    # =========================================================================
    kds_orders_res = client.get("/api/v1/kitchen/orders")
    assert kds_orders_res.status_code == 200
    tickets = kds_orders_res.json()["data"]
    order_ticket = next((t for t in tickets if t["order_id"] == order_id), None)
    assert order_ticket is not None
    ticket_id = order_ticket["id"]

    # =========================================================================
    # STEP 8: KITCHEN BUMPS TO IN_PREP
    # =========================================================================
    prep_res = client.patch(
        f"/api/v1/kitchen/orders/{ticket_id}/bump",
        json={"status": "IN_PREP"},
    )
    assert prep_res.status_code == 200
    assert prep_res.json()["data"]["status"] == "IN_PREP"

    # =========================================================================
    # STEP 9: KITCHEN BUMPS TO READY
    # =========================================================================
    ready_res = client.patch(
        f"/api/v1/kitchen/orders/{ticket_id}/bump",
        json={"status": "READY"},
    )
    assert ready_res.status_code == 200
    assert ready_res.json()["data"]["status"] == "READY"

    # Check order status is now READY
    check_ready_res = client.get(f"/api/v1/orders/{order_id}")
    assert check_ready_res.json()["data"]["status"] == "READY"

    # =========================================================================
    # STEP 10: WAITER SERVES ORDER (SERVED)
    # =========================================================================
    served_res = client.patch(
        f"/api/v1/orders/{order_id}/status",
        json={"status": "SERVED"},
    )
    assert served_res.status_code == 200
    assert served_res.json()["data"]["status"] == "SERVED"

    # =========================================================================
    # STEP 11: PAYMENT SETTLEMENT
    # =========================================================================
    total_due = Decimal(str(order["total_amount"]))
    payment_res = client.post(
        "/api/v1/payments",
        json={
            "order_id": order_id,
            "payment_method": "CREDIT_CARD",
            "amount": float(total_due),
            "tip_amount": 18.00,
            "transaction_reference": "TXN_E2E_QA_SUCCESS_9918",
        },
    )
    assert payment_res.status_code == 200
    payment_data = payment_res.json()["data"]
    assert payment_data["status"] == "COMPLETED"

    # Order payment_status must now be PAID and overall status COMPLETED
    completed_order_res = client.get(f"/api/v1/orders/{order_id}")
    final_order = completed_order_res.json()["data"]
    assert final_order["payment_status"] == "PAID"
    assert final_order["status"] in ["SERVED", "COMPLETED"]

    # =========================================================================
    # STEP 12: CLOSE DINING SESSION (TABLE TURNOVER)
    # =========================================================================
    close_session_res = client.post(
        f"/api/v1/sessions/{session_id}/close",
        json={"notes": "Excellent dining experience. Paid and left."},
        headers=device_headers,
    )
    assert close_session_res.status_code == 200
    closed_session = close_session_res.json()["data"]
    assert closed_session["status"] == "COMPLETED"

    # Verify Table is now AVAILABLE again for the next diner
    table_status_res = client.get(f"/api/v1/tables")
    tables_list = table_status_res.json()["data"]
    table_04 = next(t for t in tables_list if t["id"] == table_id)
    assert table_04["status"] == "AVAILABLE"
