from collections.abc import Callable
from threading import Lock
from typing import Any

from PIL import Image

from app.core.config import settings


CATEGORY_MAPPING = {
    "couch": "소파",
    "chair": "의자",
    "dining table": "식탁",
    "bed": "침대",
}


class YoloServiceError(RuntimeError):
    pass


def map_label_to_category(label: str) -> str | None:
    return CATEGORY_MAPPING.get(label.strip().lower())


def _default_model_loader(model_name: str):
    from ultralytics import YOLO

    return YOLO(model_name)


class YoloDetectionService:
    """Lazily loads one YOLO model and serializes inference on that instance."""

    def __init__(
        self,
        model_loader: Callable[[str], Any] | None = None,
        model_name: str | None = None,
    ) -> None:
        self._model_loader = model_loader or _default_model_loader
        self._model_name = model_name or settings.yolo_model
        self._model: Any | None = None
        self._load_lock = Lock()
        self._predict_lock = Lock()

    def _get_model(self):
        if self._model is None:
            with self._load_lock:
                if self._model is None:
                    try:
                        self._model = self._model_loader(self._model_name)
                    except Exception as exc:
                        raise YoloServiceError("YOLO model could not be loaded") from exc
        return self._model

    def detect(self, image: Image.Image) -> list[dict[str, Any]]:
        model = self._get_model()
        try:
            with self._predict_lock:
                results = model.predict(
                    source=image,
                    conf=settings.vision_confidence_threshold,
                    verbose=False,
                )
        except Exception as exc:
            raise YoloServiceError("YOLO inference failed") from exc

        detections: list[dict[str, Any]] = []
        for result in results:
            boxes = result.boxes
            if boxes is None:
                continue
            coordinates = boxes.xyxy.cpu().tolist()
            confidences = boxes.conf.cpu().tolist()
            class_ids = boxes.cls.cpu().tolist()
            names = result.names

            for coords, confidence, class_id in zip(
                coordinates, confidences, class_ids, strict=True
            ):
                confidence_value = float(confidence)
                if confidence_value < settings.vision_confidence_threshold:
                    continue
                label = str(names[int(class_id)])
                category = map_label_to_category(label)
                if category is None:
                    continue
                x1, y1, x2, y2 = (float(value) for value in coords)
                detections.append(
                    {
                        "label": label,
                        "confidence": confidence_value,
                        "bbox": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
                        "category": category,
                    }
                )
        return detections
