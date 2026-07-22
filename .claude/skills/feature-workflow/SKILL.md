---
name: feature-workflow
description: SUBZIP에서 이미 docs/api-spec.md에 스펙이 있는 도메인 하나를 실제 백엔드 API + 프론트엔드 페이지로 구현할 때 따르는 작업 순서와 컨벤션. "구독 등록", "정산 페이지", "만족도 설문" 같은 특정 기능을 "만들어줘/구현해줘/페이지 만들고 API도 붙여줘" 라고 요청받았을 때, 또는 BE/FE 중 뭘 먼저 할지 순서를 물어볼 때 사용. API 명세서 자체가 아직 없다면 이 스킬 전에 api-db-designer 에이전트로 먼저 스펙/스키마부터 만들 것. Triggers — "구독 등록 페이지", "정산 페이지 구현", "만족도 설문 페이지", "API 붙여줘", "백엔드 프론트 어떤 순서로", "신규 기능 구현", "페이지랑 API 같이".
---

# SUBZIP 신규 기능 구현 워크플로우

`docs/api-spec.md`에 이미 스펙이 적혀 있는 도메인 하나를 골라, 실제 동작하는 API + 페이지로 구현할 때의 순서와 진행 방식이다. 규칙을 새로 만들지 않고, `CLAUDE.md`/`docs/design.md`/기존 코드 컨벤션을 그대로 따르는 것이 핵심이다.

## 시작 전 확인

1. `docs/checklist.md`에서 이번 주차의 FE/BE 항목 중 무엇이 미완료인지 확인한다.
2. `docs/api-spec.md`에서 다룰 도메인 섹션의 상태(`[확정]`/`[초안]`)와 엔드포인트 목록을 확인한다. 스펙이 아직 없으면 이 스킬을 적용하기 전에 `api-db-designer` 에이전트로 스펙 + `backend/prisma/schema.prisma` 모델부터 만든다.
3. `backend/prisma/migrations/`를 보고 다룰 모델이 실제로 마이그레이션됐는지 확인한다. 스키마에는 있지만 마이그레이션이 안 된 모델이 있으면 체크해둔다 — 실제 실행은 아래 "백엔드" 1번에서 한다.
4. **범위를 좁게 잡는다.** `checklist.md`가 "생성/조회/수정/삭제 API 구현"처럼 여러 엔드포인트를 한 항목에 뭉쳐놔도, 사용자가 특정 엔드포인트(예: 등록)만 요청했다면 그것만 구현하고 나머지는 손대지 않는다. 계획에 범위를 명시적으로 적어둔다.

## 순서: 스펙이 이미 고정돼 있으면 BE 먼저, FE는 그 위에

FE 목업을 먼저 만들면 나중에 실제 연동 시 갈아엎는 이중 작업이 생긴다. `docs/api-spec.md`에 request/response가 이미 구체적으로 적혀 있는 경우, 실제로 동작하는 BE 엔드포인트를 먼저 완성하고 그 위에 FE를 붙이는 편이 효율적이다.

### 백엔드

1. 필요하면 DB 마이그레이션(`npx prisma migrate dev --name ...`)부터 실행.
2. `backend/src/routes/<domain>.routes.js` 신설 — 기존 `auth.routes.js`/`users.routes.js`/`subscriptions.routes.js`와 동일한 패턴을 그대로 따른다 (`subscriptions.routes.js`가 requireAuth + 수동 유효성 검증 + Prisma write를 모두 갖춘 가장 대표적인 예시):
   - 라우터 정의 + 핸들러를 한 파일에 작성 (컨트롤러 분리 없음)
   - 인증 필요한 라우트엔 `requireAuth` 미들웨어
   - 요청 바디 검증은 라이브러리 없이 직접 작성 (`zod` 등 미설치 — 이 프로젝트 컨벤션), 실패 시 `new Error(message); err.status = 400; next(err)`
   - Prisma는 `backend/src/lib/prisma.js`의 싱글턴 `prisma`를 import
   - 응답 JSON은 `docs/api-spec.md`에 적힌 필드/형태를 그대로 따름
3. `backend/src/index.js`에 라우터 등록 (`notFoundHandler` 앞에 `app.use('/api/...', ...)`).
4. 실제로 서버를 띄우고(`npm run dev:backend`) curl 또는 브라우저로 성공/실패 케이스를 수동 테스트한 뒤 FE로 넘어간다. 테스트용 토큰이 필요하면 DB에 임시 유저를 만들고 `signAccessToken`으로 직접 서명해도 되지만, 테스트 스크립트/데이터는 작업 종료 전에 정리한다.

### 프론트엔드

1. `frontend/src/lib/<domain>.js`에 fetch 래퍼 함수 추가 — `lib/auth.js`의 `getToken()`을 재사용해 `Authorization: Bearer <token>` 헤더를 붙이고, 실패 시(`!res.ok`) 백엔드의 `{ error }`를 그대로 담아 `throw new Error(...)`. axios 없음, 항상 순수 fetch.
2. `frontend/src/pages/<Name>.jsx` + `<Name>.css` (PascalCase 페어 컨벤션). 폼이 있는 화면이면 CSS 작성 전에 `design` skill을 먼저 로드해 `docs/design.md` 토큰만 사용한다. 상태는 `useState`로 `idle`/`submitting`/`error`(필요하면 `success`) 문자열 enum을 관리하는 기존 `SubscriptionForm.jsx`의 `status` state 패턴을 재사용.
3. `frontend/src/App.jsx`에 라우트 추가 — 공통 GNB가 필요하면 `Layout` 자식으로, 독립 화면이면 바깥에 추가.
4. 폼 제출 핸들러에서 1번 fetch 함수를 실제로 호출하고 성공/에러를 렌더링.
5. 브라우저(또는 `claude-in-chrome`이 가능하면 실제 클릭)로 성공 케이스와 검증 실패 케이스를 둘 다 확인.

## 진행 방식: 잘게 쪼개서, 매 단계 확인받기

- 한 번에 몰아서 구현하지 않는다. 위 순서를 단계 단위로 쪼개 하나씩 진행하고, **각 단계가 끝나면 멈춰서 정확히 무엇을 했고 어떤 파일이 어떻게 바뀌었는지 설명한 뒤 다음 단계로 넘어갈지 확인받는다.**
- 커밋은 사용자가 직접 한다 — 대신 커밋하지 않는다.
- 세부 결정(입력 형식, 에러 처리 위치, UI 배치 등)에서 사용자가 다른 방향을 원하면 그 결정과 이유를 남기고 되돌리거나 다시 설계한다 — 이런 종류의 작업은 끝까지 자동으로 밀어붙이기보다 매 지점에서 사용자 판단을 반영하는 것이 이 프로젝트의 작업 방식이다.

## 관련 Skill/Agent

- `design` — 폼/카드/버튼 등 UI를 그릴 때 색상·타이포·컴포넌트 패턴의 소스오브트루스.
- `api-db-designer` (agent) — `docs/api-spec.md`와 `backend/prisma/schema.prisma`에 아직 스펙/모델이 없는 도메인을 새로 설계할 때 이 워크플로우보다 먼저 실행.
