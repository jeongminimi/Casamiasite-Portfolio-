"""Verify image validation, YOLO mapping, and vision recommendations."""

import unittest
from io import BytesIO
from types import SimpleNamespace
from unittest.mock import MagicMock

from fastapi.testclient import TestClient
from PIL import Image

from app.api.vision import get_yolo_service
from app.db.session import get_db
from app.main import app
from app.services.yolo import (
    CATEGORY_MAPPING,
    YoloDetectionService,
    map_label_to_category,
)


def make_png() -> bytes:
    buffer = BytesIO()
    Image.new("RGB", (8, 6), color=(220, 220, 220)).save(buffer, format="PNG")
    return buffer.getvalue()


class FakeTensor:
    def __init__(self, value):
        self.value = value

    def cpu(self):
        return self

    def tolist(self):
        return self.value


class VisionServiceTests(unittest.TestCase):
    def test_category_mapping(self):
        self.assertEqual(
            CATEGORY_MAPPING,
            {
                "couch": "소파",
                "chair": "의자",
                "dining table": "식탁",
                "bed": "침대",
            },
        )
        self.assertEqual(map_label_to_category("Couch"), "소파")
        self.assertIsNone(map_label_to_category("person"))

    def test_model_is_loaded_once_and_only_mapped_furniture_is_returned(self):
        boxes = SimpleNamespace(
            xyxy=FakeTensor(
                [
                    [1, 2, 30, 40],
                    [0, 0, 5, 5],
                    [10, 12, 35, 45],
                    [5, 6, 20, 25],
                ]
            ),
            conf=FakeTensor([0.91, 0.99, 0.80, 0.10]),
            cls=FakeTensor([0, 1, 2, 2]),
        )
        model = MagicMock()
        model.predict.return_value = [
            SimpleNamespace(
                boxes=boxes,
                names={0: "couch", 1: "person", 2: "chair"},
            )
        ]
        loader = MagicMock(return_value=model)
        service = YoloDetectionService(model_loader=loader)
        image = Image.new("RGB", (50, 50))

        first = service.detect(image)
        second = service.detect(image)

        loader.assert_called_once_with("yolo11n.pt")
        self.assertEqual(first, second)
        self.assertEqual(len(first), 2)
        self.assertEqual(first[0]["label"], "couch")
        self.assertEqual(first[0]["category"], "소파")
        self.assertEqual(first[0]["bbox"]["x2"], 30.0)
        self.assertEqual(first[1]["label"], "chair")
        self.assertEqual(first[1]["category"], "의자")


class FakeVisionService:
    def detect(self, image):
        return [
            {
                "label": "couch",
                "confidence": 0.91,
                "bbox": {"x1": 1, "y1": 2, "x2": 30, "y2": 40},
                "category": "소파",
            }
        ]


class FakeDb:
    def scalars(self, statement):
        return []


class VisionApiTests(unittest.TestCase):
    def setUp(self):
        app.dependency_overrides[get_yolo_service] = lambda: FakeVisionService()
        app.dependency_overrides[get_db] = lambda: FakeDb()
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()

    def test_route_is_registered(self):
        self.assertIn("/api/v1/vision/detect", app.openapi()["paths"])

    def test_valid_image_returns_detection_schema(self):
        response = self.client.post(
            "/api/v1/vision/detect",
            files={"file": ("room.png", make_png(), "image/png")},
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["detections"][0]["label"], "couch")
        self.assertEqual(body["detections"][0]["category"], "소파")
        self.assertEqual(body["detections"][0]["confidence"], 0.91)
        self.assertEqual(body["products"], [])

    def test_invalid_extension_is_rejected(self):
        response = self.client.post(
            "/api/v1/vision/detect",
            files={"file": ("room.gif", make_png(), "image/png")},
        )

        self.assertEqual(response.status_code, 415)

    def test_empty_file_is_rejected(self):
        response = self.client.post(
            "/api/v1/vision/detect",
            files={"file": ("room.png", b"", "image/png")},
        )

        self.assertEqual(response.status_code, 400)

    def test_non_image_payload_is_rejected(self):
        response = self.client.post(
            "/api/v1/vision/detect",
            files={"file": ("room.png", b"not an image", "image/png")},
        )

        self.assertEqual(response.status_code, 422)

    def test_oversized_upload_is_rejected(self):
        response = self.client.post(
            "/api/v1/vision/detect",
            files={
                "file": (
                    "room.png",
                    b"0" * (10 * 1024 * 1024 + 1),
                    "image/png",
                )
            },
        )

        self.assertEqual(response.status_code, 413)


if __name__ == "__main__":
    unittest.main()
