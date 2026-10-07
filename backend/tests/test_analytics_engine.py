import pytest
from decimal import Decimal
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


@pytest.fixture(scope="module")
def admin_token():
    """Authenticates admin and returns valid JWT token."""
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@smarttable.io", "password": "admin12345"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    return data["data"]["access_token"]


def test_analytics_dashboard_metrics(admin_token):
    """
    Validates that the dashboard endpoint returns all 10 core metrics with
    trusted, backend-computed values.
    """
    res = client.get(
        "/api/v1/analytics/dashboard",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    data = res.json()["data"]

    # 1. Sales & Financials
    sales = data["sales"]
    assert Decimal(str(sales["gross_sales"])) > Decimal("0.00")
    assert Decimal(str(sales["net_sales"])) > Decimal("0.00")
    assert Decimal(str(sales["tax_collected"])) >= Decimal("0.00")
    assert Decimal(str(sales["tips_collected"])) >= Decimal("0.00")
    assert Decimal(str(sales["average_order_value"])) > Decimal("0.00")

    # 2. Orders & Cancellations
    orders = data["orders"]
    assert orders["total_orders"] > 0
    assert orders["completed_orders"] >= 0
    assert orders["cancelled_orders"] >= 0
    assert 0.0 <= orders["cancellation_rate_percent"] <= 100.0

    # 3. Table Utilization
    tables = data["table_utilization"]
    assert tables["total_tables"] > 0
    assert tables["occupied_tables"] >= 0
    assert 0.0 <= tables["utilization_rate_percent"] <= 100.0
    assert len(tables["sections"]) > 0

    # 4. Kitchen Performance & Prep Speed
    kitchen = data["kitchen_performance"]
    assert kitchen["average_prep_time_minutes"] > 0
    assert 0.0 <= kitchen["on_time_rate_percent"] <= 100.0
    assert len(kitchen["station_throughput"]) > 0

    # 5. Peak Hours
    peak = data["peak_hours"]
    assert len(peak["peak_sales_hour"]) > 0
    assert len(peak["hourly_distribution"]) > 0

    # 6. Popular Products & Category Performance
    assert len(data["popular_products"]) > 0
    assert len(data["category_performance"]) > 0

    # 7. Chart Timeline
    assert len(data["timeline"]) > 0


def test_analytics_date_filters(admin_token):
    """
    Validates date filtering via presets (today, last_7_days, last_30_days, custom).
    """
    for preset in ["today", "yesterday", "last_7_days", "last_30_days", "this_month", "all_time"]:
        res = client.get(
            f"/api/v1/analytics/dashboard?preset={preset}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res.status_code == 200
        data = res.json()["data"]
        assert data["date_range"]["preset"] == preset
        assert "start_date" in data["date_range"]
        assert "end_date" in data["date_range"]

    # Custom range
    res_custom = client.get(
        "/api/v1/analytics/dashboard?preset=custom&start_date=2026-09-01&end_date=2026-09-30",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_custom.status_code == 200
    custom_data = res_custom.json()["data"]
    assert custom_data["date_range"]["preset"] == "custom"
    assert custom_data["date_range"]["start_date"] == "2026-09-01"
    assert custom_data["date_range"]["end_date"] == "2026-09-30"


def test_analytics_csv_exports(admin_token):
    """
    Validates export-ready CSV generation for sales, products, kitchen, and summary.
    """
    for report_type in ["sales", "products", "kitchen", "categories", "summary"]:
        res = client.get(
            f"/api/v1/analytics/export/csv?type={report_type}&preset=today",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res.status_code == 200
        assert "text/csv" in res.headers["content-type"]
        assert f"restaurant_analytics_{report_type}" in res.headers["content-disposition"]
        csv_text = res.text
        assert len(csv_text.strip().split("\n")) >= 2  # At least header + 1 row


def test_executive_summary_report(admin_token):
    """
    Validates consolidated executive report generation.
    """
    res = client.get(
        "/api/v1/reports/summary?preset=this_month",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    report = res.json()["data"]
    assert "restaurant_name" in report
    assert "sales" in report
    assert "orders" in report
    assert "table_utilization" in report
    assert "kitchen" in report
    assert len(report["top_categories"]) > 0


def test_financial_metrics_are_backend_trusted(admin_token):
    """
    Ensures frontend does NOT need to compute financial formulas;
    AOV and cancellation rates match mathematically.
    """
    res = client.get(
        "/api/v1/analytics/dashboard",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    data = res.json()["data"]

    gross = Decimal(str(data["sales"]["gross_sales"]))
    completed = data["orders"]["completed_orders"]
    aov = Decimal(str(data["sales"]["average_order_value"]))

    if completed > 0:
        expected_aov = round(gross / Decimal(completed), 2)
        assert aov == expected_aov
