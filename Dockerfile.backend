# Dockerfile.backend — FastAPI 백엔드
FROM python:3.12-slim

WORKDIR /app

# 의존성 먼저 복사·설치 (레이어 캐시 활용)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 애플리케이션 코드 복사
COPY main.py database.py collector.py ./

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
