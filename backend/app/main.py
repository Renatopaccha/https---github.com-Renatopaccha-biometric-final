"""
Biometric Backend API
FastAPI application entry point with layered architecture.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.errors import (
    BiometricException,
    biometric_exception_handler,
    http_exception_handler,
    general_exception_handler
)
from app.api.v1.api import api_router
from app.internal.data_manager import data_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager.
    Handles startup and shutdown events.
    """
    # Startup
    print("=" * 70)
    print("🚀 Biometric API starting up...")
    print(f"📊 Session timeout: {settings.session_timeout_minutes} minutes")

    # Display storage backend information
    backend_type = data_manager.get_backend_type()
    backend_class = data_manager.backend.__class__.__name__
    print(f"💾 Storage backend: {backend_class} ({backend_type})")

    # Show Redis status if enabled
    if settings.redis_enabled:
        if data_manager.is_redis_enabled():
            health = data_manager.get_backend_health()
            latency = health.get("latency_ms", "N/A")
            print(f"✅ Redis: Connected (latency: {latency}ms)")
        else:
            print(f"⚠️  Redis: Enabled but not available (using fallback)")
    else:
        print(f"ℹ️  Redis: Disabled (using InMemory backend)")

    print("=" * 70)

    # TODO: Initialize database connection when implementing persistence
    # await database.connect()

    yield

    # Shutdown
    print("=" * 70)
    print("🛑 Biometric API shutting down...")
    cleanup_count = data_manager.cleanup_expired_sessions()
    print(f"🧹 Cleaned up {cleanup_count} expired session(s)")
    print("=" * 70)

    # TODO: Close database connection
    # await database.disconnect()


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Backend API for biostatistical analysis with layered architecture",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register exception handlers
app.add_exception_handler(BiometricException, biometric_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# Include API routers
app.include_router(api_router, prefix="/api/v1")

# TODO: Add authentication middleware when implementing JWT
# from app.core.auth import JWTBearer
# app.add_middleware(JWTBearer)


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint - API health check."""
    return {
        "message": "Biometric API is running",
        "version": settings.app_version,
        "docs": "/docs",
        "active_sessions": data_manager.get_active_sessions_count()
    }


@app.get("/health", tags=["Root"])
async def health_check():
    """Health check endpoint for monitoring."""
    return {
        "status": "healthy",
        "active_sessions": data_manager.get_active_sessions_count()
    }


@app.get("/health/storage", tags=["Root"])
async def storage_health_check():
    """
    Storage backend health check endpoint.

    Returns detailed information about the storage backend including:
    - Backend type (inmemory or redis)
    - Reachability status
    - Latency metrics
    - Redis-specific info (if using Redis)
    - Active sessions count
    """
    try:
        backend_type = data_manager.get_backend_type()
        health_info = data_manager.get_backend_health()

        # Determine overall status
        if health_info.get("reachable", False):
            status = "healthy"
        else:
            status = "unhealthy"

        response = {
            "status": status,
            "backend_type": backend_type,
            "backend_class": data_manager.backend.__class__.__name__,
            "reachable": health_info.get("reachable", False),
            "latency_ms": health_info.get("latency_ms"),
            "active_sessions": data_manager.get_active_sessions_count(),
            "redis_enabled": settings.redis_enabled,
            "redis_available": data_manager.is_redis_enabled(),
        }

        # Add Redis-specific info if available
        if "redis_info" in health_info:
            response["redis_info"] = health_info["redis_info"]

        # Add storage directories for InMemory backend
        if "storage_dirs" in health_info:
            response["storage_dirs"] = health_info["storage_dirs"]

        # Add error if backend is unreachable
        if "error" in health_info:
            response["error"] = health_info["error"]

        return response

    except Exception as e:
        return {
            "status": "error",
            "backend_type": "unknown",
            "error": str(e)
        }
