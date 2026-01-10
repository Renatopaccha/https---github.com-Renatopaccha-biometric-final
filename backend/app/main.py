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
    print("🚀 Biometric API starting up...")
    print(f"📊 Session timeout: {settings.session_timeout_minutes} minutes")
    
    # TODO: Initialize database connection when implementing persistence
    # await database.connect()
    
    yield
    
    # Shutdown
    print("🛑 Biometric API shutting down...")
    cleanup_count = data_manager.cleanup_expired_sessions()
    print(f"🧹 Cleaned up {cleanup_count} expired session(s)")
    
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
