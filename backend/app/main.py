from fastapi import FastAPI

from app.api.routes import health

app = FastAPI(title="hub-clone API")

app.include_router(health.router, prefix="/api")
