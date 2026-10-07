import hashlib
import pytest
from decimal import Decimal
from fastapi.testclient import TestClient

from app.core.security import hash_password, verify_password
from app.main import app

client = TestClient(app)


@pytest.fixture(scope="module")
def admin_token():
    """Authenticates admin user and yields valid JWT access token."""
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@smarttable.io", "password": "admin12345"},
    )
    assert res.status_code == 200
    return res.json()["data"]["access_token"]


def test_pbkdf2_password_hashing_and_timing_safety():
    """
    VULNERABILITY FIX VERIFICATION:
    Verifies that password hashing uses PBKDF2-HMAC-SHA256 with 100,000 rounds,
    a 16-byte random salt, and timing-safe comparison.
    """
    raw_pass = "SuperSecretSecureP@ssword2026!"
    hashed = hash_password(raw_pass)

    # 1. Verify standard PBKDF2 format
    assert hashed.startswith("pbkdf2_sha256$100000$")
    parts = hashed.split("$")
    assert len(parts) == 4
    salt = parts[2]
    dk = parts[3]
    assert len(salt) == 32  # 16 bytes in hex = 32 chars
    assert len(dk) == 64    # SHA256 hex digest = 64 chars

    # 2. Verify salt is unique across repeated hashes of identical password
    hashed_again = hash_password(raw_pass)
    assert hashed != hashed_again  # Rainbow table defense

    # 3. Verify correct and incorrect password verification
    assert verify_password(raw_pass, hashed) is True
    assert verify_password("WrongPassword123!", hashed) is False

    # 4. Verify backwards compatibility with legacy seed hash
    legacy_admin_hash = hashlib.sha256("admin12345".encode("utf-8")).hexdigest()
    assert verify_password("admin12345", legacy_admin_hash) is True
    assert verify_password("wrong_password", legacy_admin_hash) is False


def test_device_authentication_strictly_enforced():
    """
    VULNERABILITY FIX VERIFICATION:
    Verifies that device endpoints reject requests without valid X-Device-Token or Bearer token.
    Previously, get_table_device had a dangerous unauthenticated fallback to Table 1.
    """
    # 1. Device heartbeat without any credentials must return 401
    res_no_auth = client.post("/api/v1/devices/heartbeat", json={})
    assert res_no_auth.status_code == 401
    assert res_no_auth.json()["success"] is False

    # 2. Requesting with invalid device token must return 401
    res_bad_token = client.post(
        "/api/v1/devices/heartbeat",
        headers={"X-Device-Token": "completely_invalid_token_xyz"},
        json={},
    )
    assert res_bad_token.status_code == 401


def test_kiosk_emergency_pin_redaction_and_timing_safe_verification(admin_token):
    """
    VULNERABILITY FIX VERIFICATION:
    Verifies that emergency_unlock_pin is never leaked in plaintext over the API,
    and PIN verification uses dedicated timing-safe comparison.
    """
    # 1. Fetch devices list as admin
    res_devices = client.get(
        "/api/v1/devices",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_devices.status_code == 200
    devices = res_devices.json()["data"]
    assert len(devices) > 0
    device_id = devices[0]["id"]

    # 2. Query kiosk-policy
    res_policy = client.get(f"/api/v1/devices/{device_id}/kiosk-policy")
    assert res_policy.status_code == 200
    policy = res_policy.json()["data"]

    # CRITICAL: PIN must NOT be exposed in cleartext
    assert policy["emergency_unlock_pin"] == "[PROTECTED_PIN_VERIFY_VIA_API]"

    # 3. Test timing-safe PIN verification endpoint
    # Incorrect PIN
    res_verify_fail = client.post(
        f"/api/v1/devices/{device_id}/verify-kiosk-pin",
        json={"pin": "000000"},
    )
    assert res_verify_fail.status_code == 200
    assert res_verify_fail.json()["data"]["valid"] is False

    # Correct default PIN
    res_verify_success = client.post(
        f"/api/v1/devices/{device_id}/verify-kiosk-pin",
        json={"pin": "7788"},
    )
    assert res_verify_success.status_code == 200
    assert res_verify_success.json()["data"]["valid"] is True


def test_financial_integrity_prevents_underpayment():
    """
    VULNERABILITY FIX VERIFICATION:
    Verifies that client-side tampering cannot submit underpayments or negative amounts.
    """
    # 1. Place a new order
    tables = client.get("/api/v1/tables").json()["data"]
    table_id = tables[0]["id"]
    products = client.get("/api/v1/products").json()["data"]
    product_id = products[0]["id"]

    order_res = client.post(
        "/api/v1/orders",
        json={
            "table_id": table_id,
            "items": [{"product_id": product_id, "quantity": 2, "options": []}],
        },
    )
    assert order_res.status_code == 200
    order_data = order_res.json()["data"]
    order_id = order_data["id"]
    total_amount = Decimal(str(order_data["total_amount"]))
    assert total_amount > 0

    # 2. Attempt underpayment: send 1 cent
    underpay_res = client.post(
        "/api/v1/payments",
        json={
            "order_id": order_id,
            "payment_method": "CREDIT_CARD",
            "amount": 0.01,
            "tip_amount": 0.00,
        },
    )
    assert underpay_res.status_code == 422
    assert "Insufficient payment" in underpay_res.json()["error"]["message"]

    # 3. Attempt negative or zero amount (rejected by schema bounds)
    zero_pay_res = client.post(
        "/api/v1/payments",
        json={
            "order_id": order_id,
            "payment_method": "CREDIT_CARD",
            "amount": 0.00,
            "tip_amount": 0.00,
        },
    )
    assert zero_pay_res.status_code == 422


def test_payment_history_rbac_enforcement(admin_token):
    """
    VULNERABILITY FIX VERIFICATION:
    Verifies that GET /api/v1/payments requires SUPER_ADMIN, RESTAURANT_ADMIN, or MANAGER.
    """
    # 1. Unauthenticated request must fail
    res_no_auth = client.get("/api/v1/payments")
    assert res_no_auth.status_code == 401

    # 2. Admin request succeeds
    res_admin = client.get(
        "/api/v1/payments",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_admin.status_code == 200
    assert res_admin.json()["success"] is True


def test_table_status_mutation_rbac_enforcement(admin_token):
    """
    VULNERABILITY FIX VERIFICATION:
    Verifies PATCH /api/v1/tables/{id}/status cannot be modified anonymously.
    """
    tables = client.get("/api/v1/tables").json()["data"]
    table_id = tables[0]["id"]

    # 1. Anonymous mutation rejected
    res_unauth = client.patch(
        f"/api/v1/tables/{table_id}/status",
        params={"status": "MAINTENANCE"},
    )
    assert res_unauth.status_code == 401

    # 2. Admin mutation succeeds
    res_auth = client.patch(
        f"/api/v1/tables/{table_id}/status",
        params={"status": "AVAILABLE"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_auth.status_code == 200


def test_http_security_hardening_headers():
    """
    VULNERABILITY FIX VERIFICATION:
    Verifies that all HTTP responses include critical defense-in-depth security headers:
    - X-Content-Type-Options: nosniff
    - X-Frame-Options: DENY
    - X-XSS-Protection: 1; mode=block
    - Referrer-Policy: strict-origin-when-cross-origin
    - Permissions-Policy
    - Content-Security-Policy
    """
    res = client.get("/api/v1/tables")
    assert res.status_code == 200

    headers = res.headers
    assert headers.get("X-Content-Type-Options") == "nosniff"
    assert headers.get("X-Frame-Options") == "DENY"
    assert "1; mode=block" in headers.get("X-XSS-Protection", "")
    assert headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
    assert "default-src 'self'" in headers.get("Content-Security-Policy", "")
    assert "geolocation=()" in headers.get("Permissions-Policy", "")
    assert "X-Request-ID" in headers
    assert "X-Response-Time" in headers


def test_dining_session_endpoints_rbac(admin_token):
    """
    VULNERABILITY FIX VERIFICATION:
    Verifies that dining session listing and closing cannot be called anonymously.
    """
    # 1. Anonymous list_sessions rejected
    res_list_unauth = client.get("/api/v1/sessions")
    assert res_list_unauth.status_code == 401

    # 2. Admin list_sessions succeeds
    res_list_admin = client.get(
        "/api/v1/sessions",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_list_admin.status_code == 200

    # 3. Anonymous close_session rejected
    res_close_unauth = client.post("/api/v1/sessions/fake-session-id/close")
    assert res_close_unauth.status_code == 401


def test_game_admin_endpoints_rbac(admin_token):
    """
    VULNERABILITY FIX VERIFICATION:
    Verifies that administrative game endpoints require manager/admin roles.
    """
    # 1. Anonymous GET /games/admin rejected
    res_unauth_admin = client.get("/api/v1/games/admin")
    assert res_unauth_admin.status_code == 401

    # 2. Anonymous PATCH /games/{id} rejected
    res_unauth_patch = client.patch(
        "/api/v1/games/chess",
        json={"is_active": False},
    )
    assert res_unauth_patch.status_code == 401

    # 3. Anonymous POST /games/{id}/promotion rejected
    res_unauth_promo = client.post(
        "/api/v1/games/chess/promotion",
        json={"promotion_active": True, "promotion_code": "PROMO99"},
    )
    assert res_unauth_promo.status_code == 401

    # 4. Public endpoint GET /games remains accessible to diners
    res_public = client.get("/api/v1/games")
    assert res_public.status_code == 200


def test_ai_admin_endpoints_rbac(admin_token):
    """
    VULNERABILITY FIX VERIFICATION:
    Verifies that AI usage analytics, history, and marketing campaigns require admin/manager.
    """
    # 1. Anonymous GET /ai/usage rejected
    res_unauth_usage = client.get("/api/v1/ai/usage")
    assert res_unauth_usage.status_code == 401

    # 2. Anonymous GET /ai/history rejected
    res_unauth_hist = client.get("/api/v1/ai/history")
    assert res_unauth_hist.status_code == 401

    # 3. Anonymous POST /ai/campaign rejected
    res_unauth_camp = client.post(
        "/api/v1/ai/campaign",
        json={"campaign_goal": "Hack", "target_audience": "All", "featured_item": "Free Food", "tone": "urgent"},
    )
    assert res_unauth_camp.status_code == 401


def test_order_status_validation():
    """
    VULNERABILITY FIX VERIFICATION:
    Verifies that invalid or arbitrary status values cannot corrupt order lifecycle state.
    """
    tables = client.get("/api/v1/tables").json()["data"]
    table_id = tables[0]["id"]
    products = client.get("/api/v1/products").json()["data"]
    product_id = products[0]["id"]

    order_res = client.post(
        "/api/v1/orders",
        json={
            "table_id": table_id,
            "items": [{"product_id": product_id, "quantity": 1, "options": []}],
        },
    )
    order_id = order_res.json()["data"]["id"]

    # Attempt to transition order to invalid status
    bad_status_res = client.patch(
        f"/api/v1/orders/{order_id}/status",
        json={"status": "INVALID_TAMPERED_STATE"},
    )
    assert bad_status_res.status_code in [400, 422]
    assert "Invalid order status" in bad_status_res.json()["error"]["message"]
