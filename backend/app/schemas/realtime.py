from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, Optional
import uuid
from pydantic import BaseModel, Field


class RealtimeEventType(str, Enum):
    # Core Order Lifecycle Events
    ORDER_CREATED = "ORDER_CREATED"
    ORDER_ACCEPTED = "ORDER_ACCEPTED"
    ORDER_PREPARING = "ORDER_PREPARING"
    ORDER_READY = "ORDER_READY"
    ORDER_SERVED = "ORDER_SERVED"
    ORDER_COMPLETED = "ORDER_COMPLETED"
    ORDER_CANCELLED = "ORDER_CANCELLED"

    # Staff Service & Waiter Alerts
    STAFF_ASSISTANCE_REQUESTED = "STAFF_ASSISTANCE_REQUESTED"
    STAFF_ASSISTANCE_RESOLVED = "STAFF_ASSISTANCE_RESOLVED"

    # Hardware & Table Telemetry Events
    TABLE_ONLINE = "TABLE_ONLINE"
    TABLE_OFFLINE = "TABLE_OFFLINE"

    # Intelligence Layer Events
    AI_GENERATION_COMPLETED = "AI_GENERATION_COMPLETED"

    # Heartbeat & Protocol Handshake
    PING = "PING"
    PONG = "PONG"
    ERROR = "ERROR"
    ACK = "ACK"


class RealtimeEvent(BaseModel):
    """
    Standardized Realtime Event Envelope for all connected Table, KDS, and Admin clients.
    Includes unique event_id for strict client-side deduplication.
    """
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: RealtimeEventType
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    restaurant_id: Optional[str] = None
    table_id: Optional[str] = None
    data: Dict[str, Any] = Field(default_factory=dict)


class RealtimeClientMessage(BaseModel):
    """
    Payload sent by a connected client (Table, KDS, Admin) to the WebSocket endpoint.
    """
    type: str
    event_id: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    idempotency_key: Optional[str] = None
