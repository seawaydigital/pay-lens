"""Configuration settings for the Pay Lens ETL pipeline."""

from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """ETL pipeline configuration.

    Environment variables are read automatically (case-insensitive).
    Prefix all env vars with nothing — they map directly to field names.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── R2 / S3 storage ──────────────────────────────────────────────
    R2_BUCKET_NAME: str = "pay-lens-data"
    R2_ACCOUNT_ID: str = Field(default="", description="Cloudflare R2 account ID")
    R2_ACCESS_KEY_ID: str = Field(default="", description="R2 access key")
    R2_SECRET_ACCESS_KEY: str = Field(default="", description="R2 secret key")

    # ── Local paths ──────────────────────────────────────────────────
    DATA_DIR: Path = Path("data")

    @property
    def RAW_DIR(self) -> Path:
        return self.DATA_DIR / "raw"

    @property
    def STAGING_DIR(self) -> Path:
        return self.DATA_DIR / "staging"

    @property
    def OUTPUT_DIR(self) -> Path:
        return self.DATA_DIR / "output"

    # ── Data source URLs ─────────────────────────────────────────────
    ONTARIO_DATA_BASE_URL: str = (
        "https://files.ontario.ca/pssd/pssd-salary-disclosure"
    )

    BANK_OF_CANADA_CPI_URL: str = (
        "https://www.bankofcanada.ca/valet/observations/STATIC_INFLATIONCALC/json"
    )

    # ── Pipeline parameters ──────────────────────────────────────────
    FIRST_YEAR: int = 1996
    LATEST_YEAR: int = 2024
    FUZZY_MATCH_THRESHOLD: int = 80


settings = Settings()
