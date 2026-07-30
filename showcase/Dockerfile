# 파이썬 3.10 버전 공식 이미지를 사용합니다
FROM python:3.10-slim

# 컨테이너 안에서 작업할 폴더 지정
WORKDIR /app

# 필요한 패키지 목록을 먼저 복사하고 설치 (캐싱을 통한 빌드 속도 최적화)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 나머지 모든 프로젝트 소스 코드와 벡터DB/로그 파일들을 복사
COPY . .

# 허깅페이스 스페이스는 기본적으로 7860 포트를 사용합니다
EXPOSE 7860

# FastAPI 서버 실행 명령어
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]