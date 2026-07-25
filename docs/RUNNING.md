# 로컬 실행 가이드

이 저장소를 처음 받았을 때 프론트엔드/백엔드를 로컬에서 띄우는 방법. 코드/커밋 컨벤션은 `CONTRIBUTING.md`, 일정은 `TASK.md` 참고.

## 사전 준비

- Node.js 24.x, npm 11.x (다른 버전에서도 대체로 동작하지만 이 버전 기준으로 검증함)
- Supabase 프로젝트의 Postgres 연결 문자열 (팀 채널에서 공유받거나 본인 Supabase 무료 티어 프로젝트 생성)

## 1. 의존성 설치

루트에서 한 번만 실행 (npm workspaces로 `frontend`/`backend` 모두 설치됨):

```bash
npm install
```

## 2. 백엔드 환경변수 설정

`backend/.env.example`을 복사해 `backend/.env` 생성 후 값 채우기:

```bash
cp backend/.env.example backend/.env
```

```
PORT=4000
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
```

`DATABASE_URL`은 Supabase 대시보드 → Project Settings → Database에서 확인. 프론트엔드는 별도 `.env` 없이 동작 (Vite dev 서버가 `/api`를 `http://localhost:4000`으로 프록시 — `frontend/vite.config.ts` 참고).

## 3. DB 마이그레이션 + 시드

`backend/`에서 실행:

```bash
cd backend
npx prisma migrate deploy   # 기존 migration 적용 (Supabase DB에 테이블 생성)
npx prisma db seed          # Item 테이블에 시드 데이터 upsert (반복 실행해도 안전)
```

Supabase 무료 티어는 장기 미사용 시 프로젝트가 일시정지될 수 있음 — 연결이 안 되면 Supabase 대시보드에서 프로젝트 resume 여부부터 확인 (`TASK.md` 리스크 메모 참고).

## 4. 개발 서버 실행

루트에서 한 번에:

```bash
npm run dev
```

프론트/백엔드가 동시에 뜬다 (`concurrently`):

- 프론트엔드: http://localhost:5173
- 백엔드: http://localhost:4000 (프론트에서는 직접 접근할 일 거의 없음, `/api/*`로 프록시됨)

워크스페이스 하나만 띄우고 싶으면 `-w` 옵션:

```bash
npm run dev -w frontend
npm run dev -w backend
```

## 5. 정상 동작 확인

```bash
curl http://localhost:4000/api/health
# {"status":"ok"}

curl "http://localhost:4000/api/items/search?q=건전지"
# {"items":[{"id":"...","name":"건전지",...}]}
```

브라우저에서 http://localhost:5173 접속 → `/search`에서 "건전지" 검색 시 결과가 뜨면 정상.

## 자주 겪는 문제

| 증상 | 원인/해결 |
|---|---|
| 백엔드 실행 시 DB 연결 에러 | `.env`의 `DATABASE_URL` 오타 확인, Supabase 프로젝트가 일시정지 상태인지 대시보드에서 확인 |
| `npm run dev -w backend` 실패, `src/server.ts` 없음 관련 에러 | 이미 스캐폴딩되어 있어야 정상 — `git pull`로 최신 브랜치 반영했는지 확인 |
| 프론트에서 검색 결과가 항상 빈 배열 | 시드 데이터 미실행 가능성 — `npx prisma db seed` 재실행 |
| 포트 충돌 (4000/5173 이미 사용 중) | 다른 프로세스 종료 또는 `backend/.env`의 `PORT` 값 변경 (프론트 프록시 대상도 `vite.config.ts`에서 함께 변경 필요) |
