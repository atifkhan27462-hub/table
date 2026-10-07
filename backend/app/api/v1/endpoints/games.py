from typing import List
from fastapi import APIRouter, Depends, Path
from sqlalchemy.orm import Session
from app.api.deps import get_db, require_roles
from app.models import User
from app.schemas.common import ApiResponse
from app.schemas.experience import GameOut, GamePromotionPayload, GameUpdatePayload
from app.services.game_service import GameService

router = APIRouter(prefix="/games", tags=["Modular Table Entertainment Engine"])


@router.get("", response_model=ApiResponse[List[GameOut]], summary="List active table entertainment games for diners")
def list_active_games(db: Session = Depends(get_db)):
    """Returns active games for the 32-inch dining table display."""
    games = GameService.list_games(db, is_active_only=True)
    return ApiResponse(data=[GameOut.model_validate(g) for g in games])


@router.get("/admin", response_model=ApiResponse[List[GameOut]], summary="List all table games for restaurant admin")
def list_all_games_admin(
    db: Session = Depends(get_db),
    _user: User = Depends(require_roles("SUPER_ADMIN", "RESTAURANT_ADMIN", "MANAGER")),
):
    """Returns all games including inactive ones with configuration and promotion details."""
    games = GameService.list_games(db, is_active_only=False)
    return ApiResponse(data=[GameOut.model_validate(g) for g in games])


@router.get("/{game_id}", response_model=ApiResponse[GameOut], summary="Get game details by ID or slug")
def get_game(
    game_id: str = Path(..., description="Game UUID or slug"),
    db: Session = Depends(get_db),
):
    game = GameService.get_game_by_id(db, game_id)
    return ApiResponse(data=GameOut.model_validate(game))


@router.patch("/{game_id}", response_model=ApiResponse[GameOut], summary="Update game configuration or enable/disable")
def update_game(
    payload: GameUpdatePayload,
    game_id: str = Path(..., description="Game UUID or slug"),
    db: Session = Depends(get_db),
    _user: User = Depends(require_roles("SUPER_ADMIN", "RESTAURANT_ADMIN", "MANAGER")),
):
    """Allows restaurant managers to enable/disable games and tweak configuration."""
    game = GameService.update_game(db, game_id, payload)
    return ApiResponse(data=GameOut.model_validate(game), message=f"Game '{game.title}' updated successfully.")


@router.post("/{game_id}/promotion", response_model=ApiResponse[GameOut], summary="Schedule or update game promotion")
def schedule_game_promotion(
    payload: GamePromotionPayload,
    game_id: str = Path(..., description="Game UUID or slug"),
    db: Session = Depends(get_db),
    _user: User = Depends(require_roles("SUPER_ADMIN", "RESTAURANT_ADMIN", "MANAGER")),
):
    """Allows restaurant managers to schedule game promotional rewards (e.g. promo codes for high scores)."""
    game = GameService.schedule_promotion(db, game_id, payload)
    return ApiResponse(data=GameOut.model_validate(game), message=f"Promotion on '{game.title}' scheduled successfully.")
