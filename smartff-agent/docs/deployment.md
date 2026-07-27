# Deployment (v1.0)

## 환경변수

### backend/.env (backend/.env.example 참고)

| 변수 | 설명 |
|---|---|
| `SUPABASE_URL` | Supabase 프로젝트 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ DB 전체 접근 권한을 가진 비밀 키. 절대 커밋하지 말 것. 유출 시 Supabase 대시보드(Settings > API)에서 즉시 재발급(rotate) |
| `PORT` | 백엔드 리스닝 포트 (기본 5000) |
| `FRONTEND_ORIGIN` | CORS 허용 origin. 배포 시 실제 프론트엔드 도메인으로 지정 |

### frontend/.env (frontend/.env.example 참고)

| 변수 | 설명 |
|---|---|
| `VITE_API_BASE_URL` | 백엔드 API 절대주소. Vite 빌드 타임에 값이 고정되므로 배포 대상마다 다시 빌드 필요 |

## 로컬 Docker 실행

빌드 컨텍스트는 **반드시 리포 루트**여야 한다. `backend/Dockerfile`이 루트의
`data/master/` 디렉터리 전체(financialService가 읽는 `merged_dataset.csv`,
patternService가 읽는 `weekday_sales.csv`/`hourly_sales.csv` 등)를 COPY하기
때문에, `backend/` 디렉터리 안에서 빌드하면 `../data`를 참조할 수 없어 실패한다.

```bash
docker compose build
docker compose up
```

- 프론트엔드: http://localhost:8080
- 백엔드: http://localhost:5000/health

종료 및 정리:

```bash
docker compose down -v
```

개별 이미지를 직접 빌드하려면 (docker-compose 없이):

```bash
docker build -f backend/Dockerfile -t smartff-backend .
docker build -f frontend/Dockerfile --build-arg VITE_API_BASE_URL=https://api.example.com -t smartff-frontend .
```

## Master Dataset 재생성 (ETL)

```bash
pip install -r data/scripts/requirements.txt
python3 data/scripts/<etl-script>.py
```

ETL 실행 후 `data/master/merged_dataset.csv`가 갱신되면, 백엔드 이미지를
다시 빌드해야 새 데이터가 반영된다 (현재는 CSV를 이미지에 굽는 구조).

## CI

`.github/workflows/ci.yml`이 push/PR 시 프론트엔드(`tsc --noEmit`, `build`,
`test`)와 백엔드(`build`)를 각각 검증한다. 실제 배포(CD) 단계는 배포 타겟이
정해지면 별도로 추가한다.
