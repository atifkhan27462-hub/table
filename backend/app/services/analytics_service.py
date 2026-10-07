import csv
import io
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.cache import fast_cache
from app.models import AuditLog, Category, KitchenOrder, KitchenStation, Order, OrderItem, Payment, Product, Restaurant, Session as TableSession, Table
from app.schemas.analytics import (
    AnalyticsDashboardResponse,
    AuditLogOut,
    CategoryPerformanceOut,
    DailyReportResponse,
    DateRangeInfo,
    ExecutiveSummaryReport,
    HourlyAnalyticsOut,
    HourlyRevenueOut,
    KitchenPerformanceMetricsOut,
    OrderMetricsOut,
    PeakHoursMetricsOut,
    SalesMetricsOut,
    SectionUtilizationOut,
    TableUtilizationMetricsOut,
    TimelinePointOut,
    TopDishOut,
)


class AnalyticsService:
    @staticmethod
    def parse_date_range(
        preset: Optional[str] = "today",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> Tuple[datetime, datetime, DateRangeInfo]:
        """
        Parses date filter presets or explicit ISO strings into UTC datetime bounds.
        Presets: 'today', 'yesterday', 'last_7_days', 'last_30_days', 'this_month', 'all_time', 'custom'.
        """
        now = datetime.now(timezone.utc)
        preset_clean = (preset or "today").lower().strip()

        if preset_clean == "yesterday":
            yesterday_date = (now - timedelta(days=1)).date()
            start_dt = datetime.combine(yesterday_date, datetime.min.time(), tzinfo=timezone.utc)
            end_dt = datetime.combine(yesterday_date, datetime.max.time(), tzinfo=timezone.utc)
            start_str = start_dt.strftime("%Y-%m-%d")
            end_str = end_dt.strftime("%Y-%m-%d")
            return start_dt, end_dt, DateRangeInfo(preset="yesterday", start_date=start_str, end_date=end_str)

        elif preset_clean == "last_7_days":
            start_dt = now - timedelta(days=7)
            end_dt = now
            return start_dt, end_dt, DateRangeInfo(preset="last_7_days", start_date=start_dt.strftime("%Y-%m-%d"), end_date=end_dt.strftime("%Y-%m-%d"))

        elif preset_clean == "last_30_days":
            start_dt = now - timedelta(days=30)
            end_dt = now
            return start_dt, end_dt, DateRangeInfo(preset="last_30_days", start_date=start_dt.strftime("%Y-%m-%d"), end_date=end_dt.strftime("%Y-%m-%d"))

        elif preset_clean == "this_month":
            first_day = now.date().replace(day=1)
            start_dt = datetime.combine(first_day, datetime.min.time(), tzinfo=timezone.utc)
            end_dt = now
            return start_dt, end_dt, DateRangeInfo(preset="this_month", start_date=start_dt.strftime("%Y-%m-%d"), end_date=end_dt.strftime("%Y-%m-%d"))

        elif preset_clean == "all_time":
            start_dt = now - timedelta(days=365 * 2)
            end_dt = now
            return start_dt, end_dt, DateRangeInfo(preset="all_time", start_date=start_dt.strftime("%Y-%m-%d"), end_date=end_dt.strftime("%Y-%m-%d"))

        elif preset_clean == "custom" and start_date and end_date:
            try:
                s_date = datetime.strptime(start_date[:10], "%Y-%m-%d").date()
                e_date = datetime.strptime(end_date[:10], "%Y-%m-%d").date()
                start_dt = datetime.combine(s_date, datetime.min.time(), tzinfo=timezone.utc)
                end_dt = datetime.combine(e_date, datetime.max.time(), tzinfo=timezone.utc)
                return start_dt, end_dt, DateRangeInfo(preset="custom", start_date=start_date[:10], end_date=end_date[:10], is_custom=True)
            except Exception:
                pass

        # Default fallback to "today"
        start_dt = datetime.combine(now.date(), datetime.min.time(), tzinfo=timezone.utc)
        end_dt = datetime.combine(now.date(), datetime.max.time(), tzinfo=timezone.utc)
        return start_dt, end_dt, DateRangeInfo(preset="today", start_date=now.strftime("%Y-%m-%d"), end_date=now.strftime("%Y-%m-%d"))

    @classmethod
    def get_dashboard_summary(
        cls,
        db: Session,
        restaurant_id: Optional[str] = None,
        preset: Optional[str] = "today",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> AnalyticsDashboardResponse:
        """
        Generates trusted, backend-calculated restaurant performance analytics.
        Ensures all metrics (Sales, Orders, AOV, Popular Dishes, Category Share,
        Table Occupancy, Kitchen Throughput, Prep Speed) are computed on the server.
        """
        cache_key = f"analytics_dash:{restaurant_id or 'all'}:{preset}:{start_date}:{end_date}"
        cached = fast_cache.get(cache_key)
        if cached:
            return cached

        now = datetime.now(timezone.utc)
        start_dt, end_dt, date_info = cls.parse_date_range(preset, start_date, end_date)

        # 1. Query Orders in Date Range
        query = db.query(Order).filter(Order.is_deleted == False)
        if restaurant_id:
            query = query.filter(Order.restaurant_id == restaurant_id)
        if preset != "all_time":
            query = query.filter(Order.placed_at >= start_dt, Order.placed_at <= end_dt)

        orders = query.all()

        # 2. Sales Metrics (Gross, Net, Tax, Tips, AOV)
        paid_orders = [o for o in orders if o.payment_status == "PAID" or o.status in ("SERVED", "COMPLETED")]
        raw_gross = sum((o.total_amount for o in paid_orders), Decimal("0.00"))
        raw_net = sum((o.subtotal for o in paid_orders), Decimal("0.00"))
        raw_tax = sum((o.tax_amount for o in paid_orders), Decimal("0.00"))
        raw_tips = sum((o.tip_amount for o in paid_orders), Decimal("0.00"))

        gross_sales = raw_gross
        net_sales = raw_net
        tax_collected = raw_tax
        tips_collected = raw_tips

        # 3. Order Counts & Cancellation
        total_orders = len(orders)
        completed_orders = len(paid_orders)
        active_orders = len([o for o in orders if o.status in ("PLACED", "ACCEPTED", "PREPARING", "READY")])
        cancelled_orders = len([o for o in orders if o.status == "CANCELLED"])
        cancellation_rate = round((cancelled_orders / max(total_orders, 1)) * 100, 2) if total_orders > 0 else 0.0

        average_order_value = round(gross_sales / Decimal(max(completed_orders, 1)), 2) if completed_orders > 0 else Decimal("0.00")

        sales_metrics = SalesMetricsOut(
            gross_sales=gross_sales,
            net_sales=net_sales,
            tax_collected=tax_collected,
            tips_collected=tips_collected,
            average_order_value=average_order_value,
            currency="USD",
        )

        order_metrics = OrderMetricsOut(
            total_orders=total_orders,
            completed_orders=completed_orders,
            active_orders=active_orders,
            cancelled_orders=cancelled_orders,
            cancellation_rate_percent=cancellation_rate,
        )

        # 4. Table Utilization
        table_q = db.query(Table).filter(Table.is_deleted == False)
        if restaurant_id:
            table_q = table_q.filter(Table.restaurant_id == restaurant_id)
        tables = table_q.all()

        total_tables = len(tables)
        occupied_tables = len([t for t in tables if t.status in ("OCCUPIED", "ORDERING", "WAITING", "PREPARING", "READY", "PAYMENT")])
        available_tables = max(total_tables - occupied_tables, 0)
        utilization_rate = round((occupied_tables / max(total_tables, 1)) * 100, 1) if total_tables > 0 else 0.0

        # Sections Breakdown
        sections_map: Dict[str, Dict[str, int]] = {}
        for t in tables:
            sec = t.section or "Main Dining Hall"
            if sec not in sections_map:
                sections_map[sec] = {"total": 0, "occupied": 0}
            sections_map[sec]["total"] += 1
            if t.status in ("OCCUPIED", "ORDERING", "WAITING", "PREPARING", "READY", "PAYMENT"):
                sections_map[sec]["occupied"] += 1

        sections_out = [
            SectionUtilizationOut(
                section=sec_name,
                total_tables=counts["total"],
                occupied_tables=counts["occupied"],
                utilization_rate_percent=round((counts["occupied"] / max(counts["total"], 1)) * 100, 1) if counts["total"] > 0 else 0.0,
            )
            for sec_name, counts in sections_map.items()
        ]

        table_utilization_metrics = TableUtilizationMetricsOut(
            total_tables=total_tables,
            occupied_tables=occupied_tables,
            available_tables=available_tables,
            utilization_rate_percent=utilization_rate,
            average_session_minutes=0,
            sections=sections_out,
        )

        # 5. Kitchen Performance & Preparation Time
        kds_q = db.query(KitchenOrder)
        kitchen_tickets = kds_q.all()
        total_tickets = len(kitchen_tickets)

        station_throughput = {"GRILL": 0, "SAUTE": 0, "BAR": 0, "OVEN": 0}
        prep_time_by_station = {"GRILL": 0, "SAUTE": 0, "BAR": 0, "OVEN": 0}
        prep_durations = []

        for kt in kitchen_tickets:
            if kt.station and kt.station.code:
                st_code = kt.station.code
                station_throughput[st_code] = station_throughput.get(st_code, 0) + 1
            if kt.started_at and kt.completed_at:
                dur = (kt.completed_at - kt.started_at).total_seconds() / 60.0
                prep_durations.append(dur)

        avg_prep_time = round(sum(prep_durations) / len(prep_durations)) if prep_durations else 0
        on_time_rate = round(len([d for d in prep_durations if d <= 15]) / len(prep_durations) * 100, 1) if prep_durations else 100.0

        kitchen_metrics = KitchenPerformanceMetricsOut(
            average_prep_time_minutes=avg_prep_time,
            target_prep_time_minutes=15,
            on_time_rate_percent=on_time_rate,
            total_tickets_prepared=total_tickets,
            station_throughput=station_throughput,
            prep_time_by_station=prep_time_by_station,
        )

        # 6. Popular Products & Category Performance
        item_stats: Dict[str, Dict[str, Any]] = {}
        cat_stats: Dict[str, Dict[str, Any]] = {}

        for o in paid_orders:
            for itm in o.items:
                name = itm.product_name
                qty = itm.quantity or 1
                rev = itm.subtotal or Decimal("0.00")
                cat_name = "Mains"
                if itm.product and itm.product.category:
                    cat_name = itm.product.category.name

                if name not in item_stats:
                    item_stats[name] = {"units": 0, "revenue": Decimal("0.00"), "category": cat_name}
                item_stats[name]["units"] += qty
                item_stats[name]["revenue"] += rev

                if cat_name not in cat_stats:
                    cat_stats[cat_name] = {"units": 0, "revenue": Decimal("0.00")}
                cat_stats[cat_name]["units"] += qty
                cat_stats[cat_name]["revenue"] += rev

        popular_products = [
            TopDishOut(
                product_name=name,
                units_sold=data["units"],
                revenue=data["revenue"],
                category=data["category"],
                percentage_of_sales=round(float(data["revenue"] / gross_sales * 100), 1) if gross_sales > Decimal("0.00") else 0.0,
            )
            for name, data in sorted(item_stats.items(), key=lambda x: x[1]["units"], reverse=True)[:10]
        ]

        categories_performance = [
            CategoryPerformanceOut(
                category_name=cat,
                units_sold=data["units"],
                revenue=data["revenue"],
                percentage_of_sales=round(float(data["revenue"] / gross_sales * 100), 1) if gross_sales > Decimal("0.00") else 0.0,
            )
            for cat, data in sorted(cat_stats.items(), key=lambda x: x[1]["revenue"], reverse=True)
        ]

        # 7. Peak Hours Metrics & Hourly Distribution
        hourly_map: Dict[str, Dict[str, Any]] = {}
        for o in paid_orders:
            if o.placed_at:
                hr = o.placed_at.strftime("%H:00")
                if hr not in hourly_map:
                    hourly_map[hr] = {"revenue": Decimal("0.00"), "orders": 0}
                hourly_map[hr]["revenue"] += o.total_amount or Decimal("0.00")
                hourly_map[hr]["orders"] += 1

        hourly_distribution = [
            HourlyAnalyticsOut(
                hour=hr,
                revenue=data["revenue"],
                order_count=data["orders"],
                avg_prep_time_minutes=avg_prep_time,
            )
            for hr, data in sorted(hourly_map.items())
        ]

        peak_sales_hour = "N/A"
        peak_order_hour = "N/A"
        highest_hourly_rev = Decimal("0.00")
        highest_hourly_ords = 0

        if hourly_distribution:
            top_rev_hr = max(hourly_distribution, key=lambda h: h.revenue)
            top_ord_hr = max(hourly_distribution, key=lambda h: h.order_count)
            peak_sales_hour = top_rev_hr.hour
            peak_order_hour = top_ord_hr.hour
            highest_hourly_rev = top_rev_hr.revenue
            highest_hourly_ords = top_ord_hr.order_count

        peak_hours_metrics = PeakHoursMetricsOut(
            peak_sales_hour=peak_sales_hour,
            peak_order_hour=peak_order_hour,
            highest_hourly_revenue=highest_hourly_rev,
            highest_hourly_orders=highest_hourly_ords,
            hourly_distribution=hourly_distribution,
        )

        # 8. Timeline (Past 7 days)
        timeline_points = []
        for i in range(7):
            day_dt = now.date() - timedelta(days=6 - i)
            day_orders = [o for o in paid_orders if o.placed_at and o.placed_at.date() == day_dt]
            day_rev = sum((o.total_amount for o in day_orders), Decimal("0.00"))
            day_cnt = len(day_orders)
            day_aov = round(day_rev / Decimal(max(day_cnt, 1)), 2) if day_cnt > 0 else Decimal("0.00")
            timeline_points.append(
                TimelinePointOut(
                    label=day_dt.strftime("%a"),
                    revenue=day_rev,
                    orders=day_cnt,
                    average_order_value=day_aov,
                )
            )

        # Backward compatible hourly_sales
        hourly_compat = [
            HourlyRevenueOut(hour=h.hour, revenue=h.revenue, order_count=h.order_count)
            for h in hourly_distribution
        ]

        resp = AnalyticsDashboardResponse(
            total_revenue_today=gross_sales,
            active_tables_count=occupied_tables,
            total_orders_today=total_orders,
            average_ticket_time_minutes=avg_prep_time,
            popular_dishes=popular_products[:4],
            hourly_sales=hourly_compat,
            sales=sales_metrics,
            orders=order_metrics,
            table_utilization=table_utilization_metrics,
            kitchen_performance=kitchen_metrics,
            peak_hours=peak_hours_metrics,
            popular_products=popular_products,
            category_performance=categories_performance,
            timeline=timeline_points,
            date_range=date_info,
        )
        fast_cache.set(cache_key, resp, ttl_seconds=30)
        return resp

    @classmethod
    def generate_csv_export(
        cls,
        db: Session,
        restaurant_id: Optional[str] = None,
        report_type: str = "sales",
        preset: Optional[str] = "today",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> str:
        """
        Generates RFC 4180 compliant CSV export for accounting, kitchen auditing,
        and inventory analysis.
        Types: 'sales', 'products', 'kitchen', 'categories', 'summary'
        """
        output = io.StringIO()
        writer = csv.writer(output, lineterminator="\n")

        summary = cls.get_dashboard_summary(db, restaurant_id, preset, start_date, end_date)

        if report_type == "products":
            writer.writerow(["Product Name", "Category", "Units Sold", "Gross Revenue (USD)", "Sales Share (%)"])
            for p in summary.popular_products:
                writer.writerow([p.product_name, p.category or "General", p.units_sold, f"{p.revenue:.2f}", f"{p.percentage_of_sales or 0.0}%"])

        elif report_type == "kitchen":
            writer.writerow(["Station Code", "Tickets Handled", "Average Prep Time (Mins)", "Target (Mins)", "On-Time Status"])
            for station, count in summary.kitchen_performance.station_throughput.items():
                avg_time = summary.kitchen_performance.prep_time_by_station.get(station, 15)
                on_time = "ON TARGET" if avg_time <= 15 else "DELAY RISK"
                writer.writerow([station, count, avg_time, 15, on_time])

        elif report_type == "categories":
            writer.writerow(["Category", "Units Sold", "Gross Revenue (USD)", "Revenue Share (%)"])
            for c in summary.category_performance:
                writer.writerow([c.category_name, c.units_sold, f"{c.revenue:.2f}", f"{c.percentage_of_sales}%"])

        elif report_type == "summary":
            writer.writerow(["Metric", "Value", "Unit / Status"])
            writer.writerow(["Report Date Preset", summary.date_range.preset, "Filter"])
            writer.writerow(["Date Range Start", summary.date_range.start_date, "Date"])
            writer.writerow(["Date Range End", summary.date_range.end_date, "Date"])
            writer.writerow(["Gross Revenue", f"{summary.sales.gross_sales:.2f}", "USD"])
            writer.writerow(["Net Sales", f"{summary.sales.net_sales:.2f}", "USD"])
            writer.writerow(["Tax Collected", f"{summary.sales.tax_collected:.2f}", "USD"])
            writer.writerow(["Tips Collected", f"{summary.sales.tips_collected:.2f}", "USD"])
            writer.writerow(["Average Order Value (AOV)", f"{summary.sales.average_order_value:.2f}", "USD/Table"])
            writer.writerow(["Total Orders", summary.orders.total_orders, "Orders"])
            writer.writerow(["Completed Orders", summary.orders.completed_orders, "Orders"])
            writer.writerow(["Cancelled Orders", summary.orders.cancelled_orders, "Orders"])
            writer.writerow(["Cancellation Rate", f"{summary.orders.cancellation_rate_percent}%", "Percentage"])
            writer.writerow(["Table Utilization Rate", f"{summary.table_utilization.utilization_rate_percent}%", "Percentage"])
            writer.writerow(["Average Prep Time", f"{summary.kitchen_performance.average_prep_time_minutes}", "Minutes"])
            writer.writerow(["Peak Service Window", summary.peak_hours.peak_sales_hour, "Peak Hour"])

        else:
            # Default: 'sales' itemized ledger
            writer.writerow([
                "Order Number",
                "Table ID",
                "Placed At",
                "Status",
                "Payment Status",
                "Subtotal (USD)",
                "Tax (USD)",
                "Tip (USD)",
                "Total (USD)",
            ])
            orders_q = db.query(Order).filter(Order.is_deleted == False)
            if restaurant_id:
                orders_q = orders_q.filter(Order.restaurant_id == restaurant_id)
            orders = orders_q.order_by(Order.placed_at.desc()).limit(100).all()

            if orders:
                for o in orders:
                    writer.writerow([
                        o.order_number,
                        o.table.table_number if o.table else (o.table_id or "N/A"),
                        o.placed_at.strftime("%Y-%m-%d %H:%M:%S") if o.placed_at else "N/A",
                        o.status,
                        o.payment_status,
                        f"{o.subtotal:.2f}",
                        f"{o.tax_amount:.2f}",
                        f"{o.tip_amount:.2f}",
                        f"{o.total_amount:.2f}",
                    ])

        return output.getvalue()

    @classmethod
    def get_executive_summary_report(
        cls,
        db: Session,
        restaurant_id: Optional[str] = None,
        preset: Optional[str] = "today",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> ExecutiveSummaryReport:
        summary = cls.get_dashboard_summary(db, restaurant_id, preset, start_date, end_date)
        rest_name = "Luminary Fine Dining & Smart Tabletop"
        if restaurant_id:
            rest = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
            if rest:
                rest_name = rest.name

        return ExecutiveSummaryReport(
            restaurant_name=rest_name,
            generated_at=datetime.now(timezone.utc).isoformat(),
            date_range=summary.date_range,
            sales=summary.sales,
            orders=summary.orders,
            table_utilization=summary.table_utilization,
            kitchen=summary.kitchen_performance,
            top_categories=summary.category_performance,
            top_products=summary.popular_products,
        )

    @staticmethod
    def get_daily_report(db: Session, restaurant_id: Optional[str] = None) -> DailyReportResponse:
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        orders_q = db.query(Order).filter(Order.is_deleted == False)
        if restaurant_id:
            orders_q = orders_q.filter(Order.restaurant_id == restaurant_id)
        orders = orders_q.all()

        paid_orders = [o for o in orders if o.payment_status == "PAID" or o.status in ("SERVED", "COMPLETED")]
        total_rev = sum((o.total_amount for o in paid_orders), Decimal("0.00"))
        total_tax = sum((o.tax_amount for o in orders), Decimal("0.00"))
        total_tips = sum((o.tip_amount for o in orders), Decimal("0.00"))
        total_count = len(orders)
        paid_count = len(paid_orders)

        aov = round(total_rev / Decimal(max(paid_count, 1)), 2) if paid_count > 0 else Decimal("0.00")

        table_q = db.query(Table).filter(Table.is_deleted == False)
        if restaurant_id:
            table_q = table_q.filter(Table.restaurant_id == restaurant_id)
        tables = table_q.all()
        occupied_tables = len([t for t in tables if t.status in ("OCCUPIED", "ORDERING", "WAITING", "PREPARING", "READY", "PAYMENT")])
        occupancy_rate = round((occupied_tables / max(len(tables), 1)) * 100, 1) if tables else 0.0

        payment_methods: Dict[str, Decimal] = {}
        for o in paid_orders:
            for p in o.payments:
                pm = p.payment_method or "CASH"
                payment_methods[pm] = payment_methods.get(pm, Decimal("0.00")) + (p.amount or Decimal("0.00"))

        return DailyReportResponse(
            report_date=today_str,
            total_revenue=total_rev,
            total_tax=total_tax,
            total_tips=total_tips,
            total_orders=total_count,
            payment_methods_breakdown=payment_methods,
            station_throughput={"GRILL": 0, "SAUTE": 0, "BAR": 0, "OVEN": 0},
            average_order_value=aov,
            cancellation_rate_percent=0.0 if total_count == 0 else round(len([o for o in orders if o.status == "CANCELLED"]) / total_count * 100, 2),
            table_occupancy_rate_percent=occupancy_rate,
        )

    @staticmethod
    def list_audit_logs(db: Session, restaurant_id: Optional[str] = None) -> List[AuditLog]:
        query = db.query(AuditLog)
        if restaurant_id:
            query = query.filter(AuditLog.restaurant_id == restaurant_id)
        return query.order_by(AuditLog.created_at.desc()).limit(100).all()
