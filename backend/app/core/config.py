"""
Application configuration using pydantic-settings.
Manages environment variables and application settings.
"""

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    
    Attributes:
        app_name: Application name
        app_version: Application version
        debug: Debug mode flag
        cors_origins: Allowed CORS origins
        max_upload_size_mb: Maximum file upload size in megabytes
        session_timeout_minutes: Session expiration time in minutes
        # TODO: Add JWT secret key when implementing authentication
        # jwt_secret_key: str
        # jwt_algorithm: str = "HS256"
        # TODO: Add database URL when implementing persistence
        # database_url: str
    """
    
    app_name: str = "Biometric API"
    app_version: str = "0.1.0"
    debug: bool = True
    
    # CORS configuration
    cors_origins: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",  # Vite dev server
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",  # Vite dev server
        "http://127.0.0.1:5173",
        "https://https-githubcom-renatopaccha-biometric-final-production.up.railway.app",
    ]
    
    # File upload settings
    max_upload_size_mb: int = 50
    allowed_extensions: List[str] = [".csv", ".xlsx", ".xls"]
    
    # Session management
    session_timeout_minutes: int = 60

    # AI Assistant settings
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    max_ai_file_size_mb: int = 20
    ai_temperature: float = 0.7

    # ===== REDIS CONFIGURATION =====
    # Storage backend selection
    redis_enabled: bool = False  # Feature flag: set True to use Redis
    storage_backend: str = "inmemory"  # "redis" or "inmemory"
    storage_fallback_to_memory: bool = True  # Fallback if Redis fails

    # Redis connection
    redis_url: str = "redis://localhost:6379/0"
    redis_db: int = 0
    redis_password: str = ""  # Optional password
    redis_max_connections: int = 50
    redis_socket_timeout: float = 5.0
    redis_socket_connect_timeout: float = 5.0
    redis_retry_on_timeout: bool = True
    redis_health_check_interval: int = 30  # seconds

    # Redis TTL
    redis_session_ttl_seconds: int = 3600  # 60 minutes (matches session_timeout_minutes)
    redis_lock_ttl_seconds: int = 10  # Lock expiration
    redis_lock_retry_attempts: int = 3
    redis_lock_retry_delay_ms: int = 100

    # Serialization
    serialization_method: str = "pyarrow"  # "pyarrow" or "pickle"
    compression_enabled: bool = True
    compression_codec: str = "snappy"  # "snappy", "zstd", "gzip", "lz4"
    max_dataframe_size_mb: int = 500  # Protection against huge DFs

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


# Singleton instance
settings = Settings()
