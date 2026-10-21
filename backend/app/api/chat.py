from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.chat import ChatProduct, ChatRequest, ChatResponse, ChatSource
from app.services.rag import (
    RagChatService,
    RagConfigurationError,
    RagProviderError,
)


router = APIRouter(prefix="/chat", tags=["chat"])
_chat_service = RagChatService()


def get_rag_chat_service() -> RagChatService:
    return _chat_service


@router.post("", response_model=ChatResponse)
def chat(
    request: ChatRequest,
    db: Annotated[Session, Depends(get_db)],
    service: Annotated[RagChatService, Depends(get_rag_chat_service)],
) -> ChatResponse:
    message = request.message.strip()
    if not message:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="message must not be blank",
        )
    try:
        answer, hits = service.answer(db, message)
    except RagConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from None
    except RagProviderError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI provider request failed",
        ) from None

    return ChatResponse(
        answer=answer,
        products=[
            ChatProduct(
                id=hit.product.id,
                name=hit.product.name,
                price_krw=hit.product.price_krw,
            )
            for hit in hits
        ],
        sources=[
            ChatSource(
                product_id=hit.product.id,
                similarity=round(hit.similarity, 6),
                content=hit.content,
            )
            for hit in hits
        ],
    )
