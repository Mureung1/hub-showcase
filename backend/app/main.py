from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import health, generate, holiday, weather, image

app = FastAPI(title="하소AI API")

# 프론트엔드(Vite 로컬 서버)와 통신 가능하도록 CORS 허용
# TODO: 배포 시 allow_origins를 실제 배포 도메인으로 좁혀야 함
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(generate.router)
app.include_router(holiday.router)
app.include_router(weather.router)
app.include_router(image.router)
