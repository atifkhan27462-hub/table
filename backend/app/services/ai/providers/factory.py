from typing import Dict, Optional, Type
from app.core.config import settings
from app.services.ai.providers.base import AIProvider
from app.services.ai.providers.gemini_provider import GeminiProvider
from app.services.ai.providers.mock_provider import MockProvider

_PROVIDER_REGISTRY: Dict[str, Type[AIProvider]] = {
    "gemini": GeminiProvider,
    "mock": MockProvider,
}

_PROVIDER_INSTANCES: Dict[str, AIProvider] = {}


def register_provider(name: str, provider_cls: Type[AIProvider]) -> None:
    """Register a new AIProvider implementation at runtime (e.g. FutureProvider, ClaudeProvider)."""
    _PROVIDER_REGISTRY[name.lower()] = provider_cls
    if name.lower() in _PROVIDER_INSTANCES:
        del _PROVIDER_INSTANCES[name.lower()]


def get_ai_provider(name: Optional[str] = None) -> AIProvider:
    """
    Factory resolving the active AI provider singleton based on configuration or override.
    Defaults to settings.AI_PROVIDER (or 'mock' if no Gemini key is provided).
    """
    provider_name = (name or settings.AI_PROVIDER or "gemini").lower()

    # If gemini is requested but no key exists, we can still use GeminiProvider because
    # GeminiProvider automatically handles fallback to MockProvider.
    if provider_name not in _PROVIDER_REGISTRY:
        provider_name = "mock"

    if provider_name not in _PROVIDER_INSTANCES:
        provider_cls = _PROVIDER_REGISTRY[provider_name]
        _PROVIDER_INSTANCES[provider_name] = provider_cls()

    return _PROVIDER_INSTANCES[provider_name]


def reset_provider_instances() -> None:
    """Utility for resetting instances during testing."""
    _PROVIDER_INSTANCES.clear()
