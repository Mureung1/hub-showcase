# @cv2pf/server

CV2PF API 서버 (Express). CV 원문 + 선택한 `DESIGN.md`를 받아 포트폴리오 HTML을 생성하고,
생성 결과를 Supabase에 저장·조회한다. **Claude와 Supabase secret key는 이 서버에만 두고**,
클라이언트는 `/api`로만 호출한다.

`POST /api/portfolios` → Supabase insert → `GET /api/portfolios` 조회가 React 결과 화면과
연결돼 있다. Supabase가 없어도 mock 모드로 같은 화면 흐름을 확인할 수 있다.

## 실행

```bash
cp .env.example .env   # ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SECRET_KEY를 채운다
npm install            # (저장소 루트에서 워크스페이스로 한 번에 설치해도 됨)
npm run dev            # node --watch, http://localhost:4000
```

## Supabase 설정

1. Supabase 프로젝트의 SQL Editor에서 다음 migration을 순서대로 실행한다.
   - [`202607140001_create_portfolios.sql`](../supabase/migrations/202607140001_create_portfolios.sql)
   - [`202607230001_add_portfolio_favorite.sql`](../supabase/migrations/202607230001_add_portfolio_favorite.sql)
2. Project Settings의 Data API URL과 서버용 secret key를 `server/.env`에 넣는다.
3. `GET /api/health`의 `databaseConfigured`가 `true`인지 확인한다.

```dotenv
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=sb_secret_xxxxxxxx
```

기존 JWT 방식 프로젝트는 `SUPABASE_SERVICE_ROLE_KEY`도 지원한다. 두 키 모두 브라우저 번들에
포함하면 안 된다. migration은 RLS를 활성화하고 `anon`, `authenticated`의 직접 접근을 막는다.

## 엔드포인트

| Method | Path                           | 설명                                               |
| ------ | ------------------------------ | -------------------------------------------------- |
| GET    | `/api/health`                  | `{ status, aiConfigured, databaseConfigured }`     |
| POST   | `/api/generate`                | body `{ cvMarkdown, designMarkdown }` → `{ html }` |
| POST   | `/api/portfolios`              | 생성 결과 저장 → `201 { portfolio }`               |
| GET    | `/api/portfolios?limit=10`     | 최근 저장 결과 메타데이터 조회                     |
| GET    | `/api/portfolios/:id`          | 저장 결과 HTML 상세 조회                           |
| PATCH  | `/api/portfolios/:id/favorite` | body `{ isFavorite }` → 즐겨찾기 상태 변경         |

- 키 미설정 시 `/api/generate` 는 `503` 과 안내 메시지를 반환한다(서버는 정상 기동).
- Supabase 미설정은 `503`, Data API 실패는 `502`, 잘못된 입력은 `400`으로 구분한다.

## 구조

```
src/
├─ index.js                 # 진입점 (listen)
├─ app.js                   # Express 앱 조립 (미들웨어·라우터·에러핸들러)
├─ config/env.js            # 환경변수 로드·검증
├─ routes/index.js          # /api 라우터
├─ controllers/             # 요청 검증 + 응답
├─ errors/                  # 서비스 공통 오류
├─ services/                # Anthropic · Supabase Data API 호출
└─ middlewares/             # 404 · 공통 에러 핸들러
```
