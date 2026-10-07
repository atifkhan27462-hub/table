from fastapi.testclient import TestClient
from app.core.config import settings


def test_root_endpoint(client: TestClient):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == settings.PROJECT_NAME
    assert data["status"] == "OPERATIONAL"


def test_liveness_check(client: TestClient):
    response = client.get(f"{settings.API_V1_STR}/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == settings.PROJECT_NAME


def test_readiness_check_structure(client: TestClient):
    response = client.get(f"{settings.API_V1_STR}/health/readiness")
    # In test environment without active postgres daemon, it responds with status code 503 or 200 with structured JSON
    assert response.status_code in [200, 503]
    data = response.json()
    assert "status" in data
    assert "dependencies" in data
    assert "database" in data["dependencies"]
    assert "redis" in data["dependencies"]


def test_request_id_middleware(client: TestClient):
    response = client.get("/")
    assert "x-request-id" in response.headers
    assert "x-response-time" in response.headers
    assert len(response.headers["x-request-id"]) > 0
