from app.core.config import settings


def test_settings_load():
    assert settings.PROJECT_NAME is not None
    assert settings.API_V1_STR == "/api/v1"
    assert settings.ACCESS_TOKEN_EXPIRE_MINUTES > 0
    assert "postgresql" in settings.SQLALCHEMY_DATABASE_URI or "sqlite" in settings.SQLALCHEMY_DATABASE_URI
    assert "redis" in settings.REDIS_URL
