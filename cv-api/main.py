"""
main.py – FastAPI application entry-point for the FRAMS CV/ML API.
"""

import logging
import traceback
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import settings
from routers import face_routes, ml_routes, ds_routes

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("frams.main")

# ── Shared in-memory state (loaded at startup) ────────────────────────────────
app_state: dict = {
    "models_loaded": False,
    "known_embeddings": {},
    "model_metrics": {},
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load pre-trained models and known face embeddings at startup."""
    logger.info("🚀 Starting FRAMS CV/ML API …")

    # --- Try to load face embeddings -----------------------------------------
    try:
        from services.face_recognizer import load_all_embeddings

        embeddings = load_all_embeddings()
        app_state["known_embeddings"] = embeddings
        logger.info(
            "✅ Loaded face embeddings for %d student(s).", len(embeddings)
        )
    except Exception as exc:
        logger.warning("⚠️  Could not load face embeddings: %s", exc)

    # --- Try to load ML model metrics ----------------------------------------
    try:
        from utils.model_utils import load_model_metrics

        metrics = load_model_metrics(settings.MODELS_DIR)
        app_state["model_metrics"] = metrics
        app_state["models_loaded"] = bool(metrics)
        if metrics:
            logger.info("✅ Loaded metrics for %d model(s).", len(metrics))
        else:
            logger.info(
                "ℹ️  No pre-trained models found. Run train_models.py first."
            )
    except Exception as exc:
        logger.warning("⚠️  Could not load model metrics: %s", exc)

    # Make app_state available to all routers via app.state
    app.state.app_state = app_state

    yield  # ── Application running ───────────────────────────────────────────

    logger.info("🛑 Shutting down FRAMS CV/ML API …")


# ── Application factory ────────────────────────────────────────────────────────
def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=(
            "Computer Vision & Machine Learning API for the AI-Powered "
            "Face Recognition Attendance Management System (FRAMS)."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # ── CORS ──────────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Routers ───────────────────────────────────────────────────────────────
    app.include_router(face_routes.router, prefix="/api")
    app.include_router(ml_routes.router, prefix="/api")
    app.include_router(ds_routes.router, prefix="/api")

    # ── Health-check ──────────────────────────────────────────────────────────
    @app.get("/health", tags=["Health"])
    async def health_check():
        return {
            "status": "ok",
            "version": settings.APP_VERSION,
            "models_loaded": app_state.get("models_loaded", False),
            "registered_students": len(app_state.get("known_embeddings", {})),
        }

    # ── Root ──────────────────────────────────────────────────────────────────
    @app.get("/", tags=["Root"])
    async def root():
        return {
            "message": "FRAMS CV/ML API is running",
            "docs": "/docs",
            "health": "/health",
        }

    # ── Global exception handler ──────────────────────────────────────────────
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error(
            "Unhandled exception on %s %s:\n%s",
            request.method,
            request.url,
            traceback.format_exc(),
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "Internal Server Error",
                "detail": str(exc) if settings.DEBUG else "An unexpected error occurred.",
                "path": str(request.url),
            },
        )

    return app


app = create_app()

# ── Entry-point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="debug" if settings.DEBUG else "info",
    )
