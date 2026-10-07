from sqlalchemy import Column, String, Integer, Numeric, Boolean, Text, ForeignKey, UniqueConstraint, JSON, Index, and_
from sqlalchemy.orm import relationship
from app.models.base import Base, generate_uuid, TimestampMixin, SoftDeleteMixin


class Category(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "categories"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    restaurant_id = Column(String(36), ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    slug = Column(String(100), nullable=False, index=True)
    description = Column(String(255), nullable=True)
    sort_order = Column(Integer, nullable=False, default=0)
    icon = Column(String(50), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    __table_args__ = (
        UniqueConstraint("restaurant_id", "slug", name="uq_category_restaurant_slug"),
        Index("ix_category_restaurant_active", "restaurant_id", "is_active", "sort_order"),
    )

    restaurant = relationship("Restaurant", back_populates="categories")
    products = relationship(
        "Product",
        back_populates="category",
        cascade="all, delete-orphan",
        primaryjoin="and_(Product.category_id == Category.id, Product.is_deleted == False)",
    )


class Product(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "products"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    restaurant_id = Column(String(36), ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(String(36), ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False, index=True)
    name = Column(String(120), nullable=False)
    slug = Column(String(120), nullable=False, index=True)
    description = Column(Text, nullable=True)
    base_price = Column(Numeric(10, 2), nullable=False)
    cost_price = Column(Numeric(10, 2), nullable=True, default=0.00)
    calories = Column(Integer, nullable=True)
    prep_time_minutes = Column(Integer, nullable=False, default=15)
    prep_station_code = Column(String(50), nullable=False, default="GRILL")
    stock_status = Column(String(30), nullable=False, default="IN_STOCK", index=True)
    allergens = Column(JSON, nullable=True, default=list)
    tags = Column(JSON, nullable=True, default=list)
    image_url = Column(Text, nullable=True)
    is_available = Column(Boolean, nullable=False, default=True, index=True)

    __table_args__ = (
        UniqueConstraint("restaurant_id", "slug", name="uq_product_restaurant_slug"),
        Index("ix_product_restaurant_cat_avail", "restaurant_id", "category_id", "is_available"),
    )

    restaurant = relationship("Restaurant", back_populates="products")
    category = relationship("Category", back_populates="products")
    options = relationship("ProductOption", back_populates="product", cascade="all, delete-orphan")


class ProductOption(Base, TimestampMixin):
    """
    Modifier group for a dish (e.g. 'Meat Doneness', 'Choice of Side').
    """
    __tablename__ = "product_options"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    product_id = Column(String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(80), nullable=False)
    option_type = Column(String(30), nullable=False, default="SINGLE")
    is_required = Column(Boolean, nullable=False, default=False)
    min_selections = Column(Integer, nullable=False, default=0)
    max_selections = Column(Integer, nullable=False, default=1)
    sort_order = Column(Integer, nullable=False, default=0)

    product = relationship("Product", back_populates="options")
    values = relationship("ProductOptionValue", back_populates="option", cascade="all, delete-orphan")


class ProductOptionValue(Base, TimestampMixin):
    """
    Specific modifier choice (e.g. 'Medium Rare' +$0, 'Truffle Fries' +$4.00).
    """
    __tablename__ = "product_option_values"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    option_id = Column(String(36), ForeignKey("product_options.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(80), nullable=False)
    price_modifier = Column(Numeric(10, 2), nullable=False, default=0.00)
    is_default = Column(Boolean, nullable=False, default=False)
    sort_order = Column(Integer, nullable=False, default=0)
    is_available = Column(Boolean, nullable=False, default=True)

    option = relationship("ProductOption", back_populates="values")
