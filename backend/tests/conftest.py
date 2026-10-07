import pytest
from typing import Generator
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings


@pytest.fixture(scope="session")
def client() -> Generator[TestClient, None, None]:
    """Test client fixture for making synchronous test requests."""
    with TestClient(app) as test_client:
        yield test_client
