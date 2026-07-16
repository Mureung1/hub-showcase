from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import health, interests, user_interests
from app.core.config import settings
from app.core.errors import register_error_handlers

app = FastAPI(title="hub-clone API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_error_handlers(app)

app.include_router(health.router, prefix="/api")
app.include_router(interests.router, prefix="/api")
app.include_router(user_interests.router, prefix="/api")
