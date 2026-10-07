# Engineering & Development Standards

This document establishes the architectural principles and coding conventions for all contributors to the **Smart Interactive Dining Table** project.

---

## 1. Core Principles

1. **Deterministic Business Logic**: AI must NEVER make decisions on:
   - Order prices, taxes, tip calculations, or totals
   - Payment authorizations or refunds
   - Order state transitions (PLACED -> PREPARING -> READY -> COMPLETED)
   - User roles or access controls
   All critical paths must be deterministic Python backend code running against PostgreSQL transactions.

2. **Strict Type Safety**:
   - **TypeScript**: All shared interfaces reside in `packages/types/src/index.ts`. No `any` types in domain logic. Strict mode enabled.
   - **Python**: Full type annotations using `typing` and Pydantic v2 schemas. Every route, service method, and repository function must have explicit parameter and return types.

3. **Separation of Concerns**:
   - `api/v1/`: HTTP request routing, input validation (Pydantic), and response serialization.
   - `services/`: Core business workflows, state transitions, and calculations.
   - `models/`: SQLAlchemy 2.0 ORM mappings.
   - `core/`: Cross-cutting concerns (Config, Logging, Error handling, Security).

---

## 2. Error Handling & Exception Standards

Do not return arbitrary dictionary errors or let raw tracebacks escape to HTTP clients.
Always throw a subclass of `AppException` defined in `app.core.errors`:

```python
from app.core.errors import EntityNotFoundException, ValidationException

# Raising a domain exception
if not menu_item:
    raise EntityNotFoundException(entity="MenuItem", identifier=item_id)
```

Every exception response automatically maps to the standardized envelope:
```json
{
  "success": false,
  "error": {
    "code": "ENTITY_NOT_FOUND",
    "message": "MenuItem with identifier '42' was not found.",
    "details": {
      "entity": "MenuItem",
      "identifier": "42"
    }
  }
}
```

---

## 3. Structured Logging Conventions

Use `app.core.logging.logger` instead of raw `print()` statements:

```python
from app.core.logging import logger

logger.info(f"Order #{order.id} placed by {table.number}")
logger.warning(f"Kitchen station {station.name} queue exceeded threshold")
logger.error("Database connection dropped during checkout", exc_info=True)
```

In production (`LOG_FORMAT=json`), all log messages are formatted as single-line JSON objects with timestamps, levels, and correlation IDs (`request_id`).

---

## 4. Frontend Component Development Guidelines

- All shared UI elements belong in `packages/ui`.
- Do not duplicate buttons, cards, or status badges across apps.
- Target screen specifications:
  - **Customer Table**: 32-inch landscape display. Minimum touch target size is 48px. Avoid delicate micro-clicks. Use dark theme to minimize glare on the 8mm tempered glass surface.
  - **Kitchen Display (KDS)**: High contrast, large bold timers, glanceable from 6 to 10 feet away.
  - **Admin Dashboard**: Data-dense, tabular, filterable, responsive for laptops and tablets.
