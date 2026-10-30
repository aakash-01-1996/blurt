from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    database_url: str = "postgresql+psycopg://localhost/blurt"

    # Storage
    storage_backend: str = "local"
    audio_dir: str = "./data/audio"
    s3_endpoint_url: str = ""
    s3_bucket: str = ""
    s3_access_key_id: str = ""
    s3_secret_access_key: str = ""
    audio_retention_days: int = 14
    max_upload_mb: int = 25

    # STT
    stt_provider: str = "mlx"
    stt_model: str = "mlx-community/whisper-small"
    groq_api_key: str = ""

    # LLM
    llm_base_url: str = "http://localhost:11434/v1"
    llm_model: str = "llama3.1:8b"
    llm_api_key: str = "ollama"

    # Pipeline
    router_confidence_threshold: float = 0.7
    worker_concurrency: int = 1
    handled_kinds: str = ""  # comma-separated; empty = handle all kinds

    # Frontend
    api_internal_url: str = "http://localhost:8000"


settings = Settings()
