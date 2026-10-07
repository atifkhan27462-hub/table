from typing import Any, Dict, Optional
from fastapi import Request, status
from fastapi.responses import JSONResponse
from app.core.logging import logger


class AppException(Exception):
    """Base application exception with HTTP status code and message."""

    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        code: str = "INTERNAL_ERROR",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code
        self.details = details or {}


class EntityNotFoundException(AppException):
    def __init__(self, entity: str, identifier: Any):
        super().__init__(
            message=f"{entity} with identifier '{identifier}' was not found.",
            status_code=status.HTTP_404_NOT_FOUND,
            code="ENTITY_NOT_FOUND",
            details={"entity": entity, "identifier": str(identifier)},
        )


HTTP_422_STATUS = getattr(status, "HTTP_422_UNPROCESSABLE_CONTENT", 422)


class ValidationException(AppException):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=HTTP_422_STATUS,
            code="VALIDATION_FAILED",
            details=details,
        )


class AuthenticationException(AppException):
    def __init__(self, message: str = "Invalid credentials or expired session token."):
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="AUTHENTICATION_FAILED",
        )


class PermissionDeniedException(AppException):
    def __init__(self, message: str = "User role has insufficient permissions for this resource."):
        super().__init__(
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            code="PERMISSION_DENIED",
        )


class DeviceOfflineException(AppException):
    def __init__(self, table_number: str):
        super().__init__(
            message=f"Smart dining table '{table_number}' is offline or unresponsive.",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            code="DEVICE_OFFLINE",
            details={"table_number": table_number},
        )


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """Standardized handler for application domain exceptions."""
    logger.warning(
        f"Handled application exception on {request.method} {request.url.path}: "
        f"[{exc.code}] {exc.message}"
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
            },
        },
    )


async def validation_exception_handler(request: Request, exc: Any) -> JSONResponse:
    """Handle FastAPI / Pydantic RequestValidationError with informative logging and response."""
    errors = getattr(exc, "errors", lambda: [])()
    body = getattr(exc, "body", None)
    err_msgs = []
    for err in errors:
        loc = " -> ".join(str(l) for l in err.get("loc", []))
        msg = err.get("msg", "Invalid value")
        err_msgs.append(f"{loc}: {msg}")
    combined_msg = "; ".join(err_msgs) if err_msgs else "Input validation failed."

    logger.warning(
        f"Request validation failure on {request.method} {request.url.path}: {combined_msg} (body={body})"
    )
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_FAILED",
                "message": combined_msg,
                "details": errors,
            },
        },
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Fallback handler for unforeseen system errors to prevent leaking raw tracebacks."""
    logger.error(
        f"Unhandled system error on {request.method} {request.url.path}: {str(exc)}",
        exc_info=True,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred. Please contact system administration.",
                "details": {},
            },
        },
    )
