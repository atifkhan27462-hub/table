from typing import Generator
from sqlalchemy import create_engine, text, event
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings
from app.core.logging import logger

# Base model for SQLAlchemy ORM models
Base = declarative_base()

# Configure SQLAlchemy engine with connection pool
try:
    if settings.SQLALCHEMY_DATABASE_URI.startswith("sqlite"):
        engine = create_engine(
            settings.SQLALCHEMY_DATABASE_URI,
            connect_args={"check_same_thread": False},
        )
    else:
        engine = create_engine(
            settings.SQLALCHEMY_DATABASE_URI,
            pool_size=settings.DB_POOL_SIZE,
            max_overflow=settings.DB_MAX_OVERFLOW,
            pool_timeout=settings.DB_POOL_TIMEOUT,
            pool_pre_ping=True,  # Automatically detects disconnected sockets
        )
except Exception as e:
    logger.warning(f"Initial DB engine creation warning (expected if DB not yet online): {e}")
    # Fallback in-memory engine for initial bootstrapping tests if needed
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})


@event.listens_for(engine, "connect")
def set_sqlite_pragmas(dbapi_connection, connection_record):
    """High-performance SQLite pragmas: WAL mode, 64MB page cache, memory temp store."""
    if settings.SQLALCHEMY_DATABASE_URI.startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA synchronous=NORMAL")
            cursor.execute("PRAGMA cache_size=-64000")
            cursor.execute("PRAGMA temp_store=MEMORY")
            cursor.execute("PRAGMA foreign_keys=ON")
        except Exception:
            pass
        finally:
            cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Auto-apply lightweight schema migrations for development SQLite/Postgres
try:
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE orders ADD COLUMN idempotency_key VARCHAR(64)"))
            conn.commit()
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE ai_generations ADD COLUMN latency_ms INTEGER DEFAULT 0"))
            conn.commit()
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE ai_generations ADD COLUMN metadata_json JSON"))
            conn.commit()
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE games ADD COLUMN promotion_active BOOLEAN DEFAULT 0"))
            conn.commit()
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE games ADD COLUMN promotion_text VARCHAR(255)"))
            conn.commit()
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE games ADD COLUMN promotion_code VARCHAR(50)"))
            conn.commit()
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE games ADD COLUMN promotion_discount_percent INTEGER DEFAULT 0"))
            conn.commit()
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE table_devices ADD COLUMN restaurant_id VARCHAR(36)"))
            conn.commit()
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE table_devices ADD COLUMN network_status VARCHAR(30) DEFAULT 'CONNECTED'"))
            conn.commit()
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE table_devices ADD COLUMN kiosk_mode_enabled BOOLEAN DEFAULT 1"))
            conn.commit()
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE table_devices ADD COLUMN kiosk_pin VARCHAR(10) DEFAULT '7788'"))
            conn.commit()
        except Exception:
            pass

        # High-performance indexes
        indexes = [
            "CREATE INDEX IF NOT EXISTS ix_kitchen_order_station_status ON kitchen_orders (station_id, status)",
            "CREATE INDEX IF NOT EXISTS ix_table_device_health ON table_devices (restaurant_id, status, last_heartbeat)",
            "CREATE INDEX IF NOT EXISTS ix_session_table_status ON sessions (table_id, status)",
            "CREATE INDEX IF NOT EXISTS ix_ai_gen_type_created ON ai_generations (restaurant_id, generation_type, created_at)",
        ]
        for idx_sql in indexes:
            try:
                conn.execute(text(idx_sql))
                conn.commit()
            except Exception:
                pass
except Exception:
    pass


def get_db() -> Generator[Session, None, None]:
    """Dependency for obtaining database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_db_connection() -> bool:
    """Diagnostic check to verify database connectivity."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.debug(f"Database connectivity check failed: {e}")
        return False
