from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", ".env.example"),
        env_file_encoding="utf-8",
    )

    PROJECT_NAME: str = "Alfa.Start API"
    VERSION: str = "0.1.0"
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    OPENAI_API_KEY: str = ""
    OPENAI_API_BASE: str = "https://api.openai.com/v1"
    LLM_MODEL: str = "gpt-4o-mini"

    DATABASE_URL: str = "postgresql+asyncpg://alfastart:alfastart_secret@localhost:5432/alfastart"

    AUTH_SECRET_KEY: str = "change-me-to-a-random-secret"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    GIGACHAT_API_KEY: str = ""
    GIGACHAT_CREDENTIALS_PATH: str = ""

    YANDEX_MAPS_API_KEY: str = ""


settings = Settings()
