from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db, require_roles
from app.models import User
from app.schemas.common import ApiResponse
from app.schemas.user import PermissionOut, RoleOut
from app.services.user_service import UserService

router = APIRouter(prefix="/roles", tags=["Roles & RBAC Permissions"])


@router.get("", response_model=ApiResponse[List[RoleOut]], summary="List all restaurant roles")
def list_roles(
    db: Session = Depends(get_db),
    _user: User = Depends(require_roles("SUPERADMIN", "MANAGER")),
):
    roles = UserService.list_roles(db)
    return ApiResponse(data=[RoleOut.model_validate(r) for r in roles])


@router.get("/permissions", response_model=ApiResponse[List[PermissionOut]], summary="List all system permissions")
def list_permissions(
    db: Session = Depends(get_db),
    _user: User = Depends(require_roles("SUPERADMIN", "MANAGER")),
):
    permissions = UserService.list_permissions(db)
    return ApiResponse(data=[PermissionOut.model_validate(p) for p in permissions])
