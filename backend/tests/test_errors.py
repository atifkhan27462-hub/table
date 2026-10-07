from fastapi.testclient import TestClient
from app.core.errors import EntityNotFoundException, ValidationException


def test_custom_exception_response(client: TestClient):
    # Testing that error formatting matches standardized JSON envelope
    exc = EntityNotFoundException(entity="TableDevice", identifier="Table 99")
    assert exc.status_code == 404
    assert exc.code == "ENTITY_NOT_FOUND"
    assert "Table 99" in exc.message
    assert exc.details["entity"] == "TableDevice"


def test_validation_exception_structure():
    exc = ValidationException(message="Invalid table status", details={"field": "status"})
    assert exc.status_code == 422
    assert exc.code == "VALIDATION_FAILED"
    assert exc.details["field"] == "status"
