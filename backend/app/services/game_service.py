import logging
from decimal import Decimal
from typing import List, Optional
from sqlalchemy.orm import Session
from app.core.errors import EntityNotFoundException
from app.models.experience import Game
from app.schemas.experience import GamePromotionPayload, GameUpdatePayload

logger = logging.getLogger("smart_table.games")

INITIAL_GAMES_CATALOG = [
    {
        "slug": "tic-tac-toe",
        "title": "Tic Tac Toe",
        "category": "Quick Touch",
        "min_players": 1,
        "max_players": 2,
        "rating": Decimal("4.9"),
        "description": "Fast-paced 3x3 touch grid. Play across the table with a dining partner or challenge the Chef AI.",
        "config": {
            "difficulty": "normal",
            "touch_haptics": True,
            "theme": "neon-glow",
        },
        "promotion_active": True,
        "promotion_text": "Win against Chef AI to unlock 10% off artisanal cocktails!",
        "promotion_code": "CHEF10",
        "promotion_discount_percent": 10,
    },
    {
        "slug": "memory-match",
        "title": "Culinary Memory Match",
        "category": "Memory & Family",
        "min_players": 1,
        "max_players": 4,
        "rating": Decimal("4.8"),
        "description": "Flip-card match game with premium ingredients: Dry-Aged Ribeye, Alba Truffles, Saffron Velouté, and vintage reserves.",
        "config": {
            "grid_size": "4x4",
            "time_limit_seconds": 90,
            "show_hints": True,
        },
        "promotion_active": False,
        "promotion_text": None,
        "promotion_code": None,
        "promotion_discount_percent": 0,
    },
    {
        "slug": "ludo-game",
        "title": "Ludo Tabletop Deluxe",
        "category": "Board Game",
        "min_players": 2,
        "max_players": 4,
        "rating": Decimal("4.9"),
        "description": "Multiplayer family board game for the 32-inch table. Animated 3D dice rolling and colored quadrants for all table seats.",
        "config": {
            "dice_animation_speed": "fast",
            "safe_zones_enabled": True,
            "turn_timer_seconds": 20,
        },
        "promotion_active": False,
        "promotion_text": None,
        "promotion_code": None,
        "promotion_discount_percent": 0,
    },
    {
        "slug": "restaurant-quiz",
        "title": "Restaurant & Wine Trivia Quiz",
        "category": "Social Trivia",
        "min_players": 1,
        "max_players": 4,
        "rating": Decimal("4.7"),
        "description": "Test your culinary knowledge across wine regions, dry-aging craftsmanship, and Michelin gastronomy heritage.",
        "config": {
            "questions_per_round": 5,
            "time_per_question": 15,
            "reward_score_threshold": 80,
        },
        "promotion_active": True,
        "promotion_text": "Score 80%+ on Gourmet Trivia to unlock a complimentary dessert!",
        "promotion_code": "SWEETGIFT",
        "promotion_discount_percent": 15,
    },
    {
        "slug": "simple-puzzle",
        "title": "Gourmet Chef Sliding Puzzle",
        "category": "Brain Teaser",
        "min_players": 1,
        "max_players": 2,
        "rating": Decimal("4.6"),
        "description": "Sliding tile puzzle featuring artisanal plating and culinary artwork. Arrange the scrambled squares back to perfection.",
        "config": {
            "grid": "3x3",
            "move_limit": 60,
        },
        "promotion_active": False,
        "promotion_text": None,
        "promotion_code": None,
        "promotion_discount_percent": 0,
    },
    {
        "slug": "chess",
        "title": "Classic Tabletop Chess",
        "category": "Strategy",
        "min_players": 2,
        "max_players": 2,
        "rating": Decimal("5.0"),
        "description": "Full 8x8 touch chessboard with touch highlights, capture graveyards, legal move indicators, and timer clocks.",
        "config": {
            "board_theme": "obsidian-gold",
            "highlight_legal_moves": True,
            "timer_minutes": 10,
        },
        "promotion_active": False,
        "promotion_text": None,
        "promotion_code": None,
        "promotion_discount_percent": 0,
    },
]


class GameService:
    """
    Modular Game Management Service:
    Coordinates game registry, admin enablement, configurations, and promotional scheduling.
    Guaranteed: zero write access to customer session, cart, orders, or billing.
    """

    @classmethod
    def ensure_seeded_games(cls, db: Session) -> None:
        """Seed all 6 initial games into the database if not present."""
        for g_data in INITIAL_GAMES_CATALOG:
            existing = db.query(Game).filter_by(slug=g_data["slug"]).first()
            if not existing:
                new_game = Game(
                    slug=g_data["slug"],
                    title=g_data["title"],
                    category=g_data["category"],
                    min_players=g_data["min_players"],
                    max_players=g_data["max_players"],
                    rating=g_data["rating"],
                    description=g_data["description"],
                    config=g_data["config"],
                    promotion_active=g_data["promotion_active"],
                    promotion_text=g_data["promotion_text"],
                    promotion_code=g_data["promotion_code"],
                    promotion_discount_percent=g_data["promotion_discount_percent"],
                    is_active=True,
                )
                db.add(new_game)
        db.commit()

    @classmethod
    def list_games(cls, db: Session, is_active_only: bool = False) -> List[Game]:
        cls.ensure_seeded_games(db)
        query = db.query(Game)
        if is_active_only:
            query = query.filter_by(is_active=True)
        return query.order_by(Game.rating.desc(), Game.title.asc()).all()

    @classmethod
    def get_game_by_id(cls, db: Session, game_id: str) -> Game:
        game = db.query(Game).filter((Game.id == game_id) | (Game.slug == game_id)).first()
        if not game:
            raise EntityNotFoundException("Game", game_id)
        return game

    @classmethod
    def update_game(cls, db: Session, game_id: str, data: GameUpdatePayload) -> Game:
        game = cls.get_game_by_id(db, game_id)

        update_fields = data.model_dump(exclude_unset=True)
        for key, val in update_fields.items():
            setattr(game, key, val)

        db.commit()
        db.refresh(game)
        logger.info(f"Updated game {game.slug}: active={game.is_active}")
        return game

    @classmethod
    def schedule_promotion(cls, db: Session, game_id: str, data: GamePromotionPayload) -> Game:
        game = cls.get_game_by_id(db, game_id)

        game.promotion_active = data.promotion_active
        game.promotion_text = data.promotion_text
        game.promotion_code = data.promotion_code
        game.promotion_discount_percent = data.promotion_discount_percent or 0

        db.commit()
        db.refresh(game)
        logger.info(f"Scheduled promotion on game {game.slug}: code={game.promotion_code}")
        return game
