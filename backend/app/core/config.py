from pathlib import Path
from typing import Literal
from urllib.parse import urlsplit

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import URL


PROJECT_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    postgres_db: str
    postgres_user: str
    postgres_password: str

    db_host: str = "127.0.0.1"
    db_port: int = 5432

    app_env: Literal["development", "production"] = "production"
    auth_cookie_secure: bool = True
    auth_allowed_origins: list[str] = ["https://irstore24.ir"]
    auth_session_ttl_hours: int = Field(default=168, ge=1, le=720)
    auth_login_max_attempts: int = Field(default=5, ge=1, le=100)
    auth_login_max_ip_attempts: int = Field(default=100, ge=1, le=1000)
    auth_login_window_seconds: int = Field(default=900, ge=60, le=86400)

    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @model_validator(mode="after")
    def validate_auth_configuration(self) -> "Settings":
        if not self.auth_allowed_origins:
            raise ValueError("At least one authentication origin is required")
        for origin in self.auth_allowed_origins:
            parsed = urlsplit(origin)
            if (
                parsed.scheme not in ("http", "https")
                or not parsed.hostname
                or parsed.path
                or parsed.query
                or parsed.fragment
                or parsed.username
                or parsed.password
            ):
                raise ValueError("Authentication origins must be absolute origins")
            if self.app_env == "production" and parsed.scheme != "https":
                raise ValueError("Production authentication origins require HTTPS")
            if not self.auth_cookie_secure and (
                self.app_env != "development"
                or parsed.hostname not in ("localhost", "127.0.0.1", "::1")
            ):
                raise ValueError("Insecure cookies are allowed only for local development")
        return self

    @property
    def database_url(self) -> URL:
        return URL.create(
            drivername="postgresql+psycopg",
            username=self.postgres_user,
            password=self.postgres_password,
            host=self.db_host,
            port=self.db_port,
            database=self.postgres_db,
        )


settings = Settings()
