# 상품 카탈로그와 RAG 데이터 흐름

`json/rag_products.json`은 초기 개발 상품 데이터를 보존하는 seed 원본입니다. 브라우저 상품 검색과 상세 화면은 이 파일을 직접 읽지 않고 FastAPI 상품 API를 사용합니다.

## 현재 데이터 흐름

1. `backend/scripts/import_products.py`가 JSON의 camelCase 필드를 PostgreSQL `products` 테이블로 가져옵니다.
2. `backend/scripts/index_products.py`가 `rag_enabled=true`인 상품 문서를 생성합니다.
3. Gemini Embedding 결과를 PostgreSQL `product_embeddings`의 `vector(1536)` 컬럼에 저장합니다.
4. `/api/v1/chat`이 질문 임베딩과 상품 벡터를 cosine similarity로 검색합니다.
5. 관련성 기준을 통과한 실제 DB 상품만 Gemini 답변의 근거와 추천 목록으로 반환합니다.
6. ADMIN 상품 생성·수정·삭제 후 해당 embedding을 생성·갱신·삭제합니다.

## 보존하는 주요 상품 정보

- 일반 컬럼: `id`, `name`, `brand`, `category`, `price_krw`, `image`, `product_url`, `description`, `rag_enabled`
- JSONB: `attributes`, `gallery_images`, `official_benefits`, `official_addons`, `review_info`, `missing_fields`, `source`
- RAG 문서: 상품명, 브랜드, 카테고리, 가격, attributes, 값이 있을 때 description

`rag_products.json`은 초기 데이터 재구축에 필요하므로 사용 중인 파일입니다. 운영 데이터의 기준은 PostgreSQL이며, 프론트엔드는 `/api/v1/products`, `/api/v1/products/search`, `/api/v1/products/{product_id}`를 호출합니다.
