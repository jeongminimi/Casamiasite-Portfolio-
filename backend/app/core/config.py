"""Load server, database, JWT, RAG, and YOLO settings from the environment."""

import os
from dataclasses import dataclass, field

from dotenv import load_dotenv
from sqlalchemy.engine import URL


load_dotenv()


def _parse_cors_origins(value: str) -> list[str]:
    return [origin.strip() for origin in value.split(",") if origin.strip()]


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("APP_NAME", "CASAMIA API")
    app_env: str = os.getenv("APP_ENV", "development")
    api_v1_prefix: str = os.getenv("API_V1_PREFIX", "/api/v1")
    backend_host: str = os.getenv("BACKEND_HOST", "127.0.0.1")
    backend_port: int = int(os.getenv("BACKEND_PORT", "8001"))
    db_host: str = os.getenv("DB_HOST", "127.0.0.1")
    db_port: int = int(os.getenv("DB_PORT", "1101"))
    db_name: str = os.getenv("DB_NAME", "casamia")
    db_user: str = os.getenv("DB_USER", "postgres")
    db_password: str = field(
        default_factory=lambda: os.getenv("DB_PASSWORD", ""),
        repr=False,
    )
    jwt_secret_key: str = field(
        default_factory=lambda: os.getenv("JWT_SECRET_KEY", ""),
        repr=False,
    )
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    jwt_access_token_expire_minutes: int = int(
        os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "60")
    )
    ai_provider: str = os.getenv("AI_PROVIDER", "gemini").strip().lower()
    gemini_api_key: str = field(
        default_factory=lambda: os.getenv("GEMINI_API_KEY", ""),
        repr=False,
    )
    gemini_chat_model: str = os.getenv("GEMINI_CHAT_MODEL", "gemini-flash-lite-latest")
    gemini_embedding_model: str = os.getenv(
        "GEMINI_EMBEDDING_MODEL", "gemini-embedding-2"
    )
    openai_api_key: str = field(
        default_factory=lambda: os.getenv("OPENAI_API_KEY", ""),
        repr=False,
    )
    openai_chat_model: str = os.getenv("OPENAI_CHAT_MODEL", "gpt-5-mini")
    openai_embedding_model: str = os.getenv(
        "OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"
    )
    embedding_dimensions: int = 1536
    rag_top_k: int = int(os.getenv("RAG_TOP_K", "5"))
    rag_min_similarity: float = float(os.getenv("RAG_MIN_SIMILARITY", "0.55"))
    yolo_model: str = os.getenv("YOLO_MODEL", "yolo11n.pt")
    vision_confidence_threshold: float = float(
        os.getenv("VISION_CONFIDENCE_THRESHOLD", "0.35")
    )
    vision_max_upload_bytes: int = int(
        os.getenv("VISION_MAX_UPLOAD_BYTES", str(10 * 1024 * 1024))
    )
    vision_max_image_pixels: int = int(
        os.getenv("VISION_MAX_IMAGE_PIXELS", "25000000")
    )
    cors_origins: list[str] = field(
        default_factory=lambda: _parse_cors_origins(
            os.getenv(
                "CORS_ORIGINS",
                "http://127.0.0.1:5500,http://localhost:5500",
            )
        )
    )

    @property
    def rag_api_key_configured(self) -> bool:
        if self.ai_provider == "gemini":
            return bool(self.gemini_api_key.strip())
        if self.ai_provider == "openai":
            return bool(self.openai_api_key.strip())
        return False

    @property
    def database_url(self) -> str:
        return URL.create(
            drivername="postgresql+psycopg",
            username=self.db_user,
            password=self.db_password or None,
            host=self.db_host,
            port=self.db_port,
            database=self.db_name,
        ).render_as_string(hide_password=False)


settings = Settings()
