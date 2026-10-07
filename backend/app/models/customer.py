from sqlalchemy import Column, String, Numeric, Integer, Boolean, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base, generate_uuid, TimestampMixin, SoftDeleteMixin


class Customer(Base, TimestampMixin, SoftDeleteMixin):
    """
    Customer entity for CRM, loyalty tiers, table preferences, and dining history.
    """
    __tablename__ = "customers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    restaurant_id = Column(String(36), ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=True, index=True)
    
    name = Column(String(120), nullable=False, index=True)
    phone = Column(String(50), nullable=True, index=True)
    email = Column(String(120), nullable=True, index=True)
    
    vip_tier = Column(String(30), nullable=False, default="Regular")  # Regular, Silver VIP, Gold VIP, Platinum VIP
    total_visits = Column(Integer, nullable=False, default=1)
    lifetime_spent = Column(Numeric(10, 2), nullable=False, default=0.00)
    loyalty_points = Column(Integer, nullable=False, default=0)
    
    favorite_dish = Column(String(120), nullable=True)
    dietary_notes = Column(String(255), nullable=True)  # e.g., Halal, Gluten-Free
    table_preferences = Column(String(255), nullable=True)  # e.g., Prefers Window, Quiet Booth
    last_visit_at = Column(String(50), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    extra_data = Column(JSON, nullable=True, default=dict)
