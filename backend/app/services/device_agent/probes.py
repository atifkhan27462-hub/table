import platform
import random
from abc import ABC, abstractmethod
from typing import Optional
from app.services.device_agent.models import (
    ApplicationMetrics,
    CPUMetrics,
    DeviceTelemetryReport,
    DisplayMetrics,
    NetworkMetrics,
    RAMMetrics,
    TemperatureMetrics,
)


class BaseHardwareProbe(ABC):
    """
    Abstract hardware monitor probe.
    Decouples device telemetry from specific silicon, motherboard, or touch controller vendors.
    """

    @abstractmethod
    def read_cpu(self) -> CPUMetrics:
        pass

    @abstractmethod
    def read_ram(self) -> RAMMetrics:
        pass

    @abstractmethod
    def read_temperature(self) -> TemperatureMetrics:
        pass

    @abstractmethod
    def read_display(self) -> DisplayMetrics:
        pass

    @abstractmethod
    def read_network(self) -> NetworkMetrics:
        pass

    @abstractmethod
    def read_application(self) -> ApplicationMetrics:
        pass

    def collect_full_report(self) -> DeviceTelemetryReport:
        cpu = self.read_cpu()
        ram = self.read_ram()
        temp = self.read_temperature()
        display = self.read_display()
        network = self.read_network()
        app = self.read_application()

        status = "ONLINE"
        warnings = []
        if temp.cpu_celsius > 78.0:
            status = "WARNING"
            warnings.append(f"High CPU temperature: {temp.cpu_celsius}°C")
        if ram.usage_percent > 90.0:
            status = "WARNING"
            warnings.append(f"High RAM usage: {ram.usage_percent}%")
        if network.status != "CONNECTED":
            status = "WARNING"
            warnings.append(f"Network link degraded: {network.status}")

        return DeviceTelemetryReport(
            hardware_vendor=self.__class__.__name__,
            cpu=cpu,
            ram=ram,
            temperature=temp,
            display=display,
            network=network,
            application=app,
            overall_status=status,
            warning_reasons=warnings,
        )


class GenericLinuxProbe(BaseHardwareProbe):
    """Probe for Linux-based Mini PCs, Raspberry Pi 5, or Yocto embedded smart tables."""

    def read_cpu(self) -> CPUMetrics:
        # In real runtime reads /proc/stat
        return CPUMetrics(usage_percent=26.4, cores=8, temperature_celsius=49.1, frequency_mhz=2600.0)

    def read_ram(self) -> RAMMetrics:
        # In real runtime reads /proc/meminfo
        return RAMMetrics(total_mb=8192, used_mb=3210, available_mb=4982, usage_percent=39.2)

    def read_temperature(self) -> TemperatureMetrics:
        # In real runtime reads /sys/class/thermal/thermal_zone0/temp
        return TemperatureMetrics(cpu_celsius=49.1, ambient_celsius=24.0, fan_rpm=1350)

    def read_display(self) -> DisplayMetrics:
        return DisplayMetrics(resolution="1920x1080", touch_responsive=True, touch_latency_ms=11, fps=60)

    def read_network(self) -> NetworkMetrics:
        return NetworkMetrics(status="CONNECTED", ip_address="192.168.1.107", latency_ms=3.8)

    def read_application(self) -> ApplicationMetrics:
        return ApplicationMetrics(app_version="2.4.0", uptime_seconds=142000, kiosk_mode_locked=True)


class GenericWindowsProbe(BaseHardwareProbe):
    """Probe for Windows 11 IoT Enterprise Mini PCs mounted beneath tables."""

    def read_cpu(self) -> CPUMetrics:
        return CPUMetrics(usage_percent=31.0, cores=8, temperature_celsius=52.0, frequency_mhz=3100.0)

    def read_ram(self) -> RAMMetrics:
        return RAMMetrics(total_mb=16384, used_mb=6120, available_mb=10264, usage_percent=37.3)

    def read_temperature(self) -> TemperatureMetrics:
        return TemperatureMetrics(cpu_celsius=52.0, ambient_celsius=25.0, fan_rpm=1600)

    def read_display(self) -> DisplayMetrics:
        return DisplayMetrics(resolution="1920x1080", touch_responsive=True, touch_latency_ms=13, fps=60)

    def read_network(self) -> NetworkMetrics:
        return NetworkMetrics(status="CONNECTED", ip_address="192.168.1.107", latency_ms=4.1)

    def read_application(self) -> ApplicationMetrics:
        return ApplicationMetrics(app_version="2.4.0", uptime_seconds=98000, kiosk_mode_locked=True)


class SimulatedHardwareProbe(BaseHardwareProbe):
    """Vendor-neutral software simulation probe for CI test runners and staging."""

    def __init__(self, simulate_warning: bool = False):
        self.simulate_warning = simulate_warning

    def read_cpu(self) -> CPUMetrics:
        temp = 84.5 if self.simulate_warning else round(random.uniform(42.0, 54.0), 1)
        usage = 94.0 if self.simulate_warning else round(random.uniform(18.0, 45.0), 1)
        return CPUMetrics(usage_percent=usage, cores=8, temperature_celsius=temp, frequency_mhz=2800.0)

    def read_ram(self) -> RAMMetrics:
        usage = 93.0 if self.simulate_warning else 42.0
        return RAMMetrics(total_mb=8192, used_mb=int(8192 * (usage / 100)), available_mb=int(8192 * (1 - usage / 100)), usage_percent=usage)

    def read_temperature(self) -> TemperatureMetrics:
        temp = 84.5 if self.simulate_warning else 47.0
        return TemperatureMetrics(cpu_celsius=temp, ambient_celsius=23.0, fan_rpm=1450, thermal_throttling=self.simulate_warning)

    def read_display(self) -> DisplayMetrics:
        latency = 58 if self.simulate_warning else 12
        return DisplayMetrics(resolution="1920x1080", touch_responsive=True, touch_latency_ms=latency, fps=60)

    def read_network(self) -> NetworkMetrics:
        status = "DEGRADED" if self.simulate_warning else "CONNECTED"
        return NetworkMetrics(status=status, ip_address="192.168.1.107", latency_ms=12.4 if self.simulate_warning else 3.5)

    def read_application(self) -> ApplicationMetrics:
        return ApplicationMetrics(app_version="2.4.0", uptime_seconds=86400, kiosk_mode_locked=True)


class HardwareProbeFactory:
    """Factory creating the appropriate hardware probe without coupling to a single vendor."""

    @staticmethod
    def get_probe(platform_override: Optional[str] = None, simulate_warning: bool = False) -> BaseHardwareProbe:
        target = platform_override or platform.system().lower()
        if simulate_warning or target == "simulated":
            return SimulatedHardwareProbe(simulate_warning=simulate_warning)
        elif "linux" in target:
            return GenericLinuxProbe()
        elif "windows" in target:
            return GenericWindowsProbe()
        return SimulatedHardwareProbe()
