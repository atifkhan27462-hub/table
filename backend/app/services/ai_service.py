import logging
import re
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.cache import fast_cache, hash_cache_key
from app.core.websocket_manager import ws_manager
from app.models import AiGeneration, Game
from app.schemas.experience import (
    AiCampaignRequest,
    AiCampaignResponse,
    AiConciergeRequest,
    AiConciergeResponse,
    AiFoodImageRequest,
    AiFoodImageResponse,
    AiGenerateRequest,
    AiGenerateResponse,
    AiGenerationType,
    AiUsageSummary,
)
from app.schemas.realtime import RealtimeEvent, RealtimeEventType
from app.services.ai.prompt_manager import PromptManager
from app.services.ai.providers import get_ai_provider
from app.services.ai.rate_limiter import ai_rate_limiter
from app.services.ai.safety_validator import SafetyValidator

logger = logging.getLogger("smart_table.ai.service")


class AiService:
    """
    Enterprise AI Experience Service Layer.
    Orchestrates Prompt Management, Strict Safety Auditing, Pluggable Providers,
    Output Sanitization, Telemetry Logging, and Real-Time Event Dispatching.
    """

    @classmethod
    def generate_experience(
        cls,
        db: Session,
        restaurant_id: str,
        data: AiGenerateRequest,
        user_id: Optional[str] = None,
    ) -> AiGenerateResponse:
        """
        Generic entrypoint for AI experience generation:
        Supports SOMMELIER_PAIRING, PROMOTIONAL_CONTENT, PERSONALIZED_VISUAL, etc.
        """
        # 0. Check Fast Cache for identical repeated prompts
        gen_type_str = data.generation_type or "SOMMELIER_PAIRING"
        try:
            gen_type = AiGenerationType(gen_type_str)
        except ValueError:
            gen_type = AiGenerationType.SOMMELIER_PAIRING

        cache_key = f"ai_gen:{hash_cache_key(restaurant_id, gen_type.value, data.prompt.strip().lower())}"
        cached = fast_cache.get(cache_key)
        if cached:
            return cached

        # 1. Rate Limiting Check
        rate_key = f"ai_gen_{restaurant_id}_{data.table_id or 'admin'}"
        ai_rate_limiter.check_rate_limit(rate_key)

        # 2. Strict Input Safety Validation (Zero modification of prices, taxes, payments, etc.)
        SafetyValidator.validate_prompt_safety(data.prompt)

        system_instruction = PromptManager.get_system_instruction(gen_type)

        # 4. Invoke AI Provider
        provider = get_ai_provider()
        provider_resp = provider.generate_text(
            prompt=data.prompt,
            system_instruction=system_instruction,
            max_tokens=600,
            temperature=0.7,
        )

        # 5. Output Validation & Sanitization
        sanitized_content = SafetyValidator.validate_and_sanitize_output(provider_resp.content)

        # 6. Persistent Usage & Audit Tracking
        now = datetime.now(timezone.utc)
        record = AiGeneration(
            restaurant_id=restaurant_id,
            table_id=data.table_id,
            user_id=user_id,
            generation_type=gen_type.value,
            prompt=data.prompt,
            result_content=sanitized_content,
            model_name=provider_resp.model_name,
            tokens_used=provider_resp.tokens_used,
            latency_ms=provider_resp.latency_ms,
            is_approved=True,
        )
        db.add(record)
        db.commit()
        db.refresh(record)

        # 7. Realtime WebSocket Broadcast
        try:
            ws_manager.dispatch_sync(
                RealtimeEvent(
                    type=RealtimeEventType.AI_GENERATION_COMPLETED,
                    restaurant_id=restaurant_id,
                    table_id=data.table_id,
                    data={
                        "generation_id": record.id,
                        "table_id": data.table_id,
                        "generation_type": record.generation_type,
                        "prompt": record.prompt,
                        "result_content": record.result_content,
                        "model_name": record.model_name,
                    },
                )
            )
        except Exception as e:
            logger.debug(f"Realtime WebSocket dispatch skipped/failed: {e}")

        resp = AiGenerateResponse(
            id=record.id,
            generation_type=record.generation_type,
            prompt=record.prompt,
            result_content=record.result_content,
            model_name=record.model_name,
            tokens_used=record.tokens_used,
            latency_ms=record.latency_ms,
            created_at=record.created_at or now,
        )
        fast_cache.set(cache_key, resp, ttl_seconds=3600)
        return resp

    @classmethod
    def generate_sommelier_recommendation(
        cls,
        db: Session,
        restaurant_id: str,
        data: AiGenerateRequest,
    ) -> AiGenerateResponse:
        """Backward compatible wrapper for sommelier pairing requests."""
        data.generation_type = AiGenerationType.SOMMELIER_PAIRING.value
        return cls.generate_experience(db, restaurant_id, data)

    @classmethod
    def generate_campaign(
        cls,
        db: Session,
        restaurant_id: str,
        data: AiCampaignRequest,
        user_id: Optional[str] = None,
    ) -> AiCampaignResponse:
        """Generates multi-channel marketing and promotional campaigns for managers."""
        rate_key = f"ai_campaign_{restaurant_id}"
        ai_rate_limiter.check_rate_limit(rate_key)

        SafetyValidator.validate_prompt_safety(data.campaign_goal)

        prompt = PromptManager.build_campaign_prompt(
            goal=data.campaign_goal,
            target_audience=data.target_audience,
            featured_item=data.featured_item,
            tone=data.tone,
        )
        system_instruction = PromptManager.get_system_instruction(AiGenerationType.RESTAURANT_CAMPAIGN)

        provider = get_ai_provider()
        resp = provider.generate_text(prompt, system_instruction=system_instruction, max_tokens=700)
        sanitized = SafetyValidator.validate_and_sanitize_output(resp.content)

        # Parse sections or provide smart structured fallback
        lines = [line.strip() for line in sanitized.split("\n") if line.strip()]
        headline = f"Experience {data.campaign_goal}"
        body_copy = sanitized
        cta = "Reserve Your Interactive Dining Table Tonight"
        captions = [
            f"Indulge in exceptional flavors. Featuring our {data.featured_item or 'Chef Specialties'}.",
            "Interactive dining at its finest. Tap to reserve your table today.",
        ]
        hashtags = ["#SmartDining", "#FineDining", "#InteractiveExperience", "#GourmetPairings"]

        for line in lines:
            if line.lower().startswith("**headline**:") or line.lower().startswith("headline:"):
                headline = line.split(":", 1)[1].strip().strip("*").strip('"')
            elif line.lower().startswith("**call to action**:") or line.lower().startswith("call to action:"):
                cta = line.split(":", 1)[1].strip().strip("*").strip('"')

        now = datetime.now(timezone.utc)
        record = AiGeneration(
            restaurant_id=restaurant_id,
            user_id=user_id,
            generation_type=AiGenerationType.RESTAURANT_CAMPAIGN.value,
            prompt=f"Goal: {data.campaign_goal} | Featured: {data.featured_item}",
            result_content=sanitized,
            model_name=resp.model_name,
            tokens_used=resp.tokens_used,
            latency_ms=resp.latency_ms,
            is_approved=True,
        )
        db.add(record)
        db.commit()
        db.refresh(record)

        return AiCampaignResponse(
            id=record.id,
            campaign_name=data.campaign_goal,
            headline=headline,
            body_copy=body_copy,
            social_captions=captions,
            call_to_action=cta,
            suggested_hashtags=hashtags,
            created_at=record.created_at or now,
        )

    @classmethod
    def generate_food_image(
        cls,
        db: Session,
        restaurant_id: str,
        data: AiFoodImageRequest,
        user_id: Optional[str] = None,
    ) -> AiFoodImageResponse:
        """Generates realistic food visual prompts and image previews."""
        rate_key = f"ai_img_{restaurant_id}"
        ai_rate_limiter.check_rate_limit(rate_key)

        SafetyValidator.validate_prompt_safety(data.dish_name)

        provider = get_ai_provider()
        prompt_seed = (
            f"{data.dish_name}, {data.culinary_style or 'Fine Dining'}, {data.plating_style or 'Artisanal Plating'}, "
            f"{data.lighting or 'Cinematic Studio Light'}"
        )
        img_resp = provider.generate_image(prompt_seed, aspect_ratio=data.aspect_ratio or "1:1")

        now = datetime.now(timezone.utc)
        record = AiGeneration(
            restaurant_id=restaurant_id,
            user_id=user_id,
            generation_type=AiGenerationType.FOOD_IMAGE.value,
            prompt=data.dish_name,
            result_content=img_resp.enhanced_prompt,
            image_url=img_resp.image_url,
            model_name=img_resp.model_name,
            tokens_used=len(img_resp.enhanced_prompt.split()) * 2,
            latency_ms=img_resp.latency_ms,
            is_approved=True,
        )
        db.add(record)
        db.commit()
        db.refresh(record)

        return AiFoodImageResponse(
            id=record.id,
            dish_name=data.dish_name,
            image_url=img_resp.image_url,
            enhanced_prompt=img_resp.enhanced_prompt,
            photography_notes=img_resp.photography_notes,
            created_at=record.created_at or now,
        )

    @classmethod
    def chat_concierge(
        cls,
        db: Session,
        restaurant_id: str,
        data: AiConciergeRequest,
        table_number: Optional[str] = None,
    ) -> AiConciergeResponse:
        """
        Conversational natural-language customer assistant for table diners.
        Enforces dietary awareness and zero access to modify prices or bills.
        """
        rate_key = f"ai_concierge_{restaurant_id}_{data.table_id or 'table'}"
        ai_rate_limiter.check_rate_limit(rate_key)

        # Strict Security validation
        SafetyValidator.validate_prompt_safety(data.query)

        history_payload = [m.model_dump() for m in (data.conversation_history or [])]
        prompt = PromptManager.build_concierge_prompt(
            query=data.query,
            table_number=table_number,
            conversation_history=history_payload,
            cart_items=data.current_cart_items,
        )
        system_instruction = PromptManager.get_system_instruction(AiGenerationType.CUSTOMER_ASSISTANT)

        provider = get_ai_provider()
        resp = provider.generate_text(prompt, system_instruction=system_instruction, max_tokens=400)
        sanitized_reply = SafetyValidator.validate_and_sanitize_output(resp.content)

        # Scan for detected dietary tags in response/query
        q_lower = (data.query + " " + sanitized_reply).lower()
        dietary_flags = []
        if "gluten" in q_lower:
            dietary_flags.append("Gluten-Free")
        if "vegan" in q_lower or "vegetarian" in q_lower:
            dietary_flags.append("Plant-Based")
        if "halal" in q_lower:
            dietary_flags.append("Halal")
        if "dairy" in q_lower:
            dietary_flags.append("Dairy-Free")

        # Suggested dishes based on keywords
        suggested = []
        if "steak" in q_lower or "beef" in q_lower or "meat" in q_lower:
            suggested.extend(["Prime Dry-Aged Ribeye (14oz)", "Truffle Butter Fries"])
        elif "sea" in q_lower or "fish" in q_lower or "bass" in q_lower:
            suggested.extend(["Pan-Seared Chilean Sea Bass", "Saffron Risotto"])
        elif "dessert" in q_lower or "sweet" in q_lower:
            suggested.extend(["Vanilla Bean Crème Brûlée", "Valrhona Chocolate Fondant"])

        record = AiGeneration(
            restaurant_id=restaurant_id,
            table_id=data.table_id,
            generation_type=AiGenerationType.CUSTOMER_ASSISTANT.value,
            prompt=data.query,
            result_content=sanitized_reply,
            model_name=resp.model_name,
            tokens_used=resp.tokens_used,
            latency_ms=resp.latency_ms,
            is_approved=True,
        )
        db.add(record)
        db.commit()
        db.refresh(record)

        return AiConciergeResponse(
            id=record.id,
            reply=sanitized_reply,
            suggested_items=suggested,
            dietary_flags=dietary_flags,
            tokens_used=resp.tokens_used,
            latency_ms=resp.latency_ms,
        )

    @classmethod
    def get_usage_summary(cls, db: Session, restaurant_id: str) -> AiUsageSummary:
        """Returns analytics usage summary for the restaurant's AI operations."""
        rows = (
            db.query(
                AiGeneration.generation_type,
                func.count(AiGeneration.id).label("count"),
                func.sum(AiGeneration.tokens_used).label("total_tokens"),
                func.avg(AiGeneration.latency_ms).label("avg_latency"),
            )
            .filter(AiGeneration.restaurant_id == restaurant_id)
            .group_by(AiGeneration.generation_type)
            .all()
        )

        total_generations = sum(r[1] for r in rows) if rows else 0
        total_tokens = sum(r[2] or 0 for r in rows) if rows else 0
        avg_latency = float(sum(r[3] or 0 for r in rows) / len(rows)) if rows else 0.0
        generations_by_type = {r[0]: r[1] for r in rows}

        return AiUsageSummary(
            total_generations=total_generations,
            total_tokens=int(total_tokens),
            avg_latency_ms=round(avg_latency, 1),
            generations_by_type=generations_by_type,
        )

    @classmethod
    def list_history(
        cls,
        db: Session,
        restaurant_id: str,
        table_id: Optional[str] = None,
        generation_type: Optional[str] = None,
        limit: int = 25,
    ) -> List[AiGeneration]:
        """Lists recent AI generation logs with optional table and type filters."""
        query = db.query(AiGeneration).filter(AiGeneration.restaurant_id == restaurant_id)
        if table_id:
            query = query.filter(AiGeneration.table_id == table_id)
        if generation_type:
            query = query.filter(AiGeneration.generation_type == generation_type)
        return query.order_by(AiGeneration.created_at.desc()).limit(limit).all()

    @staticmethod
    def list_games(db: Session) -> List[Game]:
        """Returns active tabletop arcade and party games for the smart surface."""
        return db.query(Game).filter_by(is_active=True).all()
