# 빵지도 — 프로젝트 가이드 (CLAUDE.md)

이 문서는 개발 시작 전 정한 구조/컨벤션/결정사항을 기록한 컨텍스트 문서입니다. 코드를 작성하는 모든 세션은 이 문서의 규칙을 따릅니다.

## 1. 프로젝트 개요

대전 지역 베이커리를 여러 곳 선택하면 가장 효율적인 방문 순서(동선)를 자동 계산해주는 웹 서비스. 상세 기획은 `docs/빵지도_기획서.md`, 추가 기능은 `docs/빵지도_추가기능_스펙.md` 참고.

- 프론트엔드: React (Vite), 데스크톱 브라우저 중심
- 백엔드: Node.js API 서버 직접 구축
- 지도: 네이버지도 JavaScript SDK (NAVER Cloud Platform Maps API v3) — 2주차 중 카카오맵에서 정식 교체
- 인증: 아이디/비밀번호 기반

## 2. 디렉토리 구조

모노레포 구조로 프론트/백엔드를 한 저장소에서 관리합니다.

```
빵지도/
├── client/                      # React (Vite) 프론트엔드
│   ├── src/
│   │   ├── components/          # 재사용 UI 컴포넌트 (Pin, Card, Modal, Chip 등)
│   │   ├── screens/              # 화면 단위 (MapScreen, ListScreen, RouteScreen, ChatScreen, MyPageScreen, AuthModal)
│   │   ├── hooks/                 # 커스텀 훅 (useSelection, useAuth 등)
│   │   ├── api/                    # 백엔드 API 호출 함수 (bakeries.js, auth.js, routes.js)
│   │   ├── store/                  # 전역 상태 (선택된 빵집, 로그인 상태) — Context API 또는 Zustand
│   │   ├── utils/                   # 동선 계산 등 순수 함수 (프론트 캐싱/미리보기용, 최종 계산은 서버)
│   │   ├── styles/                   # 디자인 토큰(색상/타이포), 공통 CSS
│   │   └── main.jsx
│   ├── public/
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── server/                      # Node.js API 서버
│   ├── src/
│   │   ├── routes/                # Express 라우터 (auth.js, bakeries.js, routes.js, users.js)
│   │   ├── controllers/            # 라우트 핸들러 로직
│   │   ├── models/                  # DB 쿼리/모델 (bakery.js, user.js)
│   │   ├── middleware/               # 인증 검증, 에러 핸들러
│   │   ├── services/                  # 동선 계산(완전탐색/휴리스틱), 거리 계산
│   │   ├── db/                         # DB 연결, 마이그레이션, 시드 데이터
│   │   └── app.js
│   ├── .env.example
│   └── package.json
├── docs/                         # 기획 문서
│   ├── 빵지도_기획서.md
│   └── 빵지도_추가기능_스펙.md
├── CLAUDE.md
└── README.md
```

**규칙**: 화면(screen)과 재사용 컴포넌트(component)를 분리합니다. 화면 컴포넌트는 데이터 fetch와 레이아웃을 담당하고, 순수 UI 조각(버튼, 칩, 카드)만 `components/`에 둡니다.

## 3. 기술 스택 / 라이브러리

**프론트엔드**

- `react`, `react-dom`, `vite`
- `react-router-dom` — 화면 전환을 SPA 라우팅으로 처리 (지도/리스트/챗봇/마이페이지 = 각각 경로)
- `axios` — API 호출
- `zustand` — 전역 상태(선택된 빵집 목록, 로그인 유저) 관리. Redux보다 가벼워서 이 규모엔 충분함
- 네이버지도는 npm 래퍼 패키지 대신 공식 스크립트 방식 사용(버전 관리 이슈 회피) — 다만 `index.html`에 정적 `<script>` 태그로 두지 않고 `src/utils/loadNaverMaps.js`에서 동적으로 주입한다. 키 미설정/로드 실패 시 지도 화면에서 안내 메시지를 보여줘야 해서 로드 성공/실패를 Promise로 다룰 필요가 있기 때문.

**백엔드**

- `express` — API 서버 프레임워크
- `pg` — Supabase(Postgres) 접속용 드라이버. 인증(bcrypt+JWT)은 Supabase Auth를 쓰지 않고 자체 Express API가 그대로 담당 — DB만 Supabase로 교체(2주차 중 SQLite에서 전환)
- `bcrypt` — 비밀번호 해시
- `jsonwebtoken` — 인증 토큰 (아래 4번 결정사항 참고)
- `cors`, `dotenv`
- `nodemon` — 개발용 자동 재시작

**공통 개발 도구**

- `eslint` + `prettier` — 코드 포맷/린트
- Node 버전은 `.nvmrc`로 고정 (LTS 기준)

## 4. 코드 컨벤션

- 변수/함수: `camelCase`, 컴포넌트/클래스: `PascalCase`, 상수: `UPPER_SNAKE_CASE`
- 파일명: 컴포넌트는 `PascalCase.jsx`, 나머지는 `camelCase.js`
- 들여쓰기 2칸, 세미콜론 사용, 문자열은 작은따옴표
- 커밋 전 `eslint --fix` + `prettier --write` 실행 (pre-commit hook 또는 수동)
- 함수는 한 가지 역할만 하도록 분리, 컴포넌트 하나에 로직 200줄 넘으면 분리 고려

## 5. 커밋 로그 규칙

**Conventional Commits** 형식을 따릅니다: `타입(범위): 요약`

| 타입         | 의미                     |
| ---------- | ---------------------- |
| `feat`     | 새 기능 추가                |
| `fix`      | 버그 수정                  |
| `docs`     | 문서 변경 (기획서, README 등)  |
| `style`    | 코드 동작에 영향 없는 포맷/스타일 변경 |
| `refactor` | 기능 변경 없는 코드 구조 개선      |
| `test`     | 테스트 추가/수정              |
| `chore`    | 빌드 설정, 패키지 등 기타        |

예시:

```
feat(map): 마감임박/한산해요 말풍선 표시 추가
fix(route): 완전탐색 시 역방향 경로 중복 제거 안 되는 버그 수정
docs: 추가 기능 스펙 문서 반영
```

**브랜치 전략**: `main`(배포 가능 상태 유지) + `feature/기능명` 작업 브랜치. 기능 단위로 작게 커밋하고, 화면 하나 완성 시점마다 커밋을 나눕니다.

## 6. 개발 전 결정 사항

기획서에서 "구현 단계에서 선택"으로 남겨둔 항목들을 아래와 같이 확정합니다.

- **인증 방식**: JWT 토큰 방식 채택 (세션 대신). 프론트/백엔드가 분리된 구조라 서버가 세션을 들고 있지 않아도 되는 stateless 방식이 관리하기 쉬움. 토큰은 로그인 시 발급, `localStorage`에 저장 후 API 호출 시 헤더에 포함.
- **DB 선택**: Supabase(관리형 Postgres). 처음엔 설치 부담이 없는 SQLite로 시작했다가 2주차 중 Supabase로 전환 — 인증까지 Supabase Auth로 넘기지는 않고, DB만 Supabase를 쓰고 회원가입/로그인(bcrypt+JWT)은 계속 자체 Express API가 처리. 연결 정보는 `server/.env`의 `DATABASE_URL`(Supabase 프로젝트의 Connection String), 저장소에는 `.env.example`만 커밋.
- **동선 계산 위치**: 서버에서 계산 (프론트에서 위치 데이터만 보내고, 완전탐색/휴리스틱 로직은 `server/src/services/routeService.js`에서 처리). 이유: 데이터 일관성 확보, 추후 캐싱/로깅 용이.
- **API 응답 포맷 통일**:
  
  ```json
  { "success": true, "data": { ... } }
  { "success": false, "error": { "code": "AUTH_FAILED", "message": "..." } }
  ```
- **네이버지도 API 키**: `client/.env`에 `VITE_NAVER_MAP_CLIENT_ID`로 저장, 저장소에는 `.env.example`만 커밋하고 실제 키는 커밋하지 않음. NAVER Cloud Platform 콘솔(Application)에서 발급하며, 스크립트 쿼리 파라미터명은 `ncpKeyId` (콘솔 "예제 코드" 기준, 예전 문서엔 `ncpClientId`로 안내된 적도 있음 — 콘솔에서 다르게 안내되면 `client/src/utils/loadNaverMaps.js`의 스크립트 URL만 고치면 된다).
- **에러 처리**: 서버는 공통 에러 핸들러 미들웨어 하나로 모든 라우트의 에러를 잡아 위 응답 포맷으로 반환.

## 7. 참고 문서

- `docs/빵지도_기획서.md` — 전체 기획, 화면 구성, 로드맵
- `docs/빵지도_추가기능_스펙.md` — 마감임박/한산해요 말풍선, 찜하기, 필터, 코스저장 등 추가 기능 스펙
