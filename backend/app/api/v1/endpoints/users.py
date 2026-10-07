from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db, require_roles, verify_tenant_access
from app.models import User
from app.schemas.common import ApiResponse
from app.schemas.user import UserCreate, UserOut, UserUpdate
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["Staff & User Management"])


@router.get("", response_model=ApiResponse[List[UserOut]], summary="List all staff members")
def list_users(
    restaurant_id: Optional[str] = None,
    db: Session = Depends(get_db),
    _user: User = Depends(require_roles("SUPER_ADMIN", "RESTAURANT_ADMIN", "MANAGER")),
):
    target_rid = restaurant_id or _user.restaurant_id
    if target_rid:
        verify_tenant_access(_user, target_rid)
    users = UserService.list_users(db, target_rid)
    return ApiResponse(data=[UserOut.model_validate(u) for u in users])


@router.get("/{user_id}", response_model=ApiResponse[UserOut], summary="Get staff member details")
def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    _user: User = Depends(require_roles("SUPER_ADMIN", "RESTAURANT_ADMIN", "MANAGER")),
):
    user = UserService.get_user_by_id(db, user_id)
    if user.restaurant_id:
        verify_tenant_access(_user, user.restaurant_id)
    return ApiResponse(data=UserOut.model_validate(user))


@router.post("", response_model=ApiResponse[UserOut], summary="Create new staff member")
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    _user: User = Depends(require_roles("SUPER_ADMIN", "RESTAURANT_ADMIN", "MANAGER")),
):
    user = UserService.create_user(db, payload, actor=_user)
    return ApiResponse(data=UserOut.model_validate(user), message="Staff user created successfully.")


@router.patch("/{user_id}", response_model=ApiResponse[UserOut], summary="Update staff member role or status")
def update_user(
    user_id: str,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    _user: User = Depends(require_roles("SUPER_ADMIN", "RESTAURANT_ADMIN", "MANAGER")),
):
    user = UserService.update_user(db, user_id, payload, actor=_user)
    return ApiResponse(data=UserOut.model_validate(user), message="Staff user updated successfully.")
