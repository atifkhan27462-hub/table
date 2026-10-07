import base64
import os
import re
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from pydantic import BaseModel
from app.api.deps import require_roles
from app.models import User
from app.schemas.common import ApiResponse

_staff = require_roles("SUPERADMIN", "MANAGER", "KITCHEN")

router = APIRouter(prefix="/uploads", tags=["File & Image Uploads"])

# Ensure uploads directory exists in backend/uploads (same dir mounted as /uploads in main.py)
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
UPLOAD_DIR = os.path.join(BACKEND_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _public_url(request: Request, filename: str) -> str:
    base = str(request.base_url).rstrip("/")
    return f"{base}/uploads/{filename}"

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_FILE_SIZE = 15 * 1024 * 1024  # 15 MB limit


class Base64UploadRequest(BaseModel):
    data: str  # Base64 data URL e.g. "data:image/jpeg;base64,..."
    filename: Optional[str] = "food_image.jpg"


class UploadResponse(BaseModel):
    url: str
    relative_url: str
    filename: str
    size_bytes: int
    content_type: str


def sanitize_filename(filename: str) -> str:
    clean = re.sub(r"[^a-zA-Z0-9_.-]", "_", filename)
    return clean[:60]


@router.post("", response_model=ApiResponse[UploadResponse], summary="Upload product/food image via multipart form")
async def upload_image_file(request: Request, file: UploadFile = File(...), _user: User = Depends(_staff)):
    """
    Accepts JPG, PNG, WEBP, GIF images, saves to /uploads/ with a unique identifier,
    and returns a public URL usable directly in product catalogs and table displays.
    """
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No filename provided.")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file format '{ext}'. Allowed extensions: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # Read contents with size check
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of 15MB.",
        )

    safe_name = sanitize_filename(os.path.splitext(file.filename)[0])
    unique_filename = f"{uuid.uuid4().hex[:12]}_{safe_name}{ext}"
    target_path = os.path.join(UPLOAD_DIR, unique_filename)

    with open(target_path, "wb") as f:
        f.write(contents)

    full_url = _public_url(request, unique_filename)
    rel_url = f"/uploads/{unique_filename}"

    return ApiResponse(
        data=UploadResponse(
            url=full_url,
            relative_url=rel_url,
            filename=unique_filename,
            size_bytes=len(contents),
            content_type=file.content_type or "image/jpeg",
        ),
        message="Image uploaded successfully.",
    )


@router.post("/base64", response_model=ApiResponse[UploadResponse], summary="Upload product image via base64 JSON payload")
def upload_image_base64(req: Base64UploadRequest, request: Request, _user: User = Depends(_staff)):
    """
    Accepts base64 encoded image string (e.g. from canvas or camera/clipboard),
    writes to server disk, and returns public URL.
    """
    raw_data = req.data
    ext = ".jpg"
    content_type = "image/jpeg"

    if "," in raw_data:
        header, base64_str = raw_data.split(",", 1)
        if "png" in header:
            ext = ".png"
            content_type = "image/png"
        elif "webp" in header:
            ext = ".webp"
            content_type = "image/webp"
        elif "gif" in header:
            ext = ".gif"
            content_type = "image/gif"
    else:
        base64_str = raw_data

    try:
        binary_data = base64.b64decode(base64_str)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid base64 payload: {str(e)}")

    if len(binary_data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Image size exceeds 15MB limit.")

    safe_name = sanitize_filename(os.path.splitext(req.filename or "dish")[0])
    unique_filename = f"{uuid.uuid4().hex[:12]}_{safe_name}{ext}"
    target_path = os.path.join(UPLOAD_DIR, unique_filename)

    with open(target_path, "wb") as f:
        f.write(binary_data)

    full_url = _public_url(request, unique_filename)
    rel_url = f"/uploads/{unique_filename}"

    return ApiResponse(
        data=UploadResponse(
            url=full_url,
            relative_url=rel_url,
            filename=unique_filename,
            size_bytes=len(binary_data),
            content_type=content_type,
        ),
        message="Image uploaded and saved successfully.",
    )
