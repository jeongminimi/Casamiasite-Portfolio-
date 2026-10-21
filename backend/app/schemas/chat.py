from pydantic import BaseModel, ConfigDict, Field


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: str = Field(min_length=1, max_length=2000)


class ChatProduct(BaseModel):
    id: str
    name: str
    price_krw: int


class ChatSource(BaseModel):
    product_id: str
    similarity: float
    content: str


class ChatResponse(BaseModel):
    answer: str
    products: list[ChatProduct]
    sources: list[ChatSource]
