from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class TableDeviceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    table_id: str
    table_number: Optional[str] = None
    restaurant_id: Optional[str] = None
    device_token: str
    hardware_id: Optional[str] = None
    mac_address: Optional[str] = None
    ip_address: Optional[str] = None
    network_status: str = "CONNECTED"
    app_version: str = "1.0.0"
    screen_resolution: str = "1920x1080"
    status: str = "ONLINE"  # ONLINE, OFFLINE, WARNING
    last_heartbeat: Optional[datetime] = None
    last_heartbeat_human: Optional[str] = None  # e.g. "5 seconds ago"
    seconds_since_heartbeat: Optional[float] = None
    telemetry: Optional[Dict[str, Any]] = None
    kiosk_mode_enabled: bool = True
    warning_alerts: List[str] = []
    is_active: bool = True


class TableOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    restaurant_id: str
    table_number: str
    name: str
    capacity: int
    section: str
    qr_code_token: str
    status: str
    is_active: bool
    devices: List[TableDeviceOut] = []
    created_at: Optional[datetime] = None


class TableCreate(BaseModel):
    table_number: str = Field(..., json_schema_extra={"example": "Table 01"})
    name: str = Field(..., json_schema_extra={"example": "Table 01 (Window Bay)"})
    capacity: int = Field(default=4, ge=1, le=20)
    section: Optional[str] = "Main Dining Room"


class TableUpdate(BaseModel):
    name: Optional[str] = None
    capacity: Optional[int] = None
    section: Optional[str] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None


class TableTelemetryUpdate(BaseModel):
    hardware_id: Optional[str] = None
    ip_address: Optional[str] = None
    app_version: Optional[str] = None
    screen_resolution: Optional[str] = None
    network_status: Optional[str] = None
    kiosk_active: Optional[bool] = None
    telemetry: Dict[str, Any] = Field(default_factory=dict)


class DeviceKioskTogglePayload(BaseModel):
    kiosk_enabled: bool
    pin: Optional[str] = None


class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    table_id: str
    guest_count: int
    status: str
    opened_at: datetime
    closed_at: Optional[datetime] = None
    total_spent: Decimal
    notes: Optional[str] = None


TableSessionOut = SessionOut


class SessionCreate(BaseModel):
    table_id: str
    guest_count: int = Field(default=2, ge=1, le=20)
    server_id: Optional[str] = None
    notes: Optional[str] = None


TableSessionOpen = SessionCreate


class SessionClose(BaseModel):
    notes: Optional[str] = None
