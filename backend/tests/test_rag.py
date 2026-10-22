import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock

from fastapi.testclient import TestClient

from app.api.chat import get_rag_chat_service
from app.core.config import settings
from app.db.session import get_db
from app.main import app
from app.models import Product, ProductEmbedding
from app.services.product_document import build_product_document
from app.services.rag import (
    GeminiRagProvider,
    OpenAIRagProvider,
    RagChatService,
    RagIndexService,
    RagSearchHit,
    parse_product_filters,
)


def make_product(**overrides):
    values = {
        "id": "test-sofa",
        "name": "테스트 3인 소파",
        "brand": "까사미아",
        "category": "소파",
        "price_krw": 1_500_000,
        "description": None,
        "attributes": {
            "seatCount": 3,
            "color": "아이보리",
            "material": None,
            "style": [],
        },
        "rag_enabled": True,
    }
    values.update(overrides)
    return Product(**values)


class FakeProvider:
    def __init__(self):
        self.embedding_model = "fake-embedding"
        self.embed_calls = 0
        self.answer_calls = 0
        self.last_context = ""

    def embed(self, texts):
        self.embed_calls += 1
        return [[0.0] * settings.embedding_dimensions for _ in texts]

    def answer(self, message, context):
        self.answer_calls += 1
        self.last_context = context
        return "근거 기반 테스트 답변"


class FakeSession:
    def __init__(self):
        self.embeddings = {}

    def get(self, model, key):
        if model is ProductEmbedding:
            return self.embeddings.get(key)
        return None

    def add(self, value):
        if isinstance(value, ProductEmbedding):
            self.embeddings[value.product_id] = value

    def execute(self, statement):
        removed = len(self.embeddings)
        self.embeddings.clear()
        return SimpleNamespace(rowcount=removed)


class FakeSearchResult:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return self._rows


class FakeSearchSession:
    def __init__(self, rows):
        self.rows = rows

    def execute(self, statement):
        return FakeSearchResult(self.rows)


class ProductDocumentTests(unittest.TestCase):
    def test_document_combines_searchable_fields_and_omits_empty_values(self):
        document = build_product_document(make_product())

        self.assertIn("상품 ID: test-sofa", document)
        self.assertIn("상품명: 테스트 3인 소파", document)
        self.assertIn("가격: 1,500,000원", document)
        self.assertIn("좌석 수: 3", document)
        self.assertIn("색상: 아이보리", document)
        self.assertNotIn("소재", document)
        self.assertNotIn("설명", document)


class FilterTests(unittest.TestCase):
    def test_parses_korean_price_and_seat_constraints(self):
        filters = parse_product_filters("150만원 이하 3인용 소파 추천해줘")

        self.assertEqual(filters.max_price, 1_500_000)
        self.assertEqual(filters.seat_count, 3)
        self.assertEqual(filters.category, "\uC18C\uD30C")

    def test_parses_full_won_lower_bound(self):
        filters = parse_product_filters("1,000,000원 이상 상품")

        self.assertEqual(filters.min_price, 1_000_000)


class IndexTests(unittest.TestCase):
    def test_same_product_is_not_embedded_twice(self):
        provider = FakeProvider()
        service = RagIndexService(provider=provider)
        session = FakeSession()
        product = make_product()

        self.assertEqual(service.sync_product(session, product), "indexed")
        self.assertEqual(service.sync_product(session, product), "skipped")
        self.assertEqual(provider.embed_calls, 1)
        self.assertEqual(len(session.embeddings), 1)

    def test_changed_product_is_reembedded(self):
        provider = FakeProvider()
        service = RagIndexService(provider=provider)
        session = FakeSession()
        product = make_product()
        service.sync_product(session, product)

        product.price_krw = 1_000_000
        self.assertEqual(service.sync_product(session, product), "indexed")
        self.assertEqual(provider.embed_calls, 2)
        self.assertIn("1,000,000원", session.embeddings[product.id].content)

    def test_rag_enabled_removes_and_restores_index(self):
        provider = FakeProvider()
        service = RagIndexService(provider=provider)
        session = FakeSession()
        product = make_product()
        service.sync_product(session, product)

        product.rag_enabled = False
        self.assertEqual(service.sync_product(session, product), "removed")
        self.assertEqual(len(session.embeddings), 0)

        product.rag_enabled = True
        self.assertEqual(service.sync_product(session, product), "indexed")
        self.assertEqual(len(session.embeddings), 1)
        self.assertEqual(provider.embed_calls, 2)

    def test_delete_removes_index(self):
        session = FakeSession()
        session.embeddings["test-sofa"] = ProductEmbedding(product_id="test-sofa")

        self.assertTrue(RagIndexService.delete_product(session, "test-sofa"))
        self.assertEqual(len(session.embeddings), 0)


class GeminiProviderTests(unittest.TestCase):
    def test_uses_configured_dimension_and_generate_content(self):
        client = MagicMock()
        client.models.embed_content.return_value = SimpleNamespace(
            embeddings=[
                SimpleNamespace(values=[0.0] * settings.embedding_dimensions)
            ]
        )
        client.models.generate_content.return_value = SimpleNamespace(
            text="grounded answer"
        )
        provider = GeminiRagProvider(client=client)

        vector = provider.embed(["product document"])[0]
        answer = provider.answer("question", "verified context")

        self.assertEqual(len(vector), settings.embedding_dimensions)
        self.assertEqual(answer, "grounded answer")
        client.models.embed_content.assert_called_once()
        client.models.generate_content.assert_called_once()


class ChatServiceTests(unittest.TestCase):
    def test_price_and_attribute_filters_limit_grounded_products(self):
        provider = FakeProvider()
        service = RagChatService(provider=provider)
        matching = make_product(price_krw=1_000_000)
        too_expensive = make_product(
            id="expensive-sofa",
            name="고가 소파",
            price_krw=2_000_000,
        )
        session = FakeSearchSession(
            [
                (too_expensive, "고가 상품 근거", 0.05),
                (matching, "조건 일치 상품 근거", 0.10),
            ]
        )

        answer, hits = service.answer(
            session, "150만원 이하 3인용 소파 추천해줘"
        )

        self.assertEqual(answer, "근거 기반 테스트 답변")
        self.assertEqual([hit.product.id for hit in hits], ["test-sofa"])
        self.assertIn("조건 일치 상품 근거", provider.last_context)
        self.assertNotIn("고가 상품 근거", provider.last_context)

    def test_explicit_category_excludes_other_product_categories(self):
        provider = FakeProvider()
        service = RagChatService(provider=provider)
        sofa = make_product()
        bed = make_product(
            id="test-bed",
            name="\uD14C\uC2A4\uD2B8 \uCE68\uB300",
            category="\uCE68\uB300",
        )
        session = FakeSearchSession(
            [(bed, "bed context", 0.10), (sofa, "sofa context", 0.10)]
        )

        hits = service.search(session, "\uC18C\uD30C \uCD94\uCC9C\uD574\uC918")

        self.assertEqual([hit.product.id for hit in hits], ["test-sofa"])

    def test_low_similarity_result_is_excluded(self):
        provider = FakeProvider()
        service = RagChatService(provider=provider)
        session = FakeSearchSession([(make_product(), "weak context", 0.60)])

        answer, hits = service.answer(session, "unrelated question")

        self.assertEqual(hits, [])
        self.assertEqual(provider.answer_calls, 0)
        self.assertTrue(answer)

    def test_no_matching_product_does_not_call_llm(self):
        provider = FakeProvider()
        service = RagChatService(provider=provider)
        session = FakeSearchSession(
            [(make_product(price_krw=2_000_000), "고가 상품 근거", 0.05)]
        )

        answer, hits = service.answer(session, "150만원 이하 3인용 소파")

        self.assertEqual(hits, [])
        self.assertIn("찾지 못했습니다", answer)
        self.assertEqual(provider.answer_calls, 0)


class ChatApiTests(unittest.TestCase):
    def tearDown(self):
        app.dependency_overrides.clear()

    def test_chat_response_contains_verified_product_and_source(self):
        product = make_product(price_krw=1_000_000)
        hit = RagSearchHit(
            product=product,
            content=build_product_document(product),
            distance=0.1,
        )
        service = MagicMock()
        service.answer.return_value = ("테스트 소파를 추천합니다.", [hit])

        app.dependency_overrides[get_db] = lambda: object()
        app.dependency_overrides[get_rag_chat_service] = lambda: service
        response = TestClient(app).post(
            "/api/v1/chat",
            json={"message": "150만원 이하 3인용 소파 추천해줘"},
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["products"][0]["id"], "test-sofa")
        self.assertEqual(body["products"][0]["price_krw"], 1_000_000)
        self.assertEqual(body["sources"][0]["product_id"], "test-sofa")

    def test_chat_rejects_blank_message(self):
        response = TestClient(app).post(
            "/api/v1/chat",
            json={"message": "   "},
        )

        self.assertEqual(response.status_code, 422)


class OpenAIProviderTests(unittest.TestCase):
    def test_uses_embeddings_and_responses_apis(self):
        client = MagicMock()
        client.embeddings.create.return_value = SimpleNamespace(
            data=[
                SimpleNamespace(
                    embedding=[0.0] * settings.embedding_dimensions,
                    index=0,
                )
            ]
        )
        client.responses.create.return_value = SimpleNamespace(
            output_text="근거 기반 답변"
        )
        provider = OpenAIRagProvider(client=client)

        provider.embed(["상품 문서"])
        answer = provider.answer("질문", "상품 컨텍스트")

        self.assertEqual(answer, "근거 기반 답변")
        client.embeddings.create.assert_called_once()
        client.responses.create.assert_called_once()
        self.assertFalse(client.responses.create.call_args.kwargs["store"])


if __name__ == "__main__":
    unittest.main()
