from typing import List, Optional, Union
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_user_or_device, require_roles
from app.models import TableDevice, User
from app.schemas.common import ApiResponse
from app.schemas.table import SessionClose, SessionCreate, SessionOut
from app.services.table_service import TableService

router = APIRouter(prefix="/sessions", tags=["Table Dining Sessions"])


@router.get("", response_model=ApiResponse[List[SessionOut]], summary="List dining sessions")
def list_sessions(
    table_id: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    _user: User = Depends(require_roles("SUPER_ADMIN", "RESTAURANT_ADMIN", "MANAGER", "STAFF")),
):
    sessions = TableService.list_sessions(db, table_id, status)
    return ApiResponse(data=[SessionOut.model_validate(s) for s in sessions])


@router.get("/active/{table_id}", response_model=ApiResponse[Optional[SessionOut]], summary="Get active dining session for a table")
def get_active_session(table_id: str, db: Session = Depends(get_db)):
    session = TableService.get_active_session(db, table_id)
    if not session:
        return ApiResponse(data=None, message="No active session on this table.")
    return ApiResponse(data=SessionOut.model_validate(session))


@router.post("/open", response_model=ApiResponse[SessionOut], summary="Open or resume a dining session on a table")
def open_session(
    payload: SessionCreate,
    db: Session = Depends(get_db),
    _actor: Union[User, TableDevice] = Depends(get_user_or_device),
):
    session = TableService.open_session(db, payload)
    return ApiResponse(data=SessionOut.model_validate(session), message="Dining session active.")


@router.post("/{session_id}/close", response_model=ApiResponse[SessionOut], summary="Close a dining session")
def close_session(
    session_id: str,
    payload: Optional[SessionClose] = None,
    db: Session = Depends(get_db),
    _actor: Union[User, TableDevice] = Depends(get_user_or_device),
):
    notes = payload.notes if payload else None
    session = TableService.close_session(db, session_id, notes)
    return ApiResponse(data=SessionOut.model_validate(session), message="Dining session closed.")
