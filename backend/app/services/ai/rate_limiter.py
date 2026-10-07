import time
from typing import Dict, List
from app.core.config import settings
from app.core.errors import ValidationException


class AiRateLimitExceededException(ValidationException):
    def __init__(self, retry_after_seconds: int = 30):
        super().__init__(
            message=f"AI experience rate limit exceeded. Please wait {retry_after_seconds}s before submitting further queries.",
            details={"retry_after_seconds": retry_after_seconds},
        )


class AiRateLimiter:
    """
    In-memory sliding window rate limiter dedicated to AI operations,
    preventing quota depletion and resource exhaustion.
    """

    def __init__(self, max_requests: int = 30, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, List[float]] = {}

    def check_rate_limit(self, key: str) -> None:
        now = time.time()
        cutoff = now - self.window_seconds

        # Clean old timestamps
        history = [ts for ts in self.requests.get(key, []) if ts > cutoff]

        if len(history) >= self.max_requests:
            oldest = history[0]
            retry_after = int(self.window_seconds - (now - oldest)) + 1
            raise AiRateLimitExceededException(retry_after_seconds=max(1, retry_after))

        history.append(now)
        self.requests[key] = history

    def reset(self) -> None:
        self.requests.clear()


ai_rate_limiter = AiRateLimiter(
    max_requests=settings.AI_RATE_LIMIT_PER_MINUTE,
    window_seconds=60,
)
