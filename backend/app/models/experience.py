from sqlalchemy import Column, String, Integer, Numeric, Boolean, Text, ForeignKey, JSON, Index
from app.models.base import Base, generate_uuid, TimestampMixin


class AiGeneration(Base, TimestampMixin):
    """
    Log of sandboxed AI generative operations (Gemini food images & sommelier pairings).
    Guaranteed: zero write access to core deterministic financial or order tables.
    """
    __tablename__ = "ai_generations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    restaurant_id = Column(String(36), ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False, index=True)
    table_id = Column(String(36), ForeignKey("tables.id", ondelete="SET NULL"), nullable=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    generation_type = Column(String(50), nullable=False, index=True)
    prompt = Column(Text, nullable=False)
    result_content = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)
    model_name = Column(String(60), nullable=False, default="gemini-1.5-flash")
    tokens_used = Column(Integer, nullable=False, default=0)
    latency_ms = Column(Integer, nullable=True, default=0)
    metadata_json = Column(JSON, nullable=True, default=dict)
    is_approved = Column(Boolean, nullable=False, default=True)

    __table_args__ = (
        Index("ix_ai_gen_type_created", "restaurant_id", "generation_type", "created_at"),
    )


class Game(Base, TimestampMixin):
    """
    Interactive multiplayer games available for the 32-inch glass dining table surface.
    """
    __tablename__ = "games"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(100), nullable=False)
    slug = Column(String(100), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=False, default="Arcade")
    min_players = Column(Integer, nullable=False, default=1)
    max_players = Column(Integer, nullable=False, default=4)
    rating = Column(Numeric(3, 1), nullable=False, default=4.8)
    is_active = Column(Boolean, nullable=False, default=True)
    config = Column(JSON, nullable=True, default=dict)
    promotion_active = Column(Boolean, nullable=False, default=False)
    promotion_text = Column(String(255), nullable=True)
    promotion_code = Column(String(50), nullable=True)
    promotion_discount_percent = Column(Integer, nullable=True, default=0)
