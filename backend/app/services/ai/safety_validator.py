import re
from typing import List, Tuple
from app.core.errors import ValidationException


class SecurityValidationException(ValidationException):
    def __init__(self, message: str, forbidden_domain: str):
        super().__init__(
            message=message,
            details={
                "forbidden_domain": forbidden_domain,
                "reason": "AI is strictly prohibited from mutating financial, security, or state records.",
            },
        )


class SafetyValidator:
    """
    Enforces the non-negotiable security invariant:
    AI MUST NEVER DIRECTLY MODIFY:
    1. prices
    2. taxes
    3. payments
    4. permissions
    5. order status
    6. financial records
    """

    # Forbidden modification patterns (prompt injections / tampering attempts)
    FORBIDDEN_MUTATION_PATTERNS = [
        (r"\b(change|set|update|modify|make|reduce|drop|override|discount|waive)\b.*?\b(price|cost|bill|amount|charge|meal|food|steak|order|check)\b", "prices"),
        (r"(?<!-)\b(for\s+free|free\s+of\s+charge|make\s+it\s+free|free\s+(meal|food|dinner|drinks|items|dish|orders|dessert|bill)|0\s*dollars|0\$|\$0|\d+%\s*discount|discount\s+.*?\b\d+%|no\s*charge)\b", "prices"),
        (r"\b(change|set|update|modify|remove|waive|cancel)\b.*?\b(tax|taxes|vat|gst)\b", "taxes"),
        (r"\b(mark|set|update|simulate|override|fake|waive|cancel|refund|void|delete)\b.*?\b(payment|paid|refund|transaction|credit\s*card)\b", "payments"),
        (r"\b(grant|assign|elevate|promote|give)\b.*?\b(permission|permissions|role|roles|admin|admins|superadmin|root|access)\b", "permissions"),
        (r"\b(change|set|update|mark|bump)\b.*?\b(order\s+status|order\s+state|status\s+to|state\s+to)\b", "order_status"),
        (r"\b(delete|truncate|drop|alter|insert|update)\b.*?\b(orders|payments|users|audit_logs|ledger|ledgers|financial\s*records|financial_records)\b", "financial_records"),
        (r"\b(system\s+prompt\s+override|ignore\s+all\s+previous\s+instructions)\b", "prompt_injection"),
    ]

    @classmethod
    def inspect_prompt(cls, prompt: str) -> Tuple[bool, str]:
        """
        Inspects input prompt against forbidden mutation categories.
        Returns (is_safe, violation_category).
        """
        p_lower = prompt.lower()
        for pattern, category in cls.FORBIDDEN_MUTATION_PATTERNS:
            if re.search(pattern, p_lower):
                return False, category
        return True, ""

    @classmethod
    def validate_prompt_safety(cls, prompt: str) -> None:
        """
        Raises SecurityValidationException if a prompt attempts to tamper
        with prices, taxes, payments, permissions, order status, or financial records.
        """
        is_safe, category = cls.inspect_prompt(prompt)
        if not is_safe:
            raise SecurityValidationException(
                message=f"Action blocked: AI is strictly prohibited from modifying {category}.",
                forbidden_domain=category,
            )

    @classmethod
    def validate_and_sanitize_output(cls, output: str) -> str:
        """
        Guarantees that model output contains no simulated database update payloads,
        malicious scripts, or executable state change commands.
        """
        if not output:
            return ""

        sanitized = output

        # Strip any SQL fragments that an LLM might hallucinate
        sql_patterns = [
            r"UPDATE\s+\w+\s+SET\s+.*?;?",
            r"INSERT\s+INTO\s+\w+.*?;?",
            r"DELETE\s+FROM\s+\w+.*?;?",
            r"DROP\s+TABLE\s+.*?;?",
        ]
        for pat in sql_patterns:
            sanitized = re.sub(pat, "[PROTECTED_OPERATION_REDACTED]", sanitized, flags=re.IGNORECASE)

        # Strip any script injections
        sanitized = re.sub(r"<script.*?>.*?</script>", "[SCRIPT_REDACTED]", sanitized, flags=re.IGNORECASE)

        return sanitized.strip()
