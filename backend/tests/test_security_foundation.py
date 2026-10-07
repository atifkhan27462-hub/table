import pytest
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.core.security import create_access_token, hash_password
from app.models import AuditLog, Restaurant, Role, User

client = TestClient(app)


@pytest.fixture(scope="module")
def db_session():
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture(scope="module")
def admin_credentials():
    return {"email": "admin@smarttable.io", "password": "admin12345"}


@pytest.fixture(scope="module")
def admin_token(admin_credentials):
    res = client.post("/api/v1/auth/login", json=admin_credentials)
    assert res.status_code == 200
    return res.json()["data"]["access_token"]


@pytest.fixture(scope="module")
def kitchen_token():
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "chef@smarttable.io", "password": "chef12345"},
    )
    assert res.status_code == 200
    return res.json()["data"]["access_token"]


@pytest.fixture(scope="module")
def device_token():
    res = client.post(
        "/api/v1/auth/device-pair",
        json={
            "hardware_id": "MINIPC-SN-90002",
            "device_token": "dev_token_02_secret_abc123",
        },
    )
    assert res.status_code == 200
    return res.json()["data"]["access_token"]


# 1. Unauthorized Requests (No token / malformed token)
def test_unauthorized_request_no_token():
    res_users = client.get("/api/v1/users")
    assert res_users.status_code == 401
    assert res_users.json()["error"]["code"] == "AUTHENTICATION_FAILED"

    res_analytics = client.get("/api/v1/analytics/dashboard")
    assert res_analytics.status_code == 401

    res_me = client.get("/api/v1/auth/me")
    assert res_me.status_code == 401


def test_unauthorized_request_malformed_token():
    headers = {"Authorization": "Bearer malformed.garbage.jwt.token"}
    res = client.get("/api/v1/auth/me", headers=headers)
    assert res.status_code == 401
    assert "Invalid authentication token" in res.json()["error"]["message"]


# 2. Invalid Credentials
def test_invalid_credentials_bad_password(db_session):
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@smarttable.io", "password": "definitely_wrong_password"},
    )
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "AUTHENTICATION_FAILED"

    # Verify audit log caught the failure
    failed_log = (
        db_session.query(AuditLog)
        .filter_by(action="LOGIN_FAILED")
        .order_by(AuditLog.created_at.desc())
        .first()
    )
    assert failed_log is not None
    assert failed_log.status == "FAILURE"


def test_invalid_credentials_nonexistent_email():
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "nonexistent_hacker@domain.com", "password": "password123"},
    )
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "AUTHENTICATION_FAILED"


# 3. Account Status Check (Inactive / Suspended User)
def test_account_status_inactive_user_blocked(db_session):
    restaurant = db_session.query(Restaurant).filter_by(slug="luminary-dining").first()
    role_staff = db_session.query(Role).filter_by(code="STAFF").first()
    if not role_staff:
        role_staff = db_session.query(Role).filter_by(code="WAITER").first()

    inactive_user = db_session.query(User).filter_by(email="suspended_staff@smarttable.io").first()
    if not inactive_user:
        inactive_user = User(
            restaurant_id=restaurant.id,
            role_id=role_staff.id,
            email="suspended_staff@smarttable.io",
            password_hash=hash_password("staffpass123"),
            full_name="Suspended Staff Member",
            is_active=False,  # DEACTIVATED ACCOUNT
        )
        db_session.add(inactive_user)
        db_session.commit()

    # Attempt login with inactive credentials
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "suspended_staff@smarttable.io", "password": "staffpass123"},
    )
    assert res.status_code == 401
    assert "inactive or suspended" in res.json()["error"]["message"]


# 4. Expired Token
def test_expired_token_rejected():
    # Forge token expired 10 minutes ago
    expired_token = create_access_token(
        subject="test-user-id",
        restaurant_id="test-restaurant-id",
        role="SUPER_ADMIN",
        expires_delta=timedelta(seconds=-600),
    )
    res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert res.status_code == 401
    assert "expired" in res.json()["error"]["message"].lower()


# 5. Token Revocation & Logout
def test_token_revocation_and_logout(admin_credentials):
    login_res = client.post("/api/v1/auth/login", json=admin_credentials)
    tokens = login_res.json()["data"]
    active_access_token = tokens["access_token"]
    active_refresh_token = tokens["refresh_token"]

    # Verify token works before logout
    me_res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {active_access_token}"},
    )
    assert me_res.status_code == 200

    # Execute logout
    logout_res = client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {active_access_token}"},
        json={"refresh_token": active_refresh_token},
    )
    assert logout_res.status_code == 200
    assert logout_res.json()["success"] is True

    # Immediate request with same token must fail due to revocation blacklist
    me_after_logout = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {active_access_token}"},
    )
    assert me_after_logout.status_code == 401
    assert "revoked or logged out" in me_after_logout.json()["error"]["message"]


# 6. Session Refresh Mechanism and Token Rotation
def test_refresh_token_rotation(admin_credentials):
    login_res = client.post("/api/v1/auth/login", json=admin_credentials)
    tokens = login_res.json()["data"]
    first_refresh_token = tokens["refresh_token"]

    # Exchange refresh token for fresh pair
    refresh_res = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": first_refresh_token},
    )
    assert refresh_res.status_code == 200
    new_tokens = refresh_res.json()["data"]
    second_access_token = new_tokens["access_token"]
    second_refresh_token = new_tokens["refresh_token"]

    assert second_access_token != tokens["access_token"]
    assert second_refresh_token != first_refresh_token

    # Verify new access token functions
    check_new = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {second_access_token}"},
    )
    assert check_new.status_code == 200

    # Old refresh token is revoked and cannot be used again
    reuse_old_refresh = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": first_refresh_token},
    )
    assert reuse_old_refresh.status_code == 401


# 7. Role Escalation Prevention
def test_role_escalation_blocked(db_session, kitchen_token):
    # Kitchen chef tries to create a SUPER_ADMIN user
    superadmin_role = db_session.query(Role).filter_by(code="SUPER_ADMIN").first()
    if not superadmin_role:
        superadmin_role = db_session.query(Role).filter_by(code="SUPERADMIN").first()

    payload = {
        "email": "hacker_promoted@smarttable.io",
        "password": "strongpassword123",
        "full_name": "Unauthorized Superadmin",
        "role_id": superadmin_role.id,
    }

    # Kitchen chef is forbidden from accessing user creation
    res = client.post(
        "/api/v1/users",
        json=payload,
        headers={"Authorization": f"Bearer {kitchen_token}"},
    )
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "PERMISSION_DENIED"


# 8. Kitchen Accessing Admin Functions (Forbidden)
def test_kitchen_accessing_admin_functions_blocked(kitchen_token):
    # 1. Kitchen accessing user management -> 403
    res_users = client.get("/api/v1/users", headers={"Authorization": f"Bearer {kitchen_token}"})
    assert res_users.status_code == 403
    assert res_users.json()["error"]["code"] == "PERMISSION_DENIED"

    # 2. Kitchen accessing executive analytics -> 403
    res_analytics = client.get("/api/v1/analytics/dashboard", headers={"Authorization": f"Bearer {kitchen_token}"})
    assert res_analytics.status_code == 403

    # 3. Kitchen accessing financial audit logs -> 403
    res_audit = client.get("/api/v1/audit/logs", headers={"Authorization": f"Bearer {kitchen_token}"})
    assert res_audit.status_code == 403

    # 4. Kitchen accessing daily financial reports -> 403
    res_reports = client.get("/api/v1/reports/daily", headers={"Authorization": f"Bearer {kitchen_token}"})
    assert res_reports.status_code == 403

    # 5. But Kitchen CAN access KDS orders
    res_kds = client.get("/api/v1/kitchen/orders", headers={"Authorization": f"Bearer {kitchen_token}"})
    assert res_kds.status_code == 200


# 9. Table Device Accessing Admin Endpoints (Forbidden)
def test_table_device_accessing_admin_endpoints_blocked(device_token):
    headers = {"Authorization": f"Bearer {device_token}"}

    # Device cannot access staff profile
    res_me = client.get("/api/v1/auth/me", headers=headers)
    assert res_me.status_code == 403

    # Device cannot access user management
    res_users = client.get("/api/v1/users", headers=headers)
    assert res_users.status_code == 403

    # Device cannot view analytics
    res_analytics = client.get("/api/v1/analytics/dashboard", headers=headers)
    assert res_analytics.status_code == 403

    # Device cannot inspect audit trail
    res_audit = client.get("/api/v1/audit/logs", headers=headers)
    assert res_audit.status_code == 403


# 10. Cross-Restaurant Access Isolation
def test_cross_restaurant_access_blocked(db_session):
    # Create or fetch Restaurant 2
    r2 = db_session.query(Restaurant).filter_by(slug="branch-north").first()
    if not r2:
        r2 = Restaurant(name="Luminary North Branch", slug="branch-north", currency="USD")
        db_session.add(r2)
        db_session.flush()

    role_mgr = db_session.query(Role).filter_by(code="MANAGER").first()

    # User in Restaurant 2
    mgr_r2 = db_session.query(User).filter_by(email="manager.north@smarttable.io").first()
    if not mgr_r2:
        mgr_r2 = User(
            restaurant_id=r2.id,
            role_id=role_mgr.id,
            email="manager.north@smarttable.io",
            password_hash=hash_password("mgrnorth123"),
            full_name="North Branch Manager",
            is_active=True,
        )
        db_session.add(mgr_r2)
        db_session.commit()

    # Login as Manager of Restaurant 2
    res_login = client.post(
        "/api/v1/auth/login",
        json={"email": "manager.north@smarttable.io", "password": "mgrnorth123"},
    )
    assert res_login.status_code == 200
    token_r2 = res_login.json()["data"]["access_token"]

    # Manager of Restaurant 2 tries to access Restaurant 1's data
    r1 = db_session.query(Restaurant).filter_by(slug="luminary-dining").first()
    res_cross = client.get(
        f"/api/v1/users?restaurant_id={r1.id}",
        headers={"Authorization": f"Bearer {token_r2}"},
    )
    assert res_cross.status_code == 403
    assert "Cross-restaurant" in res_cross.json()["error"]["message"]


# 11. Security Audit Trail Logging
def test_security_audit_logging_integrity(admin_token, db_session):
    res = client.get("/api/v1/audit/logs", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    logs = res.json()["data"]
    assert len(logs) > 0

    actions = {log["action"] for log in logs}
    assert "LOGIN_SUCCESS" in actions
