import time
import uuid
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.api import api_router
from app.core.config import settings
from app.core.errors import (
    AppException,
    app_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.core.logging import logger


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Startup and shutdown lifecycle management."""
    import asyncio
    from app.core.websocket_manager import ws_manager
    from app.core.database import engine
    from sqlalchemy import text

    # Register asyncio event loop with WebSocket Connection Manager
    try:
        ws_manager.set_event_loop(asyncio.get_running_loop())
    except Exception as e:
        logger.debug(f"Event loop registration note: {e}")

    # Ensure database schema is initialized / synchronized
    try:
        from app.models import Base
        Base.metadata.create_all(bind=engine)
        logger.info("Database relational schema initialized/verified.")
    except Exception as e:
        logger.warning(f"Database schema initialization note: {e}")

    # Ensure idempotency_key column exists in orders table (SQLite / PostgreSQL safe migration)
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE orders ADD COLUMN idempotency_key VARCHAR(64)"))
            conn.commit()
            logger.info("Migrated orders table: added idempotency_key column.")
    except Exception:
        # Column already exists or table not created yet
        pass

    logger.info(
        f"Starting {settings.PROJECT_NAME} v{settings.VERSION} [{settings.ENVIRONMENT}]..."
    )
    yield
    logger.info(f"Shutting down {settings.PROJECT_NAME} cleanly...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Commercial-grade backend API for the Smart Interactive Dining Table platform.",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan,
)

# Exception Handlers
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

# CORS Middleware
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|172\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|.*\.vercel\.app|.*\.onrender\.com|.*\.trycloudflare\.com)(:\d+)?$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


# Correlation / Request ID, Access Logging, and HTTP Security Headers Middleware
@app.middleware("http")
async def request_context_middleware(request: Request, call_next) -> Response:
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    start_time = time.time()

    response = await call_next(request)

    latency_ms = round((time.time() - start_time) * 1000, 2)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Response-Time"] = f"{latency_ms}ms"

    # HTTP Security Hardening Headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=()"
    response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none';"
    if settings.ENVIRONMENT == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

    # Log API transactions (exclude health and readiness probes from cluttering logs)
    if not request.url.path.endswith("/health") and not request.url.path.endswith("/ready"):
        logger.info(
            f"{request.method} {request.url.path} -> {response.status_code} ({latency_ms}ms) [req_id={request_id}]"
        )

    return response


# Mount API V1 routes
app.include_router(api_router, prefix=settings.API_V1_STR)

# Also mount root WebSocket gateway for convenience (/ws)
from app.api.v1.endpoints import websocket
app.include_router(websocket.router)

# Mount Static Uploads Directory for High-Resolution Food Photography
import os
from fastapi.staticfiles import StaticFiles
UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


from fastapi.responses import JSONResponse, RedirectResponse
from fastapi import status as http_status
from app.core.database import check_db_connection
from app.core.redis import check_redis_connection


@app.get("/health", tags=["Health & Diagnostics"], summary="Service Liveness Probe")
def root_liveness():
    """Lightweight liveness probe for orchestrators, Docker, and reverse proxies."""
    return {"status": "ok", "service": settings.PROJECT_NAME}


@app.get("/ready", tags=["Health & Diagnostics"], summary="Service Readiness Probe")
def root_readiness():
    """
    Validates backend connectivity to downstream dependencies (PostgreSQL, Redis).
    Returns HTTP 200 when ready to accept traffic, or HTTP 503 when dependencies are unreachable.
    """
    db_healthy = check_db_connection()
    redis_healthy = check_redis_connection()

    all_healthy = db_healthy
    overall_status = "HEALTHY" if all_healthy else "UNAVAILABLE"
    code = http_status.HTTP_200_OK if all_healthy else http_status.HTTP_503_SERVICE_UNAVAILABLE

    return JSONResponse(
        status_code=code,
        content={
            "status": overall_status,
            "environment": settings.ENVIRONMENT,
            "version": settings.VERSION,
            "dependencies": {
                "database": {"status": "UP" if db_healthy else "DOWN", "type": "PostgreSQL"},
                "redis": {"status": "UP" if redis_healthy else "DOWN", "type": "Cache & Event Bus"},
            },
        },
    )


@app.get("/docs", include_in_schema=False)
def docs_redirect():
    return RedirectResponse(url=f"{settings.API_V1_STR}/docs")


@app.get("/", tags=["Root"])
def root_info():
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "OPERATIONAL",
        "docs": f"{settings.API_V1_STR}/docs",
    }
