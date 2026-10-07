from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.api.deps import get_current_restaurant, get_db, require_roles
from app.models import Restaurant, User
from app.schemas.common import ApiResponse
from app.schemas.experience import (
    AiCampaignRequest,
    AiCampaignResponse,
    AiConciergeRequest,
    AiConciergeResponse,
    AiFoodImageRequest,
    AiFoodImageResponse,
    AiGenerateRequest,
    AiGenerateResponse,
    AiUsageSummary,
    GameOut,
)
from app.services.ai_service import AiService

router = APIRouter(prefix="/ai", tags=["AI Experience & Culinary Intelligence Engine"])


@router.post("/generate", response_model=ApiResponse[AiGenerateResponse], summary="Generate AI Experience (Sommelier, Promotional, Visual)")
def generate_ai_experience(
    request: Request,
    payload: AiGenerateRequest,
    db: Session = Depends(get_db),
    restaurant: Restaurant = Depends(get_current_restaurant),
):
    """
    Main generative endpoint supporting all AI culinary features:
    - SOMMELIER_PAIRING
    - PROMOTIONAL_CONTENT
    - PERSONALIZED_VISUAL
    - RESTAURANT_CAMPAIGN
    """
    response = AiService.generate_experience(db, restaurant.id, payload)
    return ApiResponse(data=response, message="AI experience generated successfully.")


@router.post("/campaign", response_model=ApiResponse[AiCampaignResponse], summary="Generate Restaurant Marketing & Promotion Campaign")
def generate_restaurant_campaign(
    request: Request,
    payload: AiCampaignRequest,
    db: Session = Depends(get_db),
    restaurant: Restaurant = Depends(get_current_restaurant),
    _user: User = Depends(require_roles("SUPER_ADMIN", "RESTAURANT_ADMIN", "MANAGER")),
):
    """Generates multi-channel marketing campaigns (Headlines, body copy, social captions, CTAs)."""
    response = AiService.generate_campaign(db, restaurant.id, payload)
    return ApiResponse(data=response, message="Restaurant marketing campaign generated.")


@router.post("/food-image", response_model=ApiResponse[AiFoodImageResponse], summary="Generate High-End Food Visual Preview")
def generate_food_image(
    request: Request,
    payload: AiFoodImageRequest,
    db: Session = Depends(get_db),
    restaurant: Restaurant = Depends(get_current_restaurant),
):
    """Generates Michelin-star food photography prompts and high-definition visual previews."""
    response = AiService.generate_food_image(db, restaurant.id, payload)
    return ApiResponse(data=response, message="Food visual preview generated successfully.")


@router.post("/concierge", response_model=ApiResponse[AiConciergeResponse], summary="Smart Dining Concierge / Table Assistant")
def chat_with_concierge(
    request: Request,
    payload: AiConciergeRequest,
    db: Session = Depends(get_db),
    restaurant: Restaurant = Depends(get_current_restaurant),
):
    """
    Interactive customer assistant for diners seated at the smart table:
    Answers culinary questions, advises on dietary/allergy options, suggests pairings.
    Strictly sandboxed: zero ability to alter prices, bills, or order states.
    """
    response = AiService.chat_concierge(db, restaurant.id, payload)
    return ApiResponse(data=response, message="Concierge response generated.")


@router.get("/usage", response_model=ApiResponse[AiUsageSummary], summary="Get AI Usage & Token Tracking Analytics")
def get_ai_usage_summary(
    db: Session = Depends(get_db),
    restaurant: Restaurant = Depends(get_current_restaurant),
    _user: User = Depends(require_roles("SUPER_ADMIN", "RESTAURANT_ADMIN", "MANAGER")),
):
    """Aggregated usage metrics (total tokens, latency, breakdown by generation type)."""
    summary = AiService.get_usage_summary(db, restaurant.id)
    return ApiResponse(data=summary, message="AI usage summary retrieved.")


@router.get("/history", summary="List Recent AI Generations")
def list_ai_history(
    table_id: Optional[str] = Query(None, description="Filter by table ID"),
    generation_type: Optional[str] = Query(None, description="Filter by generation type"),
    limit: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
    restaurant: Restaurant = Depends(get_current_restaurant),
    _user: User = Depends(require_roles("SUPER_ADMIN", "RESTAURANT_ADMIN", "MANAGER")),
):
    """Returns recent AI generation history for audit logging and analysis."""
    records = AiService.list_history(
        db,
        restaurant.id,
        table_id=table_id,
        generation_type=generation_type,
        limit=limit,
    )
    data = [
        {
            "id": r.id,
            "generation_type": r.generation_type,
            "table_id": r.table_id,
            "prompt": r.prompt,
            "result_content": r.result_content,
            "image_url": r.image_url,
            "model_name": r.model_name,
            "tokens_used": r.tokens_used,
            "latency_ms": r.latency_ms,
            "created_at": r.created_at,
        }
        for r in records
    ]
    return ApiResponse(data=data, message="AI history retrieved.")


@router.get("/games", response_model=ApiResponse[List[GameOut]], summary="List Interactive Smart Table Games")
def list_table_games(
    db: Session = Depends(get_db),
):
    """Returns interactive tabletop arcade and party games for the smart surface."""
    games = AiService.list_games(db)
    return ApiResponse(data=games, message="Interactive table games catalog retrieved.")
