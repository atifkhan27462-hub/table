from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db, require_roles, verify_tenant_access
from app.models import User
from app.schemas.analytics import AuditLogOut
from app.schemas.common import ApiResponse
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/audit", tags=["Security & Compliance Audit Trail"])


@router.get("/logs", response_model=ApiResponse[List[AuditLogOut]], summary="Get security and operational audit trail logs")
def list_audit_logs(
    restaurant_id: Optional[str] = None,
    db: Session = Depends(get_db),
    _user: User = Depends(require_roles("SUPER_ADMIN", "RESTAURANT_ADMIN")),
):
    target_rid = restaurant_id or _user.restaurant_id
    if target_rid:
        verify_tenant_access(_user, target_rid)
    logs = AnalyticsService.list_audit_logs(db, target_rid)
    return ApiResponse(data=[AuditLogOut.model_validate(l) for l in logs])
