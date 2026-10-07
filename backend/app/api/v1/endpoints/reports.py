from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.api.deps import get_db, require_roles, verify_tenant_access
from app.models import User
from app.schemas.analytics import DailyReportResponse, ExecutiveSummaryReport
from app.schemas.common import ApiResponse
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/reports", tags=["Executive Financial & Sales Reports"])


@router.get("/daily", response_model=ApiResponse[DailyReportResponse], summary="Get end-of-day sales, tax, tips, and throughput breakdown")
def get_daily_report(
    restaurant_id: Optional[str] = None,
    db: Session = Depends(get_db),
    _user: User = Depends(require_roles("SUPER_ADMIN", "RESTAURANT_ADMIN", "MANAGER")),
):
    target_rid = restaurant_id or _user.restaurant_id
    if target_rid:
        verify_tenant_access(_user, target_rid)
    report = AnalyticsService.get_daily_report(db, target_rid)
    return ApiResponse(data=report)


@router.get("/summary", response_model=ApiResponse[ExecutiveSummaryReport], summary="Get consolidated executive restaurant performance report")
def get_executive_summary_report(
    preset: Optional[str] = Query("today", description="Date preset: today, yesterday, last_7_days, last_30_days, this_month, all_time, custom"),
    start_date: Optional[str] = Query(None, description="ISO start date YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="ISO end date YYYY-MM-DD"),
    restaurant_id: Optional[str] = None,
    db: Session = Depends(get_db),
    _user: User = Depends(require_roles("SUPER_ADMIN", "RESTAURANT_ADMIN", "MANAGER")),
):
    target_rid = restaurant_id or _user.restaurant_id
    if target_rid:
        verify_tenant_access(_user, target_rid)
    report = AnalyticsService.get_executive_summary_report(
        db=db,
        restaurant_id=target_rid,
        preset=preset,
        start_date=start_date,
        end_date=end_date,
    )
    return ApiResponse(data=report)
