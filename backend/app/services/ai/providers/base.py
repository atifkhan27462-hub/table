from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, Optional


@dataclass
class ProviderTextResponse:
    content: str
    tokens_used: int
    model_name: str
    latency_ms: int
    raw_response: Optional[Dict[str, Any]] = field(default_factory=dict)


@dataclass
class ProviderImageResponse:
    image_url: str
    enhanced_prompt: str
    model_name: str
    latency_ms: int
    photography_notes: str = ""
    raw_response: Optional[Dict[str, Any]] = field(default_factory=dict)


class AIProvider(ABC):
    """
    Abstract Base Class for Generative AI Providers.
    Allows seamlessly switching between Gemini, OpenAI, Claude, or local mock engines
    without modifying the application service layer.
    """

    @abstractmethod
    def generate_text(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        max_tokens: int = 1024,
        temperature: float = 0.7,
    ) -> ProviderTextResponse:
        """Synchronously generate text response from the underlying model."""
        pass

    @abstractmethod
    def generate_image(
        self,
        prompt: str,
        aspect_ratio: str = "1:1",
    ) -> ProviderImageResponse:
        """Generate or render an image prompt/visual asset."""
        pass

    @abstractmethod
    def get_provider_name(self) -> str:
        """Returns the identifier of this provider."""
        pass
