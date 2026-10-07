from typing import List, Optional
from sqlalchemy.orm import Session
from app.core.errors import EntityNotFoundException
from app.models import Restaurant
from app.schemas.restaurant import RestaurantOut, RestaurantUpdate


class RestaurantService:
    @staticmethod
    def get_restaurant_by_id(db: Session, restaurant_id: str) -> Restaurant:
        restaurant = db.query(Restaurant).filter_by(id=restaurant_id, is_deleted=False).first()
        if not restaurant:
            raise EntityNotFoundException("Restaurant", restaurant_id)
        return restaurant

    @staticmethod
    def get_current_restaurant(db: Session) -> Restaurant:
        restaurant = db.query(Restaurant).filter_by(is_active=True, is_deleted=False).first()
        if not restaurant:
            raise EntityNotFoundException("Restaurant", "active")
        return restaurant

    @staticmethod
    def list_restaurants(db: Session) -> List[Restaurant]:
        return db.query(Restaurant).filter_by(is_deleted=False).all()

    @staticmethod
    def update_restaurant(db: Session, restaurant_id: str, data: RestaurantUpdate) -> Restaurant:
        restaurant = RestaurantService.get_restaurant_by_id(db, restaurant_id)
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(restaurant, key, value)
        db.commit()
        db.refresh(restaurant)
        return restaurant
