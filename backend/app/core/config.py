import os
from dataclasses import dataclass, field

from dotenv import load_dotenv


load_dotenv()


def _parse_cors_origins(value: str) -> list[str]:
    return [origin.strip() for origin in value.split(",") if origin.strip()]


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("APP_NAME", "CASAMIA API")
    app_env: str = os.getenv("APP_ENV", "development")
    api_v1_prefix: str = os.getenv("API_V1_PREFIX", "/api/v1")
    backend_host: str = os.getenv("BACKEND_HOST", "127.0.0.1")
    backend_port: int = int(os.getenv("BACKEND_PORT", "8000"))
    cors_origins: list[str] = field(
        default_factory=lambda: _parse_cors_origins(
            os.getenv(
                "CORS_ORIGINS",
                "http://127.0.0.1:5500,http://localhost:5500",
            )
        )
    )


settings = Settings()
