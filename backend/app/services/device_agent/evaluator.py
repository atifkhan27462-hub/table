from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from app.models import TableDevice


class DeviceHealthEvaluator:
    """
    Vendor-agnostic health evaluation engine for 32-inch smart table devices.
    Determines ONLINE, WARNING, OFFLINE status based on heartbeat freshness
    and hardware telemetry thresholds.
    """

    HEARTBEAT_WARNING_SECONDS = 30
    HEARTBEAT_OFFLINE_SECONDS = 90

    # Hardware Warning Thresholds
    MAX_SAFE_CPU_TEMP_C = 78.0
    MAX_SAFE_RAM_USAGE_PERCENT = 90.0
    MAX_SAFE_TOUCH_LATENCY_MS = 45

    @classmethod
    def format_relative_time(cls, dt: Optional[datetime]) -> str:
        if not dt:
            return "Never"
        now = datetime.now(timezone.utc)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        diff_sec = max((now - dt).total_seconds(), 0.0)

        if diff_sec < 3:
            return "Just now"
        elif diff_sec < 60:
            return f"{int(diff_sec)} seconds ago"
        elif diff_sec < 3600:
            mins = int(diff_sec // 60)
            return f"{mins} minute{'s' if mins != 1 else ''} ago"
        else:
            hours = int(diff_sec // 3600)
            return f"{hours} hour{'s' if hours != 1 else ''} ago"

    @classmethod
    def evaluate_health(
        cls,
        device: TableDevice,
        override_telemetry: Optional[Dict[str, Any]] = None,
    ) -> Tuple[str, str, List[str]]:
        """
        Evaluates table device hardware health status.
        Returns:
            (status: ONLINE | WARNING | OFFLINE, human_heartbeat: str, alerts: List[str])
        """
        now = datetime.now(timezone.utc)
        alerts: List[str] = []

        last_hb = device.last_heartbeat
        human_hb = cls.format_relative_time(last_hb)

        # 1. Heartbeat Freshness Evaluation
        if not last_hb:
            return "OFFLINE", "Never", ["Device has never transmitted a heartbeat pulse."]

        if last_hb.tzinfo is None:
            last_hb = last_hb.replace(tzinfo=timezone.utc)

        diff_sec = max((now - last_hb).total_seconds(), 0.0)

        if diff_sec > cls.HEARTBEAT_OFFLINE_SECONDS:
            return "OFFLINE", human_hb, [f"Heartbeat lost ({int(diff_sec)}s since last contact)."]

        status = "ONLINE"
        if diff_sec > cls.HEARTBEAT_WARNING_SECONDS:
            status = "WARNING"
            alerts.append(f"Heartbeat pulse delayed ({int(diff_sec)}s ago).")

        # 2. Hardware Telemetry Threshold Inspection
        telem = override_telemetry or device.telemetry or {}

        # CPU Temperature
        cpu_temp = telem.get("cpu_temp_c") or telem.get("cpu", {}).get("temperature_celsius")
        if cpu_temp and float(cpu_temp) > cls.MAX_SAFE_CPU_TEMP_C:
            status = "WARNING"
            alerts.append(f"High CPU temperature: {cpu_temp}°C (Safe limit: {cls.MAX_SAFE_CPU_TEMP_C}°C)")

        # RAM Consumption
        ram_pct = telem.get("ram_usage_percent") or telem.get("ram", {}).get("usage_percent")
        if ram_pct and float(ram_pct) > cls.MAX_SAFE_RAM_USAGE_PERCENT:
            status = "WARNING"
            alerts.append(f"Critical RAM utilization: {ram_pct}% (Threshold: {cls.MAX_SAFE_RAM_USAGE_PERCENT}%)")

        # Touch Sensor Latency
        latency = telem.get("touch_latency_ms") or telem.get("display", {}).get("touch_latency_ms")
        if latency and int(latency) > cls.MAX_SAFE_TOUCH_LATENCY_MS:
            status = "WARNING"
            alerts.append(f"Touch latency degraded: {latency}ms (Expected: < {cls.MAX_SAFE_TOUCH_LATENCY_MS}ms)")

        # Network Degradation
        net_status = telem.get("network_status") or device.network_status
        if net_status in ("DEGRADED", "DISCONNECTED"):
            status = "WARNING"
            alerts.append("Network link degraded or fluctuating packet loss detected.")

        return status, human_hb, alerts
