from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class AiGenerationType(str, Enum):
    FOOD_IMAGE = "FOOD_IMAGE"
    PROMOTIONAL_CONTENT = "PROMOTIONAL_CONTENT"
    PERSONALIZED_VISUAL = "PERSONALIZED_VISUAL"
    RESTAURANT_CAMPAIGN = "RESTAURANT_CAMPAIGN"
    SOMMELIER_PAIRING = "SOMMELIER_PAIRING"
    CUSTOMER_ASSISTANT = "CUSTOMER_ASSISTANT"


class AiGenerateRequest(BaseModel):
    table_id: Optional[str] = None
    prompt: str = Field(..., min_length=2, json_schema_extra={"example": "Suggest a signature wine pairing for our Chilean Sea Bass"})
    generation_type: Optional[str] = "SOMMELIER_PAIRING"
    parameters: Optional[Dict[str, Any]] = None


class AiGenerateResponse(BaseModel):
    id: str
    generation_type: str
    prompt: str
    result_content: str
    image_url: Optional[str] = None
    model_name: str
    tokens_used: int
    latency_ms: Optional[int] = 0
    created_at: datetime


class AiCampaignRequest(BaseModel):
    campaign_goal: str = Field(..., min_length=3, json_schema_extra={"example": "Launch Autumn Truffle & Cabernet Tasting Weekend"})
    target_audience: Optional[str] = "Fine dining enthusiasts & couples"
    featured_item: Optional[str] = "Prime Dry-Aged Ribeye & Barolo"
    tone: Optional[str] = "luxurious"
    channels: Optional[List[str]] = Field(default_factory=lambda: ["instagram", "table_display", "email"])


class AiCampaignResponse(BaseModel):
    id: str
    campaign_name: str
    headline: str
    body_copy: str
    social_captions: List[str]
    call_to_action: str
    suggested_hashtags: List[str]
    created_at: datetime


class AiFoodImageRequest(BaseModel):
    dish_name: str = Field(..., min_length=2, json_schema_extra={"example": "Pan-Seared Chilean Sea Bass with Saffron Velouté"})
    culinary_style: Optional[str] = "Contemporary Michelin-Star Haute Cuisine"
    plating_style: Optional[str] = "Artisanal ceramic plate, edible microgreens, gold leaf accent"
    lighting: Optional[str] = "Moody cinematic studio lighting with warm rim light"
    aspect_ratio: Optional[str] = "1:1"


class AiFoodImageResponse(BaseModel):
    id: str
    dish_name: str
    image_url: str
    enhanced_prompt: str
    photography_notes: str
    created_at: datetime


class AiConciergeMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str


class AiConciergeRequest(BaseModel):
    table_id: Optional[str] = None
    query: str = Field(..., min_length=2, json_schema_extra={"example": "Which dishes are gluten-free and pair well with light white wine?"})
    conversation_history: Optional[List[AiConciergeMessage]] = None
    current_cart_items: Optional[List[str]] = None


class AiConciergeResponse(BaseModel):
    id: str
    reply: str
    suggested_items: List[str] = Field(default_factory=list)
    dietary_flags: List[str] = Field(default_factory=list)
    tokens_used: int
    latency_ms: int


class AiUsageSummary(BaseModel):
    total_generations: int
    total_tokens: int
    avg_latency_ms: float
    generations_by_type: Dict[str, int]


class GameOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    slug: str
    description: Optional[str] = None
    category: str
    min_players: int
    max_players: int
    rating: Decimal
    is_active: bool
    config: Optional[Dict[str, Any]] = None
    promotion_active: Optional[bool] = False
    promotion_text: Optional[str] = None
    promotion_code: Optional[str] = None
    promotion_discount_percent: Optional[int] = 0


class GameUpdatePayload(BaseModel):
    is_active: Optional[bool] = None
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    min_players: Optional[int] = None
    max_players: Optional[int] = None
    config: Optional[Dict[str, Any]] = None


class GamePromotionPayload(BaseModel):
    promotion_active: bool
    promotion_text: Optional[str] = None
    promotion_code: Optional[str] = None
    promotion_discount_percent: Optional[int] = Field(default=0, ge=0, le=100)

