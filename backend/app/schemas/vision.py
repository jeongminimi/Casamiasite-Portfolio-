from pydantic import BaseModel, Field


class BoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float


class VisionDetection(BaseModel):
    label: str
    confidence: float = Field(ge=0, le=1)
    bbox: BoundingBox
    category: str


class VisionDetectionResponse(BaseModel):
    detections: list[VisionDetection]
