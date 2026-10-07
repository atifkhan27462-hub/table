import json
import time
import uuid
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import SessionLocal
from app.core.logging import logger
from app.core.security import decode_access_token
from app.core.websocket_manager import ws_manager
from app.models import Restaurant, Table
from app.schemas.realtime import (
    RealtimeClientMessage,
    RealtimeEvent,
    RealtimeEventType,
)

router = APIRouter(tags=["Real-time Order Engine & WebSockets"])


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: Optional[str] = None,
    client_type: Optional[str] = None,
    table_id: Optional[str] = None,
    station: Optional[str] = None,
):
    """
    Bi-directional Real-time WebSocket Gateway.
    Connects:
      - 32-Inch Touchscreen Dining Tables (?client_type=table&table_id=<id>)
      - Kitchen Display System Screens (?client_type=kds&station=<station>)
      - Admin & Operations Dashboards (?client_type=admin&token=<jwt>)
    """
    db: Session = SessionLocal()
    authenticated_user_id: Optional[str] = None
    authenticated_role: Optional[str] = None
    restaurant_id: Optional[str] = None
    resolved_client_type: str = client_type or "admin"

    try:
        # 1. Authentication & Identity Resolution
        if token:
            try:
                payload = decode_access_token(token)
                authenticated_user_id = payload.get("sub")
                authenticated_role = payload.get("role")
                restaurant_id = payload.get("restaurant_id")

                if authenticated_role == "KITCHEN":
                    resolved_client_type = "kds"
                elif authenticated_role in ("SUPERADMIN", "MANAGER", "WAITER"):
                    resolved_client_type = "admin"
                elif authenticated_role == "TABLE_DEVICE":
                    resolved_client_type = "table"
            except Exception as auth_err:
                logger.warning(f"WebSocket auth failed: {auth_err}")
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid authentication token")
                return

        # 2. Table Device Validation & Resolution
        if table_id or resolved_client_type == "table":
            resolved_client_type = "table"
            if not table_id:
                # If no table_id specified for table client, reject
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="table_id required for table clients")
                return

            table = db.query(Table).filter_by(id=table_id).first()
            if not table:
                logger.warning(f"WebSocket table client rejected - table {table_id} does not exist.")
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Table not found")
                return

            restaurant_id = table.restaurant_id

        # 3. KDS Client Resolution
        elif resolved_client_type == "kds":
            if not restaurant_id:
                # Fallback to primary active restaurant
                primary_rest = db.query(Restaurant).filter_by(is_active=True).first()
                if primary_rest:
                    restaurant_id = primary_rest.id

        # 4. Admin Client Validation
        elif resolved_client_type == "admin":
            if not authenticated_user_id and not token:
                if not settings.DEBUG and settings.ENVIRONMENT == "production":
                    logger.warning("Unauthenticated admin WebSocket connection rejected in production.")
                    await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication token required for admin console")
                    return
                # In development mode, allow dev admin connection if restaurant exists
                primary_rest = db.query(Restaurant).filter_by(is_active=True).first()
                if primary_rest:
                    restaurant_id = primary_rest.id
                authenticated_role = "MANAGER"

        # Accept the WebSocket handshake
        await websocket.accept()

        conn_id = f"conn_{uuid.uuid4().hex[:12]}"
        # Send Initial Handshake Acknowledgment first so client always receives ACK as first frame
        welcome_event = RealtimeEvent(
            type=RealtimeEventType.ACK,
            restaurant_id=restaurant_id,
            table_id=table_id,
            data={
                "connection_id": conn_id,
                "client_type": resolved_client_type,
                "restaurant_id": restaurant_id,
                "table_id": table_id,
                "station_code": station.upper() if station else "ALL",
                "server_time": time.time(),
                "message": "Connected to Smart Table Real-time Order Engine.",
            },
        )
        await websocket.send_text(welcome_event.model_dump_json())

        # Register with the Connection Manager (broadcasts TABLE_ONLINE to admins)
        conn = await ws_manager.register(
            websocket=websocket,
            client_type=resolved_client_type,
            restaurant_id=restaurant_id,
            table_id=table_id,
            station_code=station,
            user_id=authenticated_user_id,
            role=authenticated_role,
        )

        MAX_WS_MESSAGE_BYTES = 65536  # 64 KB limit to defend against payload bloat DoS

        # 5. Inbound Message Processing Loop
        while True:
            text_data = await websocket.receive_text()
            if len(text_data) > MAX_WS_MESSAGE_BYTES:
                logger.warning(f"Oversized WebSocket message dropped ({len(text_data)} bytes).")
                err_event = RealtimeEvent(
                    type=RealtimeEventType.ERROR,
                    data={"message": f"Payload exceeds maximum allowed frame limit ({MAX_WS_MESSAGE_BYTES} bytes)."},
                )
                await conn.websocket.send_text(err_event.model_dump_json())
                continue

            try:
                raw_payload = json.loads(text_data)
                client_msg = RealtimeClientMessage.model_validate(raw_payload)

                # Duplicate Event Protection for inbound messages
                if client_msg.event_id and ws_manager.is_duplicate_event(client_msg.event_id):
                    logger.debug(f"Duplicate client message dropped: {client_msg.event_id}")
                    continue

                msg_type = client_msg.type.upper()

                # Heartbeat Ping/Pong Protocol
                if msg_type == "PING":
                    ws_manager.record_heartbeat(conn.connection_id)
                    pong_event = RealtimeEvent(
                        type=RealtimeEventType.PONG,
                        restaurant_id=restaurant_id,
                        table_id=table_id,
                        data={
                            "server_time": time.time(),
                            "connection_id": conn.connection_id,
                        },
                    )
                    await conn.websocket.send_text(pong_event.model_dump_json())

                elif msg_type in ("STAFF_CALL", "STAFF_ASSISTANCE_REQUESTED"):
                    tbl_label = f"Table {table_id[:4]}" if table_id else "Table"
                    if table_id:
                        tbl_obj = db.query(Table).filter_by(id=table_id).first()
                        if tbl_obj:
                            tbl_label = tbl_obj.table_number

                    call_type = (client_msg.data or {}).get("call_type", "Server Call")
                    from datetime import datetime, timezone
                    alert_event = RealtimeEvent(
                        type=RealtimeEventType.STAFF_ASSISTANCE_REQUESTED,
                        restaurant_id=restaurant_id,
                        table_id=table_id,
                        data={
                            "table_id": table_id,
                            "table_number": tbl_label,
                            "call_type": call_type,
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                        },
                    )
                    await ws_manager.broadcast(alert_event)

                elif msg_type == "STAFF_ASSISTANCE_RESOLVED":
                    from datetime import datetime, timezone
                    resolved_event = RealtimeEvent(
                        type=RealtimeEventType.STAFF_ASSISTANCE_RESOLVED,
                        restaurant_id=restaurant_id,
                        table_id=table_id,
                        data={
                            "table_id": table_id,
                            "table_number": (client_msg.data or {}).get("table_number", "Table"),
                            "call_type": (client_msg.data or {}).get("call_type", "Server Call"),
                            "resolved_at": datetime.now(timezone.utc).isoformat(),
                        },
                    )
                    await ws_manager.broadcast(resolved_event)

                else:
                    # Echo acknowledgment for validated events
                    ack_event = RealtimeEvent(
                        type=RealtimeEventType.ACK,
                        restaurant_id=restaurant_id,
                        table_id=table_id,
                        data={
                            "received_type": msg_type,
                            "event_id": client_msg.event_id,
                        },
                    )
                    await conn.websocket.send_text(ack_event.model_dump_json())

            except json.JSONDecodeError:
                err_event = RealtimeEvent(
                    type=RealtimeEventType.ERROR,
                    data={"message": "Malformed JSON payload."},
                )
                await conn.websocket.send_text(err_event.model_dump_json())
            except Exception as proc_err:
                logger.error(f"Error handling inbound WebSocket message: {proc_err}")
                err_event = RealtimeEvent(
                    type=RealtimeEventType.ERROR,
                    data={"message": f"Processing error: {str(proc_err)}"},
                )
                await conn.websocket.send_text(err_event.model_dump_json())

    except WebSocketDisconnect:
        if 'conn' in locals():
            await ws_manager.unregister(conn.connection_id)
    except Exception as exc:
        logger.error(f"WebSocket session terminated abnormally: {exc}")
        if 'conn' in locals():
            await ws_manager.unregister(conn.connection_id)
    finally:
        db.close()
