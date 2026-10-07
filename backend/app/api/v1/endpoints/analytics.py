from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from app.api.deps import get_db, require_roles, verify_tenant_access
from app.models import User
from app.schemas.analytics import AnalyticsDashboardResponse
from app.schemas.common import ApiResponse
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["Restaurant Analytics & Intelligence"])


@router.get("/dashboard", response_model=ApiResponse[AnalyticsDashboardResponse], summary="Get real-time operational KPI metrics")
def get_analytics_dashboard(
    preset: Optional[str] = Query("today", description="Date preset: today, yesterday, last_7_days, last_30_days, this_month, all_time, custom"),
    start_date: Optional[str] = Query(None, description="Optional ISO start date YYYY-MM-DD for custom range"),
    end_date: Optional[str] = Query(None, description="Optional ISO end date YYYY-MM-DD for custom range"),
    restaurant_id: Optional[str] = None,
    db: Session = Depends(get_db),
    _user: User = Depends(require_roles("SUPER_ADMIN", "RESTAURANT_ADMIN", "MANAGER")),
):
    target_rid = restaurant_id or _user.restaurant_id
    if target_rid:
        verify_tenant_access(_user, target_rid)
    stats = AnalyticsService.get_dashboard_summary(
        db=db,
        restaurant_id=target_rid,
        preset=preset,
        start_date=start_date,
        end_date=end_date,
    )
    return ApiResponse(data=stats)


@router.get("/export/csv", summary="Export trusted restaurant analytics data as CSV")
def export_analytics_csv(
    report_type: str = Query("sales", alias="type", description="Export type: sales, products, kitchen, categories, summary"),
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

    csv_content = AnalyticsService.generate_csv_export(
        db=db,
        restaurant_id=target_rid,
        report_type=report_type,
        preset=preset,
        start_date=start_date,
        end_date=end_date,
    )

    filename_date = datetime.now(timezone.utc).strftime("%Y%m%d")
    filename = f"restaurant_analytics_{report_type}_{preset}_{filename_date}.csv"

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache",
        },
    )
