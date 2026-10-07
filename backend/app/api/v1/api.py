from fastapi import APIRouter
from app.api.v1 import health
from app.api.v1.endpoints import (
    ai,
    analytics,
    audit,
    auth,
    categories,
    customers,
    devices,
    games,
    kitchen,
    menu,
    orders,
    payments,
    products,
    reports,
    restaurants,
    roles,
    sessions,
    tables,
    uploads,
    users,
    websocket,
)

api_router = APIRouter()

# Health & System
api_router.include_router(health.router)

# Real-time WebSocket Order Engine (Phase 9)
api_router.include_router(websocket.router)

# Core Business Modules (Phase 4)
api_router.include_router(auth.router)
api_router.include_router(restaurants.router)
api_router.include_router(users.router)
api_router.include_router(customers.router)
api_router.include_router(roles.router)
api_router.include_router(tables.router)
api_router.include_router(devices.router)
api_router.include_router(sessions.router)
api_router.include_router(menu.router)
api_router.include_router(categories.router)
api_router.include_router(products.router)
api_router.include_router(orders.router)
api_router.include_router(kitchen.router)
api_router.include_router(payments.router)
api_router.include_router(ai.router)
api_router.include_router(games.router)
api_router.include_router(analytics.router)
api_router.include_router(reports.router)
api_router.include_router(audit.router)
api_router.include_router(uploads.router)
