"""
API v1 router aggregator.
Combines all v1 endpoints into a single router.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import upload, descriptive, data, cleaning, export, ai

# Create main v1 router
api_router = APIRouter()

# Include individual endpoint routers
api_router.include_router(upload.router, tags=["Upload"])
api_router.include_router(data.router, tags=["Data"])
api_router.include_router(cleaning.router, prefix="/cleaning", tags=["Data Cleaning"])
api_router.include_router(descriptive.router, prefix="/stats", tags=["Statistics"])
api_router.include_router(export.router, prefix="/export", tags=["Export"])
api_router.include_router(ai.router, prefix="/ai", tags=["AI Assistant"])

# TODO: Add more endpoints as features are developed
# api_router.include_router(cleaning.router, prefix="/cleaning", tags=["Data Cleaning"])
# api_router.include_router(hypothesis.router, prefix="/stats", tags=["Hypothesis Testing"])
# api_router.include_router(survival.router, prefix="/stats", tags=["Survival Analysis"])
