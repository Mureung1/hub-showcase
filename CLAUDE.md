# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

로컬 마감 할인 매칭 플랫폼(가제: "마감할인" / "떨이") — 마감 임박 재고를 등록하면 근처 소비자에게 알림을 보내 예약·픽업으로 연결하는 양면 매칭 서비스. 부트캠프 과제 저장소다.

작업 언어는 한국어다(문서, 커밋 메시지, UI 문자열 모두).

## 명령어

Node 22 이상(현재 24 LTS 기준), npm workspaces 모노레포.

```bash
npm install            # 루트에서 1회 — 전체 워크스페이스 설치
npm run dev            # client(5173) + server(4000) 동시 실행
npm run dev:client     # 프론트만 (Vite)
npm run dev:server     # 백엔드만 (nodemon)
npm run build          # client 프로덕션 빌드
npm run format         # Prettier 일괄 포맷
```

서버 환경변수는 `server/.env.example`을 `server/.env`로 복사해서 설정한다(`.env`는 커밋 금지).

린트·테스트 설정은 아직 없다. 부하 테스트는 기획서 방침대로 k6를 사용할 예정.

## 디렉토리 구조

```
hub/
├─ client/            # React 18 + Vite 프론트엔드
│  └─ src/
│     ├─ api/         # axios 인스턴스, 서버 API 호출 모듈 (baseURL: /api)
│     ├─ components/  # 재사용 UI 컴포넌트
│     ├─ pages/       # 라우트 단위 화면 (react-router-dom)
│     ├─ hooks/       # 커스텀 훅 (필요 시 생성)
│     └─ styles/      # 전역 스타일 + 디자인 토큰(CSS 변수)
├─ server/            # Express 백엔드 (ESM)
│  ├─ src/              # 서버가 실행 중에 쓰는 코드만 둔다
│  │  ├─ routes/        # URL → 서비스 연결, 요청/응답 처리
│  │  ├─ services/      # 도메인 로직: 검증·에러 판단·오케스트레이션 (SQL 금지)
│  │  ├─ repositories/  # 데이터 접근: SQL + snake_case→camelCase 매핑
│  │  ├─ middlewares/   # requireUser 등
│  │  ├─ lib/           # httpError, asyncHandler
│  │  ├─ db/            # pg Pool, 트랜잭션 헬퍼 (런타임 전용)
│  │  ├─ app.js         # 미들웨어·라우터 조립 (supertest 대상)
│  │  └─ index.js       # 서버 기동 진입점
│  ├─ scripts/          # 사람이 CLI로 돌리는 것 — 마이그레이션·시딩·측정·검증
│  └─ migrations/       # 스키마 SQL (scripts/migrate.js가 순서대로 적용)
├─ load/              # k6 부하·지연 측정 스크립트
├─ prototype/         # [동결] 기획 검증용 프로토타입 — 실제 개발에서 사용·수정하지 않는다
└─ docs/              # 기획 문서 (빌드 대상 아님)
```

**`src/` vs `scripts/` 구분 기준**: 서버 프로세스가 import 하면 `src/`, 사람이 `npm run`으로 실행하면 `scripts/`. 측정·검증 스크립트가 런타임 코드에 섞이지 않게 한다.

`prototype/`은 기획 단계에서 핵심 루프를 시연한 일회성 산출물이다. 참고는 가능하나(`npm run dev:proto`) 실제 기능 코드를 여기서 가져오거나 여기에 추가하지 않는다.

## 기술 스택 결정사항

- **프론트**: React 18 + Vite, react-router-dom, axios. 상태관리 라이브러리는 도입하지 않고 시작(필요해지면 그때 결정). 스타일은 컴포넌트별 CSS 파일 + 전역 CSS 변수 토큰.
- **백엔드**: Express(ESM) + PostgreSQL. **ORM 없이 `pg` + raw SQL** — 선착순 재고 차감(원자적 `UPDATE ... WHERE 남은수량 >= qty`, `SELECT ... FOR UPDATE`)이 이 프로젝트의 기술 셀링포인트라 SQL을 직접 다룬다.
- **위치 조회**: 1차 Haversine/PostGIS → Redis GeoSpatial은 "최적화 단계"로 도입해 전후 비교(기획서 §6).
- **알림**: **FCM 푸시를 MVP에 포함**(server: `firebase-admin`, client: Firebase JS SDK + 서비스 워커). 인앱 알림을 병행하고, 푸시 권한 거부·미수신 대비 인앱 폴링을 폴백으로 둔다. Firebase 자격증명(서비스 계정 키)은 `server/.env` 경유로 관리하고 커밋하지 않는다.
- **포트**: client 5173, server 4000. Vite dev 서버가 `/api`를 4000으로 프록시하므로 클라이언트 코드는 상대경로 `/api/...`만 사용한다.

## 서버 레이어 규칙

`routes → services → repositories → db/pool` 한 방향으로만 의존한다.

- **services**: SQL을 쓰지 않는다. 입력 검증·에러(httpError) 판단·여러 repository 호출 조합만 담당.
- **repositories**: SQL과 DB 표현(snake_case)을 전담하고, 바깥에는 camelCase 객체를 반환한다. 모든 함수는 마지막 인자로 `db`(기본값 `pool`)를 받아, 트랜잭션 중에는 호출부가 `client`를 넘겨 **같은 연결**을 유지한다.
- **트랜잭션**: `withTransaction(async (client) => ...)`로 감싸고, 그 안의 repository 호출에 `client`를 전달한다. 실패해도 되는 시도는 `trySavepoint`로 감싼다(세션이 aborted 되는 것을 방지).
- `repositories/sql.js`의 SQL 조각 함수 인자에는 **사용자 입력을 절대 넣지 않는다**(문자열로 삽입됨). 값은 항상 `$n` 파라미터로 바인딩.

## API·코드 컨벤션

- REST, 모든 엔드포인트는 `/api` 프리픽스. 응답은 JSON, 에러는 `{ message }` 형태 + 적절한 HTTP 상태코드(app.js의 공통 에러 핸들러 경유).
- 네이밍: DB 테이블·컬럼은 `snake_case`, API JSON과 JS 코드는 `camelCase`, React 컴포넌트 파일은 `PascalCase.jsx`.
- 포맷: Prettier(루트 `.prettierrc` — 세미콜론 없음, single quote, printWidth 100). 커밋 전 `npm run format`.

## 커밋·PR 규칙

- 커밋: Conventional Commits 한국어 — `type(scope): 요약`. type은 `feat|fix|docs|style|refactor|test|chore`, scope는 `client|server|docs|proto` 중 해당 시 표기. 예: `feat(server): 예약 API 및 재고 차감 트랜잭션 추가`
- 개인 작업 브랜치(`N016_김규현`)에서 작업. PR 타이틀 형식: `[루카스아이디_실명] 한 문장 요약`.
- PR 본문은 `.github/pull_request_template.md`의 섹션(주요 작업 리스트 / 내가 설명할 수 있는 부분 / 아직 이해 못 한 부분 / 새로 알게 된 것)을 채우고 라벨을 지정한다.
- **자동 머지 워크플로우**(`.github/workflows/auto-merge.yml`)가 매일 13:00 UTC(22:00 KST)에 열린 PR을 일괄 처리한다: main 타겟은 스킵, `review` 라벨은 스킵, 변경 요청 상태는 연기, **충돌 상태 PR은 자동 close**되므로 충돌을 방치하지 않는다.

## 기획 기준 문서

- **`docs/기획서.md`** — 기획의 원본(canonical spec). 문제 정의, 사용자 시나리오, 알림 타게팅 규칙, 데이터 모델(User/Store/Favorite/Deal/Reservation), MVP 범위. 기능 판단이 필요하면 이 문서를 먼저 따른다. 핵심 불변식: `Deal.남은수량 = 총수량 − Σ(활성 Reservation.수량) ≥ 0`.
- **`docs/visual-기획서.html`** — 화면 흐름·화면 목록·와이어프레임. 독립 HTML 조각(doctype 없음)이라 브라우저에서 바로 렌더링한다.
- **`docs/task.md`** — 주차별 Task(T-xx)와 Backlog. 작업 착수 전 여기서 Task를 확인하고, 완료 시 체크하며 커밋 메시지에 Task ID를 남긴다. 새 작업은 Backlog에 먼저 적는다.
- **`docs/erd.md`** — DB 스키마 기준(ERD). 회원가입 포함 users 단일 테이블 + role 구분, 재고 불변식을 지키는 쿼리 패턴과 인덱스 계획이 정리돼 있다. 마이그레이션(T-01)은 이 문서를 따른다.
- 기획서의 미결 정책은 다음과 같이 채택했다: **위치 기준점 = 사용자가 등록한 기준 주소**(실시간 GPS 아님), **노쇼 = 픽업 마감 시각 경과 시 예약 단순 만료 + 재고 복원**, 로그인·PG 결제는 MVP 범위 외(예약 + 현장결제).

## 디자인 기준

루트의 **`DESIGN.md`**(Toss TDS 토큰 정리본)가 디자인 시안의 기준 문서다. `client/src/styles/index.css`에 핵심 토큰이 CSS 변수로 정의돼 있다:

- 주 인터랙션 색: Toss Blue `#3182f6`, grey 스케일(`#191f28`/`#4e5968`/`#8b95a1`/`#e5e8eb`)
- 라운드 8/12/16px, 단일 레이어 저투명 블랙 섀도
- 가격·수량 등 숫자는 `tabular-nums` + 700 웨이트
- UI·디자인 문서에 이모지 금지(No Emojis 정책) — 아이콘·텍스트 태그로 대체
