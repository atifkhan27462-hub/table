import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.models import TableDevice
from app.services.device_agent.evaluator import DeviceHealthEvaluator
from app.services.device_agent.kiosk_policy import KioskSecurityPolicy
from app.services.device_agent.probes import (
    GenericLinuxProbe,
    GenericWindowsProbe,
    HardwareProbeFactory,
    SimulatedHardwareProbe,
)


@pytest.fixture
def client():
    return TestClient(app)


def get_auth_token(client: TestClient, email: str = "admin@smarttable.io", password: str = "admin12345"):
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return res.json()["data"]["access_token"]


def test_device_listing_and_health_fields(client: TestClient):
    """
    Verify each table device has unique device ID, table ID, restaurant ID,
    device status (ONLINE/OFFLINE/WARNING), last heartbeat, software version,
    and IP/network status.
    """
    token = get_auth_token(client)
    res = client.get("/api/v1/devices", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()["data"]
    assert len(data) >= 1

    device = data[0]
    assert "id" in device
    assert "table_id" in device
    assert "restaurant_id" in device
    assert "status" in device
    assert device["status"] in ["ONLINE", "OFFLINE", "WARNING"]
    assert "last_heartbeat" in device
    assert "app_version" in device
    assert "network_status" in device
    assert "last_heartbeat_human" in device


def test_device_heartbeat_pulse_updates_status(client: TestClient):
    """
    Verify sending a device heartbeat pulse refreshes last_heartbeat
    and returns status ONLINE with human-readable timestamp like 'Just now' or '5 seconds ago'.
    """
    token = get_auth_token(client)
    devices = client.get("/api/v1/devices", headers={"Authorization": f"Bearer {token}"}).json()["data"]
    device = devices[0]
    dev_token = device["device_token"]

    # Send heartbeat
    hb_res = client.post(
        "/api/v1/devices/heartbeat",
        headers={"X-Device-Token": dev_token},
        json={
            "hardware_id": "ST-HW-32INCH-007",
            "app_version": "2.4.0",
            "ip_address": "192.168.1.107",
            "network_status": "CONNECTED",
            "telemetry": {
                "cpu_temp_c": 46.5,
                "ram_usage_percent": 38.0,
                "touch_latency_ms": 11,
            },
        },
    )
    assert hb_res.status_code == 200
    body = hb_res.json()["data"]
    assert body["status"] == "ONLINE"
    assert body["device_id"] == device["id"]
    assert body["table_id"] == device["table_id"]
    assert body["restaurant_id"] is not None
    assert "Just now" in body["last_heartbeat_human"] or "second" in body["last_heartbeat_human"]
    assert body["kiosk_mode"] is True


def test_device_warning_detection_thermal_and_touch(client: TestClient):
    """
    Verify warning status is dynamically triggered when hardware thresholds
    (e.g., CPU temp > 78C or touch latency > 45ms) are exceeded.
    """
    token = get_auth_token(client)
    devices = client.get("/api/v1/devices", headers={"Authorization": f"Bearer {token}"}).json()["data"]
    device = devices[0]
    dev_token = device["device_token"]

    # Send telemetry with excessive CPU temperature (84°C)
    hb_res = client.post(
        "/api/v1/devices/heartbeat",
        headers={"X-Device-Token": dev_token},
        json={
            "telemetry": {
                "cpu_temp_c": 84.5,
                "ram_usage_percent": 45.0,
                "touch_latency_ms": 14,
            },
        },
    )
    assert hb_res.status_code == 200
    body = hb_res.json()["data"]
    assert body["status"] == "WARNING"
    assert any("CPU temperature" in a for a in body["warning_alerts"])

    # Verify admin listing now reflects WARNING
    listing = client.get("/api/v1/devices", headers={"Authorization": f"Bearer {token}"}).json()["data"]
    matched = next(d for d in listing if d["id"] == device["id"])
    assert matched["status"] == "WARNING"


def test_device_offline_detection_delayed_heartbeat(client: TestClient):
    """
    Verify device status evaluates to OFFLINE if heartbeat is missing
    or older than threshold (90 seconds).
    """
    token = get_auth_token(client)
    devices = client.get("/api/v1/devices", headers={"Authorization": f"Bearer {token}"}).json()["data"]
    device_id = devices[0]["id"]

    # Simulate device offline by injecting simulated 120s old heartbeat
    sim_res = client.post(
        f"/api/v1/devices/{device_id}/simulate-status",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": "OFFLINE", "seconds_ago": 120},
    )
    assert sim_res.status_code == 200
    sim_data = sim_res.json()["data"]
    assert sim_data["status"] == "OFFLINE"
    assert sim_data["seconds_since_heartbeat"] >= 90


def test_kiosk_mode_security_policy_and_toggle(client: TestClient):
    """
    Verify kiosk security directives (blocking OS escape hotkeys, context menu, fullscreen)
    and admin remote toggle functionality.
    """
    token = get_auth_token(client)
    devices = client.get("/api/v1/devices", headers={"Authorization": f"Bearer {token}"}).json()["data"]
    device_id = devices[0]["id"]

    # 1. Fetch kiosk policy
    policy_res = client.get(f"/api/v1/devices/{device_id}/kiosk-policy")
    assert policy_res.status_code == 200
    policy = policy_res.json()["data"]
    assert policy["kiosk_enabled"] is True
    assert policy["block_context_menu"] is True
    assert policy["block_pinch_zoom"] is True
    assert policy["enforce_fullscreen"] is True
    # Verify forbidden hotkeys include Escape, Alt+Tab, F11, F12, DevTools
    shortcuts = policy["block_keyboard_shortcuts"]
    assert "Escape" in shortcuts
    assert "Alt+Tab" in shortcuts
    assert "F12" in shortcuts
    assert "Control+Shift+I" in shortcuts

    # 2. Remote toggle kiosk lock
    toggle_res = client.patch(
        f"/api/v1/devices/{device_id}/kiosk",
        headers={"Authorization": f"Bearer {token}"},
        json={"kiosk_enabled": False, "pin": "9999"},
    )
    assert toggle_res.status_code == 200
    updated = toggle_res.json()["data"]
    assert updated["kiosk_mode_enabled"] is False

    # Restore kiosk lock
    restore_res = client.patch(
        f"/api/v1/devices/{device_id}/kiosk",
        headers={"Authorization": f"Bearer {token}"},
        json={"kiosk_enabled": True, "pin": "7788"},
    )
    assert restore_res.status_code == 200
    assert restore_res.json()["data"]["kiosk_mode_enabled"] is True


def test_vendor_agnostic_hardware_probes():
    """
    Verify the vendor-agnostic device-agent architecture allows querying hardware telemetry
    (CPU, RAM, Temp, Display, Network, Application) without coupling to single vendor drivers.
    """
    # 1. Simulated Probe
    sim_probe = SimulatedHardwareProbe()
    report = sim_probe.collect_full_report()
    assert report.cpu.usage_percent >= 0
    assert report.ram.total_mb > 0
    assert report.temperature.cpu_celsius > 0
    assert report.display.touch_responsive is True
    assert report.network.status == "CONNECTED"
    assert report.application.uptime_seconds > 0

    # 2. Linux Probe
    linux_probe = GenericLinuxProbe()
    linux_report = linux_probe.collect_full_report()
    assert linux_report.cpu.cores >= 1

    # 3. Windows Probe
    win_probe = GenericWindowsProbe()
    win_report = win_probe.collect_full_report()
    assert win_report.cpu.cores >= 1

    # 4. Probe Factory auto-detection
    detected_probe = HardwareProbeFactory.get_probe()
    assert detected_probe is not None
    detected_report = detected_probe.collect_full_report()
    assert detected_report.overall_status in ["ONLINE", "WARNING", "OFFLINE"]


def test_relative_time_formatting():
    """
    Verify human relative time helper formats time strings accurately
    (e.g., 'Just now', '5 seconds ago', '2 minutes ago').
    """
    now = datetime.now(timezone.utc)
    assert DeviceHealthEvaluator.format_relative_time(None) == "Never"
    assert DeviceHealthEvaluator.format_relative_time(now - timedelta(seconds=1)) == "Just now"
    assert DeviceHealthEvaluator.format_relative_time(now - timedelta(seconds=5)) == "5 seconds ago"
    assert DeviceHealthEvaluator.format_relative_time(now - timedelta(seconds=45)) == "45 seconds ago"
    assert DeviceHealthEvaluator.format_relative_time(now - timedelta(minutes=3)) == "3 minutes ago"
    assert DeviceHealthEvaluator.format_relative_time(now - timedelta(hours=2)) == "2 hours ago"
