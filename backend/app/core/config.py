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
        "http://localhost:5173",
        "http://127.0.0.1:3000",
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
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


# Singleton instance
settings = Settings()
