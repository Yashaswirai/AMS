"""
config.py – Centralised configuration for FRAMS CV API.
All values are read from environment variables (or .env file) with
sensible defaults so the app works out-of-the-box without any
configuration.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the project root (parent of this file's directory)
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


class Settings:
    # ── App ──────────────────────────────────────────────────────────────────
    APP_NAME: str = os.getenv("APP_NAME", "FRAMS-CV-API")
    APP_VERSION: str = os.getenv("APP_VERSION", "1.0.0")
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))

    # ── Directories ──────────────────────────────────────────────────────────
    BASE_DIR: Path = BASE_DIR
    EMBEDDINGS_DIR: Path = BASE_DIR / os.getenv("EMBEDDINGS_DIR", "data/embeddings")
    MODELS_DIR: Path = BASE_DIR / os.getenv("MODELS_DIR", "models")
    DATASET_DIR: Path = BASE_DIR / os.getenv("DATASET_DIR", "data")

    # ── Face Recognition ─────────────────────────────────────────────────────
    FACE_RECOGNITION_THRESHOLD: float = float(
        os.getenv("FACE_RECOGNITION_THRESHOLD", "0.6")
    )
    LIVENESS_BLINK_THRESHOLD: float = float(
        os.getenv("LIVENESS_BLINK_THRESHOLD", "0.21")
    )
    MIN_FACE_SIZE: int = int(os.getenv("MIN_FACE_SIZE", "50"))
    MAX_EMBEDDING_AGE_DAYS: int = int(os.getenv("MAX_EMBEDDING_AGE_DAYS", "365"))

    # ── MongoDB ───────────────────────────────────────────────────────────────
    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    MONGO_DB: str = os.getenv("MONGO_DB", "frams_db")

    # ── ML ────────────────────────────────────────────────────────────────────
    ML_RANDOM_STATE: int = int(os.getenv("ML_RANDOM_STATE", "42"))
    CV_FOLDS: int = int(os.getenv("CV_FOLDS", "5"))

    def __init__(self):
        # Ensure all required directories exist at startup
        for directory in [self.EMBEDDINGS_DIR, self.MODELS_DIR, self.DATASET_DIR]:
            directory.mkdir(parents=True, exist_ok=True)


settings = Settings()
