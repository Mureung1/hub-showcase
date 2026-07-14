from fastapi import FastAPI

from app.api.routes import health, interests

app = FastAPI(title="hub-clone API")

app.include_router(health.router, prefix="/api")
app.include_router(interests.router, prefix="/api")
