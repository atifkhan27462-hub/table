from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class CPUMetrics(BaseModel):
    usage_percent: float = Field(default=24.5, ge=0.0, le=100.0)
    cores: int = Field(default=8, ge=1)
    temperature_celsius: float = Field(default=48.2, ge=0.0, le=120.0)
    frequency_mhz: Optional[float] = 2400.0


class RAMMetrics(BaseModel):
    total_mb: int = Field(default=8192)
    used_mb: int = Field(default=3480)
    available_mb: int = Field(default=4712)
    usage_percent: float = Field(default=42.5, ge=0.0, le=100.0)


class TemperatureMetrics(BaseModel):
    cpu_celsius: float = Field(default=48.2)
    ambient_celsius: Optional[float] = 23.5
    fan_rpm: Optional[int] = 1200
    thermal_throttling: bool = False


class DisplayMetrics(BaseModel):
    resolution: str = Field(default="1920x1080")
    touch_responsive: bool = True
    touch_latency_ms: int = Field(default=12, ge=0)
    brightness_percent: int = Field(default=85, ge=0, le=100)
    fps: int = Field(default=60, ge=1)
    hdmi_connected: bool = True


class NetworkMetrics(BaseModel):
    status: str = Field(default="CONNECTED")  # CONNECTED, DEGRADED, DISCONNECTED
    ip_address: str = Field(default="192.168.1.107")
    mac_address: Optional[str] = "00:1B:44:11:3A:07"
    latency_ms: float = Field(default=4.2, ge=0.0)
    packet_loss_percent: float = Field(default=0.0, ge=0.0, le=100.0)
    connection_type: str = "ETHERNET"  # ETHERNET, WIFI_5GHZ, WIFI_24GHZ


class ApplicationMetrics(BaseModel):
    app_version: str = Field(default="2.4.0")
    uptime_seconds: int = Field(default=86400)
    kiosk_mode_locked: bool = True
    active_screen: str = "table-menu"
    unhandled_errors: int = 0
    memory_heap_used_mb: float = 84.5


class DeviceTelemetryReport(BaseModel):
    """
    Vendor-agnostic composite telemetry report collected from smart table hardware.
    """
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    hardware_vendor: str = "Generic-OpenHardware"
    cpu: CPUMetrics = Field(default_factory=CPUMetrics)
    ram: RAMMetrics = Field(default_factory=RAMMetrics)
    temperature: TemperatureMetrics = Field(default_factory=TemperatureMetrics)
    display: DisplayMetrics = Field(default_factory=DisplayMetrics)
    network: NetworkMetrics = Field(default_factory=NetworkMetrics)
    application: ApplicationMetrics = Field(default_factory=ApplicationMetrics)
    overall_status: str = "ONLINE"  # ONLINE, WARNING, OFFLINE
    warning_reasons: List[str] = Field(default_factory=list)


class HeartbeatPayload(BaseModel):
    """
    Payload transmitted during periodic 5-15s device heartbeat pulses.
    """
    device_token: Optional[str] = None
    hardware_id: Optional[str] = None
    ip_address: Optional[str] = None
    app_version: Optional[str] = None
    network_status: Optional[str] = None
    telemetry: Optional[Dict[str, Any]] = None
    kiosk_active: Optional[bool] = None


class HeartbeatResponse(BaseModel):
    status: str  # ONLINE, WARNING, OFFLINE
    device_id: str
    table_id: str
    table_number: str
    restaurant_id: str
    last_heartbeat: str
    last_heartbeat_human: str  # e.g. "5 seconds ago"
    kiosk_mode: bool
    server_time: str
    warning_alerts: List[str] = []
