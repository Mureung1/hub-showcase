# @cv2pf/server

CV2PF API 서버 (Express). CV 원문 + 선택한 `DESIGN.md` 를 받아 포트폴리오 HTML을 생성한다.
**Claude API 키는 이 서버에만 두고**, 클라이언트는 `/api` 로만 호출한다.

> 2주차 본격 개발용 **스캐폴드**입니다. 라우팅·계층 구조·헬스체크·에러 처리는 잡혀 있고,
> 실제 생성 로직은 키를 넣으면 활성화됩니다.

## 실행

```bash
cp .env.example .env   # ANTHROPIC_API_KEY 등을 채운다
npm install            # (저장소 루트에서 워크스페이스로 한 번에 설치해도 됨)
npm run dev            # node --watch, http://localhost:4000
```

## 엔드포인트

| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/api/health` | `{ status, aiConfigured }` |
| POST | `/api/generate` | body `{ cvMarkdown, designMarkdown }` → `{ html }` |

- 키 미설정 시 `/api/generate` 는 `503` 과 안내 메시지를 반환한다(서버는 정상 기동).

## 구조

```
src/
├─ index.js                 # 진입점 (listen)
├─ app.js                   # Express 앱 조립 (미들웨어·라우터·에러핸들러)
├─ config/env.js            # 환경변수 로드·검증
├─ routes/index.js          # /api 라우터
├─ controllers/             # 요청 검증 + 응답
├─ services/                # 도메인 로직 (Anthropic 호출)
└─ middlewares/             # 404 · 공통 에러 핸들러
```
