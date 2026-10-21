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
    backend_port: int = int(os.getenv("BACKEND_PORT", "8000"))
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
    cors_origins: list[str] = field(
        default_factory=lambda: _parse_cors_origins(
            os.getenv(
                "CORS_ORIGINS",
                "http://127.0.0.1:5500,http://localhost:5500",
            )
        )
    )

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
