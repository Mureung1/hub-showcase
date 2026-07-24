from fastapi import APIRouter

from app.api.health import router as health_router
from app.features.articles.router import router as articles_router
from app.features.interests.router import router as interests_router
from app.features.mission_records.router import router as mission_records_router
from app.features.user_interests.router import router as user_interests_router

api_router = APIRouter(prefix="/api")
api_router.include_router(health_router)
api_router.include_router(interests_router)
api_router.include_router(user_interests_router)
api_router.include_router(articles_router)
api_router.include_router(mission_records_router)
