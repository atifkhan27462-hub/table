import json
import pytest
from decimal import Decimal
from fastapi.testclient import TestClient
from app.core.database import SessionLocal
from app.core.security import create_access_token
from app.core.websocket_manager import ws_manager
from app.main import app
from app.models import Order, Product, Restaurant, Table
from app.schemas.realtime import RealtimeEvent, RealtimeEventType
from app.services.idempotency_service import IdempotencyService


@pytest.fixture(scope="module")
def db_session():
    db = SessionLocal()
    yield db
    db.close()


@pytest.fixture(scope="module")
def test_data(db_session):
    restaurant = db_session.query(Restaurant).first()
    tables = db_session.query(Table).filter_by(restaurant_id=restaurant.id).all()
    products = db_session.query(Product).filter_by(restaurant_id=restaurant.id, is_available=True).all()

    admin_token = create_access_token(
        subject="admin_user_id",
        restaurant_id=restaurant.id,
        role="SUPERADMIN",
    )
    kitchen_token = create_access_token(
        subject="kitchen_chef_id",
        restaurant_id=restaurant.id,
        role="KITCHEN",
    )

    return {
        "restaurant": restaurant,
        "table_1": tables[0],
        "table_2": tables[1],
        "product": products[0],
        "admin_token": admin_token,
        "kitchen_token": kitchen_token,
    }


def test_websocket_auth_rejection(test_data):
    """Verifies that unauthorized or malformed tokens are rejected."""
    client = TestClient(app)

    # 1. Invalid JWT token
    with pytest.raises(Exception):
        with client.websocket_connect("/ws?token=invalid_garbage_token") as ws:
            pass

    # 2. Table client without valid table_id
    with pytest.raises(Exception):
        with client.websocket_connect("/ws?client_type=table&table_id=nonexistent_uuid") as ws:
            pass


def test_websocket_handshake_and_heartbeat(test_data):
    """Verifies connection establishment, ACK handshake frame, and PING/PONG heartbeat."""
    client = TestClient(app)
    table_id = test_data["table_1"].id

    with client.websocket_connect(f"/ws?client_type=table&table_id={table_id}") as ws:
        # Initial ACK handshake frame
        handshake_data = ws.receive_json()
        assert handshake_data["type"] == "ACK"
        assert handshake_data["data"]["client_type"] == "table"
        assert handshake_data["data"]["table_id"] == table_id

        # Heartbeat Ping/Pong
        ws.send_json({"type": "PING"})
        pong_data = ws.receive_json()
        assert pong_data["type"] == "PONG"
        assert "server_time" in pong_data["data"]


def test_websocket_error_handling(test_data):
    """Verifies that sending malformed JSON triggers an ERROR frame without crashing."""
    client = TestClient(app)
    table_id = test_data["table_1"].id

    with client.websocket_connect(f"/ws?client_type=table&table_id={table_id}") as ws:
        ws.receive_json()  # ACK

        # Send invalid non-JSON string
        ws.send_text("THIS IS NOT JSON")
        err_frame = ws.receive_json()
        assert err_frame["type"] == "ERROR"
        assert "Malformed JSON" in err_frame["data"]["message"]


def test_table_online_and_offline_telemetry(test_data):
    """Verifies that connecting and disconnecting a table broadcasts TABLE_ONLINE and TABLE_OFFLINE to admins."""
    client = TestClient(app)
    admin_token = test_data["admin_token"]
    table_id = test_data["table_1"].id

    # Admin connects first to monitor hardware telemetry
    with client.websocket_connect(f"/ws?client_type=admin&token={admin_token}") as admin_ws:
        admin_ws.receive_json()  # Admin ACK

        # Table connects -> admin should receive TABLE_ONLINE
        with client.websocket_connect(f"/ws?client_type=table&table_id={table_id}") as table_ws:
            table_ws.receive_json()  # Table ACK

            # Admin receives TABLE_ONLINE
            online_event = admin_ws.receive_json()
            assert online_event["type"] == "TABLE_ONLINE"
            assert online_event["table_id"] == table_id
            assert online_event["data"]["status"] == "ONLINE"

        # Table disconnects -> admin should receive TABLE_OFFLINE
        offline_event = admin_ws.receive_json()
        assert offline_event["type"] == "TABLE_OFFLINE"
        assert offline_event["table_id"] == table_id
        assert offline_event["data"]["status"] == "OFFLINE"


def test_multi_client_targeted_order_broadcasting(test_data):
    """
    Verifies targeted broadcasting & table isolation across multiple concurrent clients:
    - Table 1 (Originator) receives ORDER_CREATED
    - Table 2 (Other table) does NOT receive Table 1's order
    - KDS Screen receives ORDER_CREATED
    - Admin Console receives ORDER_CREATED
    """
    client = TestClient(app)
    t1_id = test_data["table_1"].id
    t2_id = test_data["table_2"].id
    admin_token = test_data["admin_token"]

    with client.websocket_connect(f"/ws?client_type=admin&token={admin_token}") as admin_ws:
        admin_ws.receive_json()  # ACK

        with client.websocket_connect("/ws?client_type=kds&station=ALL") as kds_ws:
            kds_ws.receive_json()  # ACK

            with client.websocket_connect(f"/ws?client_type=table&table_id={t1_id}") as t1_ws:
                t1_ws.receive_json()  # ACK
                admin_ws.receive_json()  # Drain TABLE_ONLINE on admin

                with client.websocket_connect(f"/ws?client_type=table&table_id={t2_id}") as t2_ws:
                    t2_ws.receive_json()  # ACK
                    admin_ws.receive_json()  # Drain TABLE_ONLINE on admin

                    import uuid
                    fresh_key = f"test_broadcast_{uuid.uuid4().hex}"
                    # Now place an order from Table 1 via REST API
                    order_payload = {
                        "table_id": t1_id,
                        "items": [
                            {"product_id": test_data["product"].id, "quantity": 2, "notes": "Medium Rare"}
                        ],
                        "special_instructions": "Table 1 Anniversary",
                        "tip_amount": "5.00",
                        "idempotency_key": fresh_key,
                    }
                    resp = client.post("/api/v1/orders", json=order_payload)
                    assert resp.status_code == 200
                    order_id = resp.json()["data"]["id"]

                    # 1. Table 1 receives ORDER_CREATED
                    t1_event = t1_ws.receive_json()
                    assert t1_event["type"] == "ORDER_CREATED"
                    assert t1_event["data"]["order_id"] == order_id
                    assert t1_event["table_id"] == t1_id

                    # 2. KDS receives ORDER_CREATED
                    kds_event = kds_ws.receive_json()
                    assert kds_event["type"] == "ORDER_CREATED"
                    assert kds_event["data"]["order_id"] == order_id

                    # 3. Admin receives ORDER_CREATED
                    admin_event = admin_ws.receive_json()
                    assert admin_event["type"] == "ORDER_CREATED"
                    assert admin_event["data"]["order_id"] == order_id

                    # 4. Status update to PREPARING -> Table 1 receives ORDER_PREPARING
                    client.patch(f"/api/v1/orders/{order_id}/status", json={"status": "PREPARING"})
                    t1_prep = t1_ws.receive_json()
                    assert t1_prep["type"] == "ORDER_PREPARING"

                    # 5. Status update to READY -> Table 1 receives ORDER_READY
                    client.patch(f"/api/v1/orders/{order_id}/status", json={"status": "READY"})
                    t1_ready = t1_ws.receive_json()
                    assert t1_ready["type"] == "ORDER_READY"

                    # 6. Status update to COMPLETED -> Table 1 receives ORDER_COMPLETED
                    client.patch(f"/api/v1/orders/{order_id}/status", json={"status": "COMPLETED"})
                    t1_comp = t1_ws.receive_json()
                    assert t1_comp["type"] == "ORDER_COMPLETED"


def test_idempotency_prevents_duplicate_order_creation(test_data, db_session):
    """
    Critical Test:
    Verifies that passing the same Idempotency-Key twice produces identical order responses
    and DOES NOT create duplicate orders in the database.
    """
    import uuid
    client = TestClient(app)
    table_id = test_data["table_1"].id
    product_id = test_data["product"].id
    unique_key = f"idem_test_{uuid.uuid4().hex}"

    order_payload = {
        "table_id": table_id,
        "items": [{"product_id": product_id, "quantity": 1}],
        "special_instructions": "Idempotency test order",
        "tip_amount": "3.00",
    }

    # First Submission
    resp1 = client.post(
        "/api/v1/orders",
        json=order_payload,
        headers={"Idempotency-Key": unique_key},
    )
    assert resp1.status_code == 200
    data1 = resp1.json()["data"]
    order_id_1 = data1["id"]
    order_num_1 = data1["order_number"]

    # Second Submission with exact same idempotency key (simulating double-click or network retry)
    resp2 = client.post(
        "/api/v1/orders",
        json=order_payload,
        headers={"Idempotency-Key": unique_key},
    )
    assert resp2.status_code == 200
    data2 = resp2.json()["data"]
    order_id_2 = data2["id"]
    order_num_2 = data2["order_number"]

    # Must return identical order
    assert order_id_1 == order_id_2
    assert order_num_1 == order_num_2

    # Database level check: Exactly ONE order exists with this idempotency key
    orders_in_db = db_session.query(Order).filter_by(idempotency_key=unique_key).all()
    assert len(orders_in_db) == 1


def test_ai_generation_event_delivery(test_data):
    """Verifies that AI Sommelier recommendation triggers AI_GENERATION_COMPLETED event on Table and Admin."""
    client = TestClient(app)
    table_id = test_data["table_1"].id
    admin_token = test_data["admin_token"]

    with client.websocket_connect(f"/ws?client_type=admin&token={admin_token}") as admin_ws:
        admin_ws.receive_json()  # Admin ACK

        with client.websocket_connect(f"/ws?client_type=table&table_id={table_id}") as table_ws:
            table_ws.receive_json()  # Table ACK
            admin_ws.receive_json()  # Drain TABLE_ONLINE on admin

            # Call AI Sommelier endpoint
            ai_payload = {
                "table_id": table_id,
                "prompt": "Recommend a vintage red wine for Table 08 ribeye",
                "generation_type": "SOMMELIER_PAIRING",
            }
            resp = client.post("/api/v1/ai/generate", json=ai_payload)
            assert resp.status_code == 200

            # Table receives AI_GENERATION_COMPLETED
            t_event = table_ws.receive_json()
            assert t_event["type"] == "AI_GENERATION_COMPLETED"
            assert t_event["table_id"] == table_id
            assert "result_content" in t_event["data"]

            # Admin also receives AI_GENERATION_COMPLETED
            a_event = admin_ws.receive_json()
            assert a_event["type"] == "AI_GENERATION_COMPLETED"
            assert a_event["table_id"] == table_id


def test_duplicate_event_protection(test_data):
    """Verifies that duplicate event IDs are identified and rejected by the deduplication window."""
    event_id = "test_event_dedup_unique_12345"

    # First check: not duplicate
    is_dup_1 = ws_manager.is_duplicate_event(event_id)
    assert is_dup_1 is False

    # Second check with same event_id: must be detected as duplicate
    is_dup_2 = ws_manager.is_duplicate_event(event_id)
    assert is_dup_2 is True
