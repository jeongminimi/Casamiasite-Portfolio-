from io import BytesIO
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from PIL import Image, UnidentifiedImageError
from starlette.concurrency import run_in_threadpool

from app.core.config import settings
from app.schemas.vision import VisionDetectionResponse
from app.services.yolo import YoloDetectionService, YoloServiceError


router = APIRouter(prefix="/vision", tags=["vision"])
_vision_service = YoloDetectionService()

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}


def get_yolo_service() -> YoloDetectionService:
    return _vision_service


def _decode_image(data: bytes) -> Image.Image:
    try:
        with Image.open(BytesIO(data)) as source:
            source.verify()
        with Image.open(BytesIO(data)) as source:
            width, height = source.size
            if width * height > settings.vision_max_image_pixels:
                raise HTTPException(
                    status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                    detail="Image dimensions are too large",
                )
            source.load()
            return source.convert("RGB")
    except HTTPException:
        raise
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Uploaded file is not a valid image",
        ) from None


@router.post("/detect", response_model=VisionDetectionResponse)
async def detect_furniture(
    file: Annotated[UploadFile, File(...)],
    service: Annotated[YoloDetectionService, Depends(get_yolo_service)],
) -> VisionDetectionResponse:
    filename = file.filename or ""
    extension = Path(filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        await file.close()
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Supported file extensions are jpg, jpeg, png, and webp",
        )
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        await file.close()
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported image content type",
        )

    try:
        data = await file.read(settings.vision_max_upload_bytes + 1)
    finally:
        await file.close()

    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty",
        )
    if len(data) > settings.vision_max_upload_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail="Uploaded file is too large",
        )

    image = _decode_image(data)
    try:
        detections = await run_in_threadpool(service.detect, image)
    except YoloServiceError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Vision model is unavailable",
        ) from None
    finally:
        image.close()

    return VisionDetectionResponse(detections=detections)
