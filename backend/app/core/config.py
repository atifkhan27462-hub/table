import os
from typing import List, Optional, Union
from pydantic import AnyHttpUrl, computed_field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # General Project Identity
    PROJECT_NAME: str = "Smart Interactive Dining Table API"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"

    # Security & JWT
    SECRET_KEY: str = "development_secret_key_change_in_production_9f83a2c01928"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        env = os.environ.get("ENVIRONMENT", "development").lower()
        if env == "production" and ("development_secret_key" in v or len(v) < 32):
            raise ValueError(
                "CRITICAL SECURITY ERROR: In production, SECRET_KEY must be set to a secure, random 32+ character key. Do not use the development default."
            )
        return v

    # CORS Origins (allow local frontend dev servers by default)
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    # Database Configuration
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "smart_table"
    DATABASE_URL_OVERRIDE: Optional[str] = None
    DATABASE_URL: Optional[str] = None

    # Connection pool settings
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30

    @computed_field  # type: ignore[misc]
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        raw_url = self.DATABASE_URL_OVERRIDE or self.DATABASE_URL
        if raw_url:
            if raw_url.startswith("postgres://"):
                return raw_url.replace("postgres://", "postgresql+psycopg2://", 1)
            elif raw_url.startswith("postgresql://") and not raw_url.startswith("postgresql+psycopg2://"):
                return raw_url.replace("postgresql://", "postgresql+psycopg2://", 1)
            return raw_url
        return (
            f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    # Redis Configuration
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: Optional[str] = None
    REDIS_URL_OVERRIDE: Optional[str] = None

    @computed_field  # type: ignore[misc]
    @property
    def REDIS_URL(self) -> str:
        if self.REDIS_URL_OVERRIDE:
            return self.REDIS_URL_OVERRIDE
        if self.REDIS_PASSWORD:
            return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "console"  # "json" or "console"

    # AI Experience Engine (Phase 10)
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-1.5-flash"
    AI_PROVIDER: str = "gemini"  # "gemini" or "mock"
    AI_TIMEOUT_SECONDS: int = 15
    AI_MAX_RETRIES: int = 3
    AI_RATE_LIMIT_PER_MINUTE: int = 30


settings = Settings()
