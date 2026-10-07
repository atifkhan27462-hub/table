from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class HourlyRevenueOut(BaseModel):
    hour: str
    revenue: Decimal
    order_count: int


class TopDishOut(BaseModel):
    product_name: str
    units_sold: int
    revenue: Decimal
    category: Optional[str] = None
    percentage_of_sales: Optional[float] = None


class CategoryPerformanceOut(BaseModel):
    category_id: Optional[str] = None
    category_name: str
    units_sold: int
    revenue: Decimal
    percentage_of_sales: float


class SectionUtilizationOut(BaseModel):
    section: str
    total_tables: int
    occupied_tables: int
    utilization_rate_percent: float


class HourlyAnalyticsOut(BaseModel):
    hour: str
    revenue: Decimal
    order_count: int
    avg_prep_time_minutes: int


class TimelinePointOut(BaseModel):
    label: str
    timestamp: Optional[str] = None
    revenue: Decimal
    orders: int
    average_order_value: Decimal


class SalesMetricsOut(BaseModel):
    gross_sales: Decimal
    net_sales: Decimal
    tax_collected: Decimal
    tips_collected: Decimal
    average_order_value: Decimal
    currency: str = "USD"


class OrderMetricsOut(BaseModel):
    total_orders: int
    completed_orders: int
    active_orders: int
    cancelled_orders: int
    cancellation_rate_percent: float


class TableUtilizationMetricsOut(BaseModel):
    total_tables: int
    occupied_tables: int
    available_tables: int
    utilization_rate_percent: float
    average_session_minutes: int
    sections: List[SectionUtilizationOut] = []


class KitchenPerformanceMetricsOut(BaseModel):
    average_prep_time_minutes: int
    target_prep_time_minutes: int = 15
    on_time_rate_percent: float
    total_tickets_prepared: int
    station_throughput: Dict[str, int] = {}
    prep_time_by_station: Dict[str, int] = {}


class PeakHoursMetricsOut(BaseModel):
    peak_sales_hour: str
    peak_order_hour: str
    highest_hourly_revenue: Decimal
    highest_hourly_orders: int
    hourly_distribution: List[HourlyAnalyticsOut] = []


class DateRangeInfo(BaseModel):
    preset: str
    start_date: str
    end_date: str
    is_custom: bool = False


class AnalyticsDashboardResponse(BaseModel):
    # Backward compatible fields
    total_revenue_today: Decimal
    active_tables_count: int
    total_orders_today: int
    average_ticket_time_minutes: int
    popular_dishes: List[TopDishOut] = []
    hourly_sales: List[HourlyRevenueOut] = []

    # Phase 12 comprehensive trusted metrics
    sales: SalesMetricsOut
    orders: OrderMetricsOut
    table_utilization: TableUtilizationMetricsOut
    kitchen_performance: KitchenPerformanceMetricsOut
    peak_hours: PeakHoursMetricsOut
    popular_products: List[TopDishOut] = []
    category_performance: List[CategoryPerformanceOut] = []
    timeline: List[TimelinePointOut] = []
    date_range: DateRangeInfo


class DailyReportResponse(BaseModel):
    report_date: str
    total_revenue: Decimal
    total_tax: Decimal
    total_tips: Decimal
    total_orders: int
    payment_methods_breakdown: Dict[str, Decimal] = {}
    station_throughput: Dict[str, int] = {}
    average_order_value: Optional[Decimal] = None
    cancellation_rate_percent: Optional[float] = None
    table_occupancy_rate_percent: Optional[float] = None


class ExecutiveSummaryReport(BaseModel):
    restaurant_name: str
    generated_at: str
    date_range: DateRangeInfo
    sales: SalesMetricsOut
    orders: OrderMetricsOut
    table_utilization: TableUtilizationMetricsOut
    kitchen: KitchenPerformanceMetricsOut
    top_categories: List[CategoryPerformanceOut] = []
    top_products: List[TopDishOut] = []


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    actor_id: Optional[str] = None
    actor_type: str
    action: str
    entity_name: str
    entity_id: Optional[str] = None
    ip_address: Optional[str] = None
    diff_before: Optional[Dict[str, Any]] = None
    diff_after: Optional[Dict[str, Any]] = None
    status: str
    created_at: datetime
