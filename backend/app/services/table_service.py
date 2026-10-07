from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional
from sqlalchemy.orm import Session
from app.core.errors import EntityNotFoundException, ValidationException
from app.models import Session as TableSession, Table, TableDevice
from app.schemas.table import SessionCreate, TableCreate, TableDeviceOut, TableTelemetryUpdate, TableUpdate
from app.services.device_agent.evaluator import DeviceHealthEvaluator


class TableService:
    @staticmethod
    def list_tables(db: Session, restaurant_id: Optional[str] = None) -> List[Table]:
        query = db.query(Table).filter(Table.is_deleted == False)
        if restaurant_id:
            query = query.filter(Table.restaurant_id == restaurant_id)
        return query.order_by(Table.table_number).all()

    @staticmethod
    def get_table_by_id(db: Session, table_id: str) -> Table:
        table = db.query(Table).filter(Table.id == table_id, Table.is_deleted == False).first()
        if not table:
            raise EntityNotFoundException("Table", table_id)
        return table

    @staticmethod
    def create_table(db: Session, restaurant_id: str, data: TableCreate) -> Table:
        existing = db.query(Table).filter_by(
            restaurant_id=restaurant_id, table_number=data.table_number, is_deleted=False
        ).first()
        if existing:
            raise ValidationException(f"Table with number '{data.table_number}' already exists in this restaurant.")

        table = Table(
            restaurant_id=restaurant_id,
            table_number=data.table_number,
            name=data.name,
            capacity=data.capacity,
            section=data.section or "Main Dining Room",
            status="AVAILABLE",
            is_active=True,
        )
        db.add(table)
        db.commit()
        db.refresh(table)
        return table

    @staticmethod
    def update_table(db: Session, table_id: str, data: TableUpdate) -> Table:
        table = TableService.get_table_by_id(db, table_id)
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(table, key, value)
        db.commit()
        db.refresh(table)
        return table

    @staticmethod
    def update_table_status(db: Session, table_id: str, status: str) -> Table:
        table = TableService.get_table_by_id(db, table_id)
        table.status = status.upper()
        db.commit()
        db.refresh(table)
        return table

    # Device & Telemetry
    @staticmethod
    def enrich_device_out(device: TableDevice) -> TableDeviceOut:
        status, human_hb, alerts = DeviceHealthEvaluator.evaluate_health(device)

        sec_since = None
        if device.last_heartbeat:
            lh = device.last_heartbeat
            if lh.tzinfo is None:
                lh = lh.replace(tzinfo=timezone.utc)
            sec_since = round(max((datetime.now(timezone.utc) - lh).total_seconds(), 0.0), 1)

        table_num = device.table.table_number if device.table else None
        rest_id = device.restaurant_id or (device.table.restaurant_id if device.table else None)

        return TableDeviceOut(
            id=device.id,
            table_id=device.table_id,
            table_number=table_num,
            restaurant_id=rest_id,
            device_token=device.device_token,
            hardware_id=device.hardware_id,
            mac_address=device.mac_address,
            ip_address=device.ip_address,
            network_status=device.network_status or "CONNECTED",
            app_version=device.app_version or "1.0.0",
            screen_resolution=device.screen_resolution or "1920x1080",
            status=status,
            last_heartbeat=device.last_heartbeat,
            last_heartbeat_human=human_hb,
            seconds_since_heartbeat=sec_since,
            telemetry=device.telemetry,
            kiosk_mode_enabled=device.kiosk_mode_enabled if device.kiosk_mode_enabled is not None else True,
            warning_alerts=alerts,
            is_active=device.is_active,
        )

    @staticmethod
    def list_devices(db: Session, restaurant_id: Optional[str] = None) -> List[TableDevice]:
        query = db.query(TableDevice).filter(TableDevice.is_active == True)
        if restaurant_id:
            query = query.filter(TableDevice.restaurant_id == restaurant_id)
        return query.all()

    @staticmethod
    def get_device_by_id(db: Session, device_id: str) -> TableDevice:
        device = db.query(TableDevice).filter_by(id=device_id).first()
        if not device:
            raise EntityNotFoundException("TableDevice", device_id)
        return device

    @staticmethod
    def record_device_telemetry(db: Session, device_id: str, data: TableTelemetryUpdate) -> TableDevice:
        device = TableService.get_device_by_id(db, device_id)

        device.last_heartbeat = datetime.now(timezone.utc)
        if data.hardware_id:
            device.hardware_id = data.hardware_id
        if data.ip_address:
            device.ip_address = data.ip_address
        if data.app_version:
            device.app_version = data.app_version
        if data.screen_resolution:
            device.screen_resolution = data.screen_resolution
        if data.network_status:
            device.network_status = data.network_status
        if data.kiosk_active is not None:
            device.kiosk_mode_enabled = data.kiosk_active
        if data.telemetry:
            merged = dict(device.telemetry or {})
            merged.update(data.telemetry)
            device.telemetry = merged

        status, _, _ = DeviceHealthEvaluator.evaluate_health(device)
        device.status = status

        db.commit()
        db.refresh(device)
        return device

    @staticmethod
    def toggle_kiosk_mode(db: Session, device_id: str, enabled: bool, pin: Optional[str] = None) -> TableDevice:
        device = TableService.get_device_by_id(db, device_id)
        device.kiosk_mode_enabled = enabled
        if pin:
            device.kiosk_pin = pin
        db.commit()
        db.refresh(device)
        return device

    # Table Dining Sessions
    @staticmethod
    def list_sessions(db: Session, table_id: Optional[str] = None, status: Optional[str] = None) -> List[TableSession]:
        query = db.query(TableSession)
        if table_id:
            query = query.filter(TableSession.table_id == table_id)
        if status:
            query = query.filter(TableSession.status == status)
        return query.order_by(TableSession.opened_at.desc()).all()

    @staticmethod
    def get_active_session(db: Session, table_id: str) -> Optional[TableSession]:
        return db.query(TableSession).filter_by(table_id=table_id, status="ACTIVE").first()

    @staticmethod
    def open_session(db: Session, data: SessionCreate) -> TableSession:
        table = TableService.get_table_by_id(db, data.table_id)
        active = TableService.get_active_session(db, data.table_id)
        if active:
            return active

        now = datetime.now(timezone.utc)
        session = TableSession(
            table_id=table.id,
            guest_count=data.guest_count,
            status="ACTIVE",
            opened_at=now,
            total_spent=Decimal("0.00"),
            notes=data.notes,
        )
        table.status = "OCCUPIED"
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

    @staticmethod
    def close_session(db: Session, session_id: str, notes: Optional[str] = None) -> TableSession:
        session = db.query(TableSession).filter_by(id=session_id).first()
        if not session:
            raise EntityNotFoundException("Session", session_id)

        session.status = "COMPLETED"
        session.closed_at = datetime.now(timezone.utc)
        if notes:
            session.notes = notes

        # Free the table
        if session.table:
            session.table.status = "AVAILABLE"

        db.commit()
        db.refresh(session)
        return session

    @staticmethod
    def delete_table(db: Session, table_id: str) -> bool:
        table = TableService.get_table_by_id(db, table_id)
        table.is_deleted = True
        table.is_active = False
        db.commit()
        return True

    @staticmethod
    def reset_all_status(db: Session, status: str = "AVAILABLE") -> int:
        tables = db.query(Table).filter(Table.is_deleted == False).all()
        for t in tables:
            t.status = status.upper()
        db.commit()
        return len(tables)

