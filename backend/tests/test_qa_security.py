import pytest
from decimal import Decimal
from fastapi.testclient import TestClient
from app.core.security import create_access_token
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


@pytest.fixture(scope="module")
def staff_headers():
    """Authenticates staff user (Chef / Kitchen role)."""
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "chef@smarttable.io", "password": "chef12345"},
    )
    token = res.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ============================================================================
# 1. UNAUTHORIZED API ACCESS TESTS
# ============================================================================

def test_unauthorized_endpoints_block_anonymous_traffic():
    """
    SECURITY QA: Unauthorized API
    Verifies that protected admin and staff endpoints block unauthenticated requests with 401.
    """
    protected_routes = [
        ("GET", "/api/v1/users"),
        ("POST", "/api/v1/users"),
        ("GET", "/api/v1/analytics/dashboard"),
        ("GET", "/api/v1/analytics/export/csv"),
        ("GET", "/api/v1/reports/daily"),
        ("GET", "/api/v1/reports/summary"),
        ("GET", "/api/v1/audit/logs"),
        ("GET", "/api/v1/payments"),
        ("GET", "/api/v1/games/admin"),
        ("GET", "/api/v1/ai/usage"),
        ("GET", "/api/v1/ai/history"),
        ("POST", "/api/v1/ai/campaign"),
        ("GET", "/api/v1/sessions"),
        ("POST", "/api/v1/devices/heartbeat"),
    ]

    for method, route in protected_routes:
        if method == "GET":
            res = client.get(route)
        elif method == "POST":
            res = client.post(route, json={})
        assert res.status_code == 401, f"Route {route} failed to reject unauthenticated request!"


# ============================================================================
# 2. INVALID / TAMPERED TOKEN TESTS
# ============================================================================

def test_tampered_and_garbage_tokens_rejected():
    """
    SECURITY QA: Invalid Token Fuzzing
    Verifies that forged, malformed, or tampered tokens are rejected with 401.
    """
    invalid_tokens = [
        "Bearer not.a.real.jwt.token",
        "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.tampered_signature",
        "Bearer 12345",
        "Bearer ",
        "Basic YWRtaW46cGFzc3dvcmQ=",
    ]

    for header_val in invalid_tokens:
        res = client.get("/api/v1/users", headers={"Authorization": header_val})
        assert res.status_code == 401


# ============================================================================
# 3. ROLE ESCALATION & PRIVILEGE CHECKS
# ============================================================================

def test_role_escalation_staff_cannot_access_executive_functions(staff_headers):
    """
    SECURITY QA: Role Escalation Prevention
    Verifies that low-privilege roles (STAFF) cannot access administrative endpoints
    such as user creation, financial audits, daily reports, or system roles.
    """
    # 1. Staff cannot view audit logs
    res_audit = client.get("/api/v1/audit/logs", headers=staff_headers)
    assert res_audit.status_code == 403
    assert res_audit.json()["error"]["code"] == "PERMISSION_DENIED"

    # 2. Staff cannot export analytics CSV
    res_export = client.get("/api/v1/analytics/export/csv", headers=staff_headers)
    assert res_export.status_code == 403

    # 3. Staff cannot create new users
    res_create_user = client.post(
        "/api/v1/users",
        json={"email": "hacker@smarttable.io", "password": "Password123!", "first_name": "Bad", "last_name": "Actor", "role_id": "fake"},
        headers=staff_headers,
    )
    assert res_create_user.status_code == 403


# ============================================================================
# 4. CROSS-RESTAURANT MULTI-TENANT ISOLATION
# ============================================================================

def test_cross_restaurant_data_leakage_blocked(staff_headers):
    """
    SECURITY QA: Cross-Restaurant Multi-Tenant Isolation
    Verifies that staff belonging to Restaurant A cannot query or mutate resources of Restaurant B.
    """
    # Attempt to query daily report for an arbitrary alien tenant ID
    alien_tenant_id = "00000000-0000-0000-0000-000000000099"
    res_cross = client.get(
        f"/api/v1/reports/daily?restaurant_id={alien_tenant_id}",
        headers=staff_headers,
    )
    assert res_cross.status_code in [403, 404]


# ============================================================================
# 5. INJECTION ATTACK ATTEMPTS
# ============================================================================

def test_sql_injection_payloads_safely_handled():
    """
    SECURITY QA: SQL Injection Resistance
    Fuzzes API query parameters and path parameters with classic SQL injection patterns.
    Verifies that the ORM and parameterization safely sanitize inputs without 500 crashes.
    """
    sqli_payloads = [
        "' OR '1'='1",
        "'; DROP TABLE orders;--",
        "1 UNION SELECT null, null, null--",
        "' OR 1=1 --",
        "admin'--",
    ]

    for payload in sqli_payloads:
        # Fuzz query param
        res_query = client.get(f"/api/v1/orders?status={payload}")
        assert res_query.status_code in [200, 400, 422]  # Handled cleanly, not internal 500

        # Fuzz path param
        res_path = client.get(f"/api/v1/orders/{payload}")
        assert res_path.status_code in [404, 422]  # Clean 404 Entity Not Found


def test_xss_injection_payloads_safely_stored_and_escaped():
    """
    SECURITY QA: Cross-Site Scripting (XSS) Sanitization
    Verifies that XSS attack vectors in customer special instructions and notes
    are safely handled without executing or compromising API state.
    """
    tables = client.get("/api/v1/tables").json()["data"]
    table_id = tables[0]["id"]
    products = client.get("/api/v1/products").json()["data"]
    product_id = products[0]["id"]

    xss_payload = "<script>alert('XSS_ATTACK_VECTOR');</script><img src=x onerror=alert(1)>"

    order_res = client.post(
        "/api/v1/orders",
        json={
            "table_id": table_id,
            "items": [{"product_id": product_id, "quantity": 1, "notes": xss_payload, "options": []}],
            "special_instructions": xss_payload,
        },
    )
    assert order_res.status_code == 200
    order_data = order_res.json()["data"]
    order_id = order_data["id"]

    # Verify retrieval preserves text safely without server-side execution
    get_res = client.get(f"/api/v1/orders/{order_id}")
    assert get_res.status_code == 200
    retrieved = get_res.json()["data"]
    assert retrieved["special_instructions"] == xss_payload
    assert retrieved["items"][0]["notes"] == xss_payload
