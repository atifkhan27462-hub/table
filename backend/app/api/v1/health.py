import time
from typing import Any, Dict
from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.database import check_db_connection
from app.core.redis import check_redis_connection

router = APIRouter(tags=["Health & Diagnostics"])

_START_TIME = time.time()


@router.get("/health", summary="Basic Liveness Probe")
def liveness_check() -> Dict[str, str]:
    """Lightweight liveness probe for load balancers and orchestrators."""
    return {"status": "ok", "service": settings.PROJECT_NAME}


@router.get("/health/readiness", summary="Comprehensive Readiness Probe")
def readiness_check() -> JSONResponse:
    """
    Validates backend connectivity to downstream dependencies (PostgreSQL, Redis).
    """
    db_healthy = check_db_connection()
    redis_healthy = check_redis_connection()

    all_healthy = db_healthy  # DB is critical; Redis may be optional in degraded local mode
    overall_status = "HEALTHY" if all_healthy else "DEGRADED"
    http_status = status.HTTP_200_OK if all_healthy else status.HTTP_503_SERVICE_UNAVAILABLE

    payload: Dict[str, Any] = {
        "status": overall_status,
        "environment": settings.ENVIRONMENT,
        "version": settings.VERSION,
        "uptime_seconds": round(time.time() - _START_TIME, 2),
        "dependencies": {
            "database": {
                "status": "UP" if db_healthy else "DOWN",
                "engine": "PostgreSQL",
            },
            "redis": {
                "status": "UP" if redis_healthy else "DOWN",
                "role": "Event Bus & Cache",
            },
        },
    }

    return JSONResponse(status_code=http_status, content=payload)
