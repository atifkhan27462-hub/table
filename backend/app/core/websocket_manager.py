import asyncio
from dataclasses import dataclass
from datetime import datetime, timezone
import json
import time
from typing import Any, Dict, List, Optional, Set
import uuid
from fastapi import WebSocket
from app.core.logging import logger
from app.schemas.realtime import RealtimeEvent, RealtimeEventType


@dataclass
class WebSocketConnection:
    connection_id: str
    websocket: WebSocket
    client_type: str  # "table" | "kds" | "admin"
    restaurant_id: Optional[str]
    table_id: Optional[str] = None
    station_code: Optional[str] = None  # For KDS (e.g. "GRILL", "SAUTE", "ALL")
    user_id: Optional[str] = None
    role: Optional[str] = None
    last_heartbeat: float = 0.0
    connected_at: str = ""


class ConnectionManager:
    """
    Enterprise Realtime WebSocket Connection Manager.
    Handles targeted routing, strict multi-tenant authorization, heartbeat tracking,
    and event deduplication across Table Touchscreens, Kitchen Display Systems, and Admin Consoles.
    """

    def __init__(self):
        # Maps connection_id -> WebSocketConnection
        self._connections: Dict[str, WebSocketConnection] = {}
        # Maps table_id -> Set[connection_id]
        self._table_connections: Dict[str, Set[str]] = {}
        # Seen event_ids for duplicate event protection: event_id -> expiration_timestamp
        self._seen_events: Dict[str, float] = {}
        self._dedup_window_seconds: float = 60.0
        self._last_dedup_prune: float = 0.0
        self._max_dedup_cache_size: int = 5000
        self._lock = asyncio.Lock()
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    def set_event_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop

    def dispatch_sync(self, event: RealtimeEvent) -> None:
        """
        Dispatches an event from any synchronous caller or thread into the
        active asyncio WebSocket broadcasting pipeline.
        """
        try:
            import anyio.from_thread
            anyio.from_thread.run(self.broadcast, event)
            return
        except Exception:
            pass

        try:
            current_loop = None
            try:
                current_loop = asyncio.get_running_loop()
            except RuntimeError:
                pass

            if current_loop and current_loop.is_running():
                current_loop.create_task(self.broadcast(event))
                return

            if self._loop and self._loop.is_running():
                asyncio.run_coroutine_threadsafe(self.broadcast(event), self._loop)
                return

            # Standalone runner
            asyncio.run(self.broadcast(event))
        except Exception as e:
            logger.debug(f"Sync event dispatch warning: {e}")

    @property
    def active_connection_count(self) -> int:
        return len(self._connections)

    def is_table_online(self, table_id: str) -> bool:
        """Checks if a table touchscreen device has any active socket connections."""
        return len(self._table_connections.get(table_id, set())) > 0

    async def register(
        self,
        websocket: WebSocket,
        client_type: str,
        restaurant_id: Optional[str],
        table_id: Optional[str] = None,
        station_code: Optional[str] = None,
        user_id: Optional[str] = None,
        role: Optional[str] = None,
    ) -> WebSocketConnection:
        """
        Registers an authenticated WebSocket connection.
        If this is the table's first connection, emits TABLE_ONLINE to Admin dashboards.
        """
        conn_id = f"conn_{uuid.uuid4().hex[:12]}"
        now = time.time()
        conn = WebSocketConnection(
            connection_id=conn_id,
            websocket=websocket,
            client_type=client_type,
            restaurant_id=restaurant_id,
            table_id=table_id,
            station_code=station_code.upper() if station_code else "ALL",
            user_id=user_id,
            role=role,
            last_heartbeat=now,
            connected_at=datetime.now(timezone.utc).isoformat(),
        )

        async with self._lock:
            self._connections[conn_id] = conn

            was_table_offline = False
            if table_id and client_type == "table":
                if table_id not in self._table_connections:
                    self._table_connections[table_id] = set()
                was_table_offline = len(self._table_connections[table_id]) == 0
                self._table_connections[table_id].add(conn_id)

        logger.info(
            f"WebSocket Connected: [{conn_id}] type={client_type} table={table_id} "
            f"restaurant={restaurant_id} total_active={len(self._connections)}"
        )

        # Notify admins that table hardware has come online
        if was_table_offline and table_id and restaurant_id:
            online_event = RealtimeEvent(
                type=RealtimeEventType.TABLE_ONLINE,
                restaurant_id=restaurant_id,
                table_id=table_id,
                data={
                    "table_id": table_id,
                    "status": "ONLINE",
                    "connected_at": conn.connected_at,
                    "message": f"Table device {table_id} is now online.",
                },
            )
            await self.broadcast(online_event)

        return conn

    async def unregister(self, connection_id: str) -> None:
        """
        Removes a connection. If a table device completely disconnects,
        emits TABLE_OFFLINE to Admin dashboards.
        """
        conn: Optional[WebSocketConnection] = None
        became_table_offline = False
        table_id: Optional[str] = None
        restaurant_id: Optional[str] = None

        async with self._lock:
            conn = self._connections.pop(connection_id, None)
            if conn and conn.table_id and conn.client_type == "table":
                table_id = conn.table_id
                restaurant_id = conn.restaurant_id
                if table_id in self._table_connections:
                    self._table_connections[table_id].discard(connection_id)
                    if len(self._table_connections[table_id]) == 0:
                        became_table_offline = True
                        del self._table_connections[table_id]

        if conn:
            logger.info(
                f"WebSocket Disconnected: [{connection_id}] type={conn.client_type} "
                f"table={conn.table_id} remaining_active={len(self._connections)}"
            )

        # Notify admins that table hardware went offline
        if became_table_offline and table_id and restaurant_id:
            offline_event = RealtimeEvent(
                type=RealtimeEventType.TABLE_OFFLINE,
                restaurant_id=restaurant_id,
                table_id=table_id,
                data={
                    "table_id": table_id,
                    "status": "OFFLINE",
                    "disconnected_at": datetime.now(timezone.utc).isoformat(),
                    "message": f"Table device {table_id} went offline.",
                },
            )
            await self.broadcast(offline_event)

    def record_heartbeat(self, connection_id: str) -> None:
        """Updates the last_heartbeat timestamp for a connection."""
        if connection_id in self._connections:
            self._connections[connection_id].last_heartbeat = time.time()

    def is_duplicate_event(self, event_id: str) -> bool:
        """
        Duplicate Event Protection:
        Verifies whether an event has already been processed within the dedup window.
        Uses size/time-throttled pruning to prevent memory exhaustion and eliminate per-event dict allocation.
        """
        if not event_id:
            return False

        now = time.time()
        # Throttled cleanup: only prune if interval exceeded (e.g. 15s) or cache size > 500
        if len(self._seen_events) > 500 or (now - self._last_dedup_prune > 15.0):
            self._seen_events = {
                eid: exp for eid, exp in self._seen_events.items() if exp > now
            }
            # Enforce hard cap to prevent unbounded growth under DoS/flood
            if len(self._seen_events) > self._max_dedup_cache_size:
                sorted_keys = sorted(self._seen_events.keys(), key=lambda k: self._seen_events[k])
                for k in sorted_keys[: len(self._seen_events) - self._max_dedup_cache_size]:
                    self._seen_events.pop(k, None)
            self._last_dedup_prune = now

        if event_id in self._seen_events:
            logger.warning(f"Duplicate event rejected by dedup window: {event_id}")
            return True

        self._seen_events[event_id] = now + self._dedup_window_seconds
        return False

    def can_client_receive_event(
        self, conn: WebSocketConnection, event: RealtimeEvent
    ) -> bool:
        """
        Strict Authorization & Scoping Matrix:
        - Ensures tables ONLY receive their own orders & table-targeted messages.
        - Ensures KDS screens receive all kitchen order actions.
        - Ensures Admins receive all operational updates within their restaurant.
        - Restricts cross-restaurant communication.
        """
        # Multi-tenant check
        if (
            event.restaurant_id
            and conn.restaurant_id
            and conn.restaurant_id != event.restaurant_id
        ):
            # Superadmins may observe all restaurants if role allows, otherwise reject
            if conn.role != "SUPERADMIN":
                return False

        event_type = event.type

        # 1. Order Lifecycle Events
        if event_type in (
            RealtimeEventType.ORDER_CREATED,
            RealtimeEventType.ORDER_ACCEPTED,
            RealtimeEventType.ORDER_PREPARING,
            RealtimeEventType.ORDER_READY,
            RealtimeEventType.ORDER_SERVED,
            RealtimeEventType.ORDER_COMPLETED,
            RealtimeEventType.ORDER_CANCELLED,
        ):
            if conn.client_type == "table":
                # Table isolation: ONLY allow if event belongs to this table
                return (
                    conn.table_id is not None
                    and event.table_id is not None
                    and str(conn.table_id).strip().lower() == str(event.table_id).strip().lower()
                )
            elif conn.client_type == "kds":
                # KDS receives order lifecycle events
                return True
            elif conn.client_type == "admin":
                # Admin console receives all restaurant order events
                return True
            return False

        # 2. Hardware / Table Status Events (Admin Console Monitoring)
        if event_type in (RealtimeEventType.TABLE_ONLINE, RealtimeEventType.TABLE_OFFLINE):
            return conn.client_type == "admin"

        # 3. AI Sommelier / Experience Events
        if event_type == RealtimeEventType.AI_GENERATION_COMPLETED:
            if conn.client_type == "table":
                return conn.table_id is not None and conn.table_id == event.table_id
            elif conn.client_type == "admin":
                return True
            return False

        # 4. Staff Service & Waiter Alerts (Dispatched to both Kitchen KDS & Admin Floor Dashboard)
        if event_type in (
            RealtimeEventType.STAFF_ASSISTANCE_REQUESTED,
            RealtimeEventType.STAFF_ASSISTANCE_RESOLVED,
        ):
            return conn.client_type in ("kds", "admin")

        # 4. Heartbeat Protocol (handled directly, not broadcasted)
        if event_type in (RealtimeEventType.PING, RealtimeEventType.PONG, RealtimeEventType.ACK):
            return True

        return True

    async def broadcast(self, event: RealtimeEvent) -> int:
        """
        Broadcasting Engine:
        Validates deduplication, checks client authorization, and sends JSON message.
        Returns the count of clients successfully dispatched to.
        """
        if self.is_duplicate_event(event.event_id):
            return 0

        # Snapshot connections to avoid iteration issues during disconnects
        connections = list(self._connections.values())
        if not connections:
            return 0

        message_text = event.model_dump_json()
        dead_connections: List[str] = []
        sent_count = 0

        for conn in connections:
            if not self.can_client_receive_event(conn, event):
                continue

            try:
                await conn.websocket.send_text(message_text)
                sent_count += 1
            except Exception as e:
                logger.warning(
                    f"Failed to dispatch event {event.type} to [{conn.connection_id}]: {e}"
                )
                dead_connections.append(conn.connection_id)

        # Clean up any dead connections
        for dead_id in dead_connections:
            await self.unregister(dead_id)

        return sent_count

    async def send_to_table(self, table_id: str, event: RealtimeEvent) -> int:
        """Sends a realtime event specifically to the given table's active devices."""
        event.table_id = table_id
        return await self.broadcast(event)

    async def send_personal(self, connection_id: str, event: RealtimeEvent) -> bool:
        """Sends an event directly to a specific connection socket."""
        conn = self._connections.get(connection_id)
        if not conn:
            return False
        try:
            await conn.websocket.send_text(event.model_dump_json())
            return True
        except Exception:
            await self.unregister(connection_id)
            return False


# Global singleton instance
ws_manager = ConnectionManager()
connection_manager = ws_manager
