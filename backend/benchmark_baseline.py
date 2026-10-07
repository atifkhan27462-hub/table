"""
Performance baseline measurement script.
Profiles latency, query counts, and throughput of key endpoints.
"""
import time
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy import event
from app.main import app
from app.core.database import engine, SessionLocal
from app.db.seed import seed_database
from app.models import Table, Product

# Track SQL query count
query_counter = {"count": 0}

@event.listens_for(engine, "before_cursor_execute")
def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    query_counter["count"] += 1

def run_benchmark():
    db = SessionLocal()
    seed_database(db)
    db.close()
    
    client = TestClient(app)
    
    # Authenticate admin
    login_resp = client.post("/api/v1/auth/login", json={"email": "admin@smarttable.io", "password": "admin12345"})
    token = login_resp.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n================== BENCHMARK START ==================")
    
    # 1. Menu Catalog
    query_counter["count"] = 0
    t0 = time.perf_counter()
    iterations = 50
    for _ in range(iterations):
        resp = client.get("/api/v1/menu")
        assert resp.status_code == 200
    menu_time = (time.perf_counter() - t0) * 1000 / iterations
    menu_queries = query_counter["count"] / iterations
    print(f"1. Menu Catalog: Avg Latency = {menu_time:.2f} ms | Avg DB Queries = {menu_queries:.1f}")

    # 2. Categories List
    query_counter["count"] = 0
    t0 = time.perf_counter()
    for _ in range(iterations):
        resp = client.get("/api/v1/categories")
        assert resp.status_code == 200
    cat_time = (time.perf_counter() - t0) * 1000 / iterations
    cat_queries = query_counter["count"] / iterations
    print(f"2. Categories List: Avg Latency = {cat_time:.2f} ms | Avg DB Queries = {cat_queries:.1f}")

    # 3. Order Calculation
    db = SessionLocal()
    table = db.query(Table).first()
    prod = db.query(Product).first()
    db.close()
    calc_payload = {
        "table_id": table.id if table else "test-tbl-01",
        "tip_amount": 5.0,
        "items": [
            {"product_id": prod.id if prod else "prod-1", "product_name": "Dish", "unit_price": 18.0, "quantity": 2, "options": []}
        ]
    }
    t0 = time.perf_counter()
    for _ in range(iterations):
        resp = client.post("/api/v1/orders/calculate", json=calc_payload)
        assert resp.status_code == 200
    calc_time = (time.perf_counter() - t0) * 1000 / iterations
    print(f"3. Order Calculation: Avg Latency = {calc_time:.2f} ms")

    # 4. Analytics Dashboard
    query_counter["count"] = 0
    t0 = time.perf_counter()
    analytics_iterations = 20
    for _ in range(analytics_iterations):
        resp = client.get("/api/v1/analytics/dashboard?date_preset=last_7_days", headers=headers)
        assert resp.status_code == 200
    analytics_time = (time.perf_counter() - t0) * 1000 / analytics_iterations
    analytics_queries = query_counter["count"] / analytics_iterations
    print(f"4. Analytics Dashboard: Avg Latency = {analytics_time:.2f} ms | Avg DB Queries = {analytics_queries:.1f}")

    # 5. Kitchen Orders List
    query_counter["count"] = 0
    t0 = time.perf_counter()
    for _ in range(iterations):
        resp = client.get("/api/v1/kitchen/orders", headers=headers)
        assert resp.status_code == 200
    kitchen_time = (time.perf_counter() - t0) * 1000 / iterations
    kitchen_queries = query_counter["count"] / iterations
    print(f"5. Kitchen Orders: Avg Latency = {kitchen_time:.2f} ms | Avg DB Queries = {kitchen_queries:.1f}")

    # 6. AI Sommelier Request
    ai_payload = {
        "generation_type": "SOMMELIER_PAIRING",
        "prompt": "What wine pairs well with a ribeye steak?"
    }
    query_counter["count"] = 0
    t0 = time.perf_counter()
    ai_iterations = 10
    for _ in range(ai_iterations):
        resp = client.post("/api/v1/ai/generate", json=ai_payload)
        assert resp.status_code == 200
    ai_time = (time.perf_counter() - t0) * 1000 / ai_iterations
    print(f"6. AI Sommelier Generation: Avg Latency = {ai_time:.2f} ms")
    
    print("================== BENCHMARK END ==================\n")

if __name__ == "__main__":
    run_benchmark()
