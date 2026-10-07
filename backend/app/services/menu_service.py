import re
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from app.core.cache import fast_cache
from app.core.errors import EntityNotFoundException, ValidationException
from app.models import Category, Product, ProductOption, ProductOptionValue, Restaurant
from app.schemas.menu import CategoryCreate, CategoryUpdate, MenuCatalogResponse, ProductCreate, ProductUpdate


def slugify(text: str) -> str:
    text = text.lower().strip()
    return re.sub(r"[^\w\s-]", "", text).replace(" ", "-")


class MenuService:
    @staticmethod
    def get_full_catalog(db: Session, restaurant_id: Optional[str] = None) -> MenuCatalogResponse:
        cache_key = f"menu_catalog:{restaurant_id or 'default'}"
        cached = fast_cache.get(cache_key)
        if cached:
            return cached

        restaurant = (
            db.query(Restaurant).filter_by(id=restaurant_id).first()
            if restaurant_id
            else db.query(Restaurant).filter_by(is_active=True).first()
        )
        if not restaurant:
            raise EntityNotFoundException("Restaurant", "active")

        categories = (
            db.query(Category)
            .filter(Category.restaurant_id == restaurant.id, Category.is_active == True, Category.is_deleted == False)
            .options(
                joinedload(Category.products).joinedload(Product.options).joinedload(ProductOption.values)
            )
            .order_by(Category.sort_order)
            .all()
        )

        resp = MenuCatalogResponse(
            restaurant_id=restaurant.id,
            restaurant_name=restaurant.name,
            currency=restaurant.currency,
            categories=categories,
        )
        fast_cache.set(cache_key, resp, ttl_seconds=120)
        return resp

    # Categories
    @staticmethod
    def list_categories(db: Session, restaurant_id: Optional[str] = None) -> List[Category]:
        cache_key = f"categories_list:{restaurant_id or 'all'}"
        cached = fast_cache.get(cache_key)
        if cached:
            return cached

        query = (
            db.query(Category)
            .filter(Category.is_deleted == False)
            .options(
                joinedload(Category.products).joinedload(Product.options).joinedload(ProductOption.values)
            )
        )
        if restaurant_id:
            query = query.filter(Category.restaurant_id == restaurant_id)
        cats = query.order_by(Category.sort_order).all()
        fast_cache.set(cache_key, cats, ttl_seconds=120)
        return cats

    @staticmethod
    def get_category_by_id(db: Session, category_id: str) -> Category:
        category = db.query(Category).filter(Category.id == category_id, Category.is_deleted == False).first()
        if not category:
            raise EntityNotFoundException("Category", category_id)
        return category

    @staticmethod
    def _invalidate_cache() -> None:
        fast_cache.clear()

    @staticmethod
    def create_category(db: Session, restaurant_id: str, data: CategoryCreate) -> Category:
        slug = data.slug or slugify(data.name)
        existing = db.query(Category).filter_by(
            restaurant_id=restaurant_id, slug=slug, is_deleted=False
        ).first()
        if existing:
            raise ValidationException(f"Category slug '{slug}' already exists.")

        category = Category(
            restaurant_id=restaurant_id,
            name=data.name,
            slug=slug,
            description=data.description,
            sort_order=data.sort_order or 0,
            icon=data.icon or "🍽️",
            is_active=True,
        )
        db.add(category)
        db.commit()
        db.refresh(category)
        MenuService._invalidate_cache()
        return category

    @staticmethod
    def update_category(db: Session, category_id: str, data: CategoryUpdate) -> Category:
        cat = MenuService.get_category_by_id(db, category_id)
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(cat, key, value)
        db.commit()
        db.refresh(cat)
        MenuService._invalidate_cache()
        return cat

    @staticmethod
    def delete_category(db: Session, category_id: str) -> None:
        cat = MenuService.get_category_by_id(db, category_id)
        for prod in list(cat.products):
            MenuService.delete_product(db, prod.id)
        cat.is_deleted = True
        cat.is_active = False
        cat.deleted_at = datetime.now(timezone.utc)
        cat.slug = f"{cat.slug}-del-{uuid.uuid4().hex[:6]}"
        db.commit()
        MenuService._invalidate_cache()

    # Products
    @staticmethod
    def list_products(
        db: Session,
        restaurant_id: Optional[str] = None,
        category_id: Optional[str] = None,
        is_available: Optional[bool] = None,
    ) -> List[Product]:
        query = (
            db.query(Product)
            .filter(Product.is_deleted == False)
            .options(joinedload(Product.options).joinedload(ProductOption.values))
        )
        if restaurant_id:
            query = query.filter(Product.restaurant_id == restaurant_id)
        if category_id:
            query = query.filter(Product.category_id == category_id)
        if is_available is not None:
            query = query.filter(Product.is_available == is_available)
        return query.all()

    @staticmethod
    def get_product_by_id(db: Session, product_id: str) -> Product:
        prod = (
            db.query(Product)
            .filter(Product.id == product_id, Product.is_deleted == False)
            .options(joinedload(Product.options).joinedload(ProductOption.values))
            .first()
        )
        if not prod:
            raise EntityNotFoundException("Product", product_id)
        return prod

    @staticmethod
    def create_product(db: Session, restaurant_id: str, data: ProductCreate) -> Product:
        slug = data.slug or slugify(data.name)
        existing = db.query(Product).filter_by(
            restaurant_id=restaurant_id, slug=slug, is_deleted=False
        ).first()
        if existing:
            raise ValidationException(f"Product slug '{slug}' already exists in this restaurant.")

        prod = Product(
            restaurant_id=restaurant_id,
            category_id=data.category_id,
            name=data.name,
            slug=slug,
            description=data.description,
            base_price=data.base_price,
            image_url=data.image_url,
            prep_station_code=data.prep_station_code or "GRILL",
            calories=data.calories,
            prep_time_minutes=data.prep_time_minutes or 15,
            allergens=data.allergens,
            tags=data.tags,
            stock_status=data.stock_status or "IN_STOCK",
            is_available=data.is_available if data.is_available is not None else True,
        )
        db.add(prod)
        db.commit()
        db.refresh(prod)
        MenuService._invalidate_cache()
        return prod

    @staticmethod
    def update_product(db: Session, product_id: str, data: ProductUpdate) -> Product:
        prod = MenuService.get_product_by_id(db, product_id)
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(prod, key, value)
        db.commit()
        db.refresh(prod)
        MenuService._invalidate_cache()
        return prod

    @staticmethod
    def update_stock_status(db: Session, product_id: str, stock_status: str) -> Product:
        prod = MenuService.get_product_by_id(db, product_id)
        prod.stock_status = stock_status.upper()
        prod.is_available = stock_status.upper() != "OUT_OF_STOCK"
        db.commit()
        db.refresh(prod)
        MenuService._invalidate_cache()
        return prod

    @staticmethod
    def delete_product(db: Session, product_id: str) -> None:
        prod = MenuService.get_product_by_id(db, product_id)
        from app.models.order import OrderItem

        has_orders = db.query(OrderItem).filter(OrderItem.product_id == product_id).first() is not None
        if has_orders:
            # Soft delete to preserve order history and avoid foreign key constraint failure
            prod.is_deleted = True
            prod.is_available = False
            prod.deleted_at = datetime.now(timezone.utc)
            prod.slug = f"{prod.slug}-del-{uuid.uuid4().hex[:6]}"
            db.commit()
        else:
            # Hard delete if it was never ordered
            for opt in prod.options:
                for val in opt.values:
                    db.delete(val)
                db.delete(opt)
            db.delete(prod)
            db.commit()
        MenuService._invalidate_cache()

    @staticmethod
    def clear_all_products(db: Session) -> int:
        products = db.query(Product).filter(Product.is_deleted == False).all()
        count = len(products)
        for p in products:
            p.is_deleted = True
            p.is_available = False
            p.deleted_at = datetime.now(timezone.utc)
            p.slug = f"{p.slug}-del-{uuid.uuid4().hex[:6]}"
        db.commit()
        MenuService._invalidate_cache()
        return count

    @staticmethod
    def clear_all_categories(db: Session) -> int:
        categories = db.query(Category).filter(Category.is_deleted == False).all()
        count = len(categories)
        for c in categories:
            for p in list(c.products):
                p.is_deleted = True
                p.is_available = False
                p.deleted_at = datetime.now(timezone.utc)
                p.slug = f"{p.slug}-del-{uuid.uuid4().hex[:6]}"
            c.is_deleted = True
            c.is_active = False
            c.deleted_at = datetime.now(timezone.utc)
            c.slug = f"{c.slug}-del-{uuid.uuid4().hex[:6]}"
        db.commit()
        MenuService._invalidate_cache()
        return count
