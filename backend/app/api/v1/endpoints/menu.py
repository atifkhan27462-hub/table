from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.schemas.common import ApiResponse
from app.schemas.menu import MenuCatalogResponse
from app.services.menu_service import MenuService

router = APIRouter(prefix="/menu", tags=["Menu & Digital Catalog"])


@router.get("", response_model=ApiResponse[MenuCatalogResponse], summary="Get complete menu catalog for 32-inch table display")
def get_menu_catalog(
    restaurant_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    catalog = MenuService.get_full_catalog(db, restaurant_id)
    return ApiResponse(data=catalog)
