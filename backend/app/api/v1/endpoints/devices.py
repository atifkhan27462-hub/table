import hmac
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Body, Depends, Query
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_table_device, require_roles
from app.core.websocket_manager import connection_manager
from app.models import TableDevice, User
from app.schemas.common import ApiResponse
from app.schemas.realtime import RealtimeEvent, RealtimeEventType
from app.schemas.table import DeviceKioskTogglePayload, TableDeviceOut, TableTelemetryUpdate
from app.services.device_agent.evaluator import DeviceHealthEvaluator
from app.services.device_agent.kiosk_policy import KioskSecurityPolicy
from app.services.device_agent.models import HeartbeatPayload, HeartbeatResponse
from app.services.table_service import TableService

router = APIRouter(prefix="/devices", tags=["32-inch Table Hardware & Telemetry"])


@router.get("", response_model=ApiResponse[List[TableDeviceOut]], summary="List all registered table devices with real-time health")
def list_devices(
    restaurant_id: Optional[str] = Query(None, description="Optional restaurant tenant ID filter"),
    db: Session = Depends(get_db),
    _user: User = Depends(require_roles("SUPERADMIN", "SUPER_ADMIN", "MANAGER", "STAFF")),
):
    devices = TableService.list_devices(db, restaurant_id=restaurant_id)
    enriched = [TableService.enrich_device_out(d) for d in devices]
    return ApiResponse(data=enriched)


@router.get("/{device_id}", response_model=ApiResponse[TableDeviceOut], summary="Get table device telemetry and health details")
def get_device_details(
    device_id: str,
    db: Session = Depends(get_db),
    _user: User = Depends(require_roles("SUPERADMIN", "SUPER_ADMIN", "MANAGER", "STAFF")),
):
    device = TableService.get_device_by_id(db, device_id)
    return ApiResponse(data=TableService.enrich_device_out(device))


@router.post("/heartbeat", response_model=ApiResponse[HeartbeatResponse], summary="Fast heartbeat pulse for table hardware")
def device_heartbeat(
    payload: Optional[HeartbeatPayload] = Body(default=None),
    current_device: TableDevice = Depends(get_table_device),
    db: Session = Depends(get_db),
):
    # Resolve target device
    device = current_device
    if payload and payload.device_token:
        lookup = db.query(TableDevice).filter_by(device_token=payload.device_token, is_active=True).first()
        if lookup:
            device = lookup

    # Update heartbeat timestamp
    now = datetime.now(timezone.utc)
    device.last_heartbeat = now

    if payload:
        if payload.hardware_id:
            device.hardware_id = payload.hardware_id
        if payload.ip_address:
            device.ip_address = payload.ip_address
        if payload.app_version:
            device.app_version = payload.app_version
        if payload.network_status:
            device.network_status = payload.network_status
        if payload.kiosk_active is not None:
            device.kiosk_mode_enabled = payload.kiosk_active
        if payload.telemetry:
            merged = dict(device.telemetry or {})
            merged.update(payload.telemetry)
            device.telemetry = merged

    # Dynamic status evaluation
    status, human_hb, alerts = DeviceHealthEvaluator.evaluate_health(device)
    device.status = status

    db.commit()
    db.refresh(device)

    # Broadcast real-time status update to Admin & KDS consoles
    table_num = device.table.table_number if device.table else "Unknown"
    rest_id = device.restaurant_id or (device.table.restaurant_id if device.table else "")
    connection_manager.dispatch_sync(
        RealtimeEvent(
            type=RealtimeEventType.TABLE_ONLINE,
            restaurant_id=rest_id,
            table_id=device.table_id,
            data={
                "device_id": device.id,
                "table_number": table_num,
                "status": status,
                "last_heartbeat": now.isoformat(),
                "last_heartbeat_human": human_hb,
                "network_status": device.network_status,
                "warning_alerts": alerts,
            },
        )
    )

    response_data = HeartbeatResponse(
        status=status,
        device_id=device.id,
        table_id=device.table_id,
        table_number=table_num,
        restaurant_id=rest_id,
        last_heartbeat=now.isoformat(),
        last_heartbeat_human=human_hb,
        kiosk_mode=device.kiosk_mode_enabled if device.kiosk_mode_enabled is not None else True,
        server_time=now.isoformat(),
        warning_alerts=alerts,
    )
    return ApiResponse(data=response_data, message=f"Heartbeat received: {table_num} is {status}.")


@router.post("/telemetry", response_model=ApiResponse[TableDeviceOut], summary="Send comprehensive hardware telemetry (CPU, RAM, temp, display)")
def record_telemetry(
    payload: TableTelemetryUpdate,
    current_device: TableDevice = Depends(get_table_device),
    db: Session = Depends(get_db),
):
    updated = TableService.record_device_telemetry(db, current_device.id, payload)
    enriched = TableService.enrich_device_out(updated)
    return ApiResponse(data=enriched, message="Device telemetry recorded.")


@router.patch("/{device_id}/kiosk", response_model=ApiResponse[TableDeviceOut], summary="Remote lock or unlock kiosk mode")
def toggle_kiosk(
    device_id: str,
    payload: DeviceKioskTogglePayload,
    db: Session = Depends(get_db),
    _user: User = Depends(require_roles("SUPERADMIN", "MANAGER")),
):
    device = TableService.toggle_kiosk_mode(db, device_id, payload.kiosk_enabled, payload.pin)
    enriched = TableService.enrich_device_out(device)

    # Broadcast event so client table applies lockdown instantly
    connection_manager.dispatch_sync(
        RealtimeEvent(
            type=RealtimeEventType.TABLE_ONLINE,
            restaurant_id=device.restaurant_id,
            table_id=device.table_id,
            data={
                "device_id": device.id,
                "kiosk_mode_enabled": device.kiosk_mode_enabled,
                "action": "KIOSK_MODE_UPDATED",
            },
        )
    )
    msg = f"Kiosk mode {'enabled' if payload.kiosk_enabled else 'disabled'} for device {device.id}."
    return ApiResponse(data=enriched, message=msg)


@router.get("/{device_id}/kiosk-policy", response_model=ApiResponse[KioskSecurityPolicy], summary="Fetch kiosk security enforcement rules")
def get_kiosk_security_policy(
    device_id: str,
    db: Session = Depends(get_db),
):
    device = TableService.get_device_by_id(db, device_id)
    # Defense-in-depth: Never disclose cleartext emergency unlock PIN in public policy response
    policy = KioskSecurityPolicy(
        kiosk_enabled=device.kiosk_mode_enabled if device.kiosk_mode_enabled is not None else True,
        emergency_unlock_pin="[PROTECTED_PIN_VERIFY_VIA_API]",
    )
    return ApiResponse(data=policy)


@router.post("/{device_id}/verify-kiosk-pin", response_model=ApiResponse[dict], summary="Validate manager emergency unlock PIN with timing-safe comparison")
def verify_kiosk_pin(
    device_id: str,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
):
    device = TableService.get_device_by_id(db, device_id)
    submitted_pin = str(payload.get("pin", "")).strip()
    actual_pin = str(device.kiosk_pin or "7788").strip()
    is_valid = hmac.compare_digest(submitted_pin, actual_pin)
    if is_valid:
        return ApiResponse(data={"valid": True, "device_id": device_id}, message="Emergency unlock authorized.")
    return ApiResponse(data={"valid": False, "device_id": device_id}, message="Invalid manager PIN.")


@router.post("/{device_id}/simulate-status", response_model=ApiResponse[TableDeviceOut], summary="Simulate hardware metrics for testing (CPU temp, lag, offline)")
def simulate_device_status(
    device_id: str,
    simulation: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    _user: User = Depends(require_roles("SUPERADMIN", "MANAGER")),
):
    device = TableService.get_device_by_id(db, device_id)
    sim_type = simulation.get("status", "ONLINE").upper()

    now = datetime.now(timezone.utc)
    if sim_type == "OFFLINE":
        # Simulate last heartbeat was 120 seconds ago
        device.last_heartbeat = now - timedelta(seconds=simulation.get("seconds_ago", 120))
        device.status = "OFFLINE"
    elif sim_type == "WARNING":
        device.last_heartbeat = now
        telemetry = dict(device.telemetry or {})
        telemetry["cpu_temp_c"] = simulation.get("cpu_temp_c", 82.5)
        telemetry["touch_latency_ms"] = simulation.get("touch_latency_ms", 60)
        telemetry["ram_usage_percent"] = simulation.get("ram_usage_percent", 94.0)
        device.telemetry = telemetry
        device.status = "WARNING"
    else:  # ONLINE
        device.last_heartbeat = now
        telemetry = dict(device.telemetry or {})
        telemetry["cpu_temp_c"] = simulation.get("cpu_temp_c", 45.0)
        telemetry["touch_latency_ms"] = simulation.get("touch_latency_ms", 12)
        telemetry["ram_usage_percent"] = simulation.get("ram_usage_percent", 42.0)
        device.telemetry = telemetry
        device.status = "ONLINE"

    db.commit()
    db.refresh(device)
    enriched = TableService.enrich_device_out(device)
    return ApiResponse(data=enriched, message=f"Device {device.id} simulated to {device.status}.")
