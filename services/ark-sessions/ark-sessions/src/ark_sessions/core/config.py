"""Configuration management for ark-sessions."""

import logging
import os
import re

from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# Load environment variables from .env file
load_dotenv()


class Settings(BaseSettings):
    """Application settings."""
    
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/ark_sessions"
    )
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Ensure database URL uses asyncpg driver
        if self.database_url.startswith("postgresql://"):
            self.database_url = self.database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
        # Remove sslmode parameter (asyncpg doesn't support it)
        self.database_url = re.sub(r'[?&]sslmode=[^&]*', '', self.database_url)
    
    port: int = int(os.getenv("PORT", "8080"))
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    
    class Config:
        env_file = ".env"
        case_sensitive = False


def setup_logging(logger_name: str | None = None) -> logging.Logger:
    """Set up logging configuration."""
    logging.basicConfig(
        level=getattr(logging, Settings().log_level.upper()),
        format="%(levelname)s\t%(asctime)s:\t%(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    
    return logging.getLogger(logger_name or "ark-sessions")


# Global settings instance
settings = Settings()
logger = setup_logging()

