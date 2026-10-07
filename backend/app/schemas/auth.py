from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr = Field(..., json_schema_extra={"example": "admin@smarttable.io"})
    password: str = Field(..., min_length=4, json_schema_extra={"example": "admin12345"})


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: "UserBriefOut"


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., json_schema_extra={"example": "eyJhbGciOi..."})


class LogoutRequest(BaseModel):
    refresh_token: Optional[str] = None


class UserBriefOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    restaurant_id: Optional[str] = None
    email: str
    full_name: str
    role_code: str
    is_active: bool


class DeviceAuthRequest(BaseModel):
    hardware_id: str = Field(..., json_schema_extra={"example": "MINIPC-SN-90001"})
    device_token: str = Field(..., json_schema_extra={"example": "dev_token_01_secret_abc123"})
    screen_resolution: Optional[str] = "1920x1080"
    app_version: Optional[str] = "2.4.0"


class DeviceAuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    table_id: str
    table_number: str
    restaurant_id: str
    device_id: str


TokenResponse.model_rebuild()
