# AGENTS.md

이 저장소는 모노레포다: `frontend/`(React) + `backend/`(Express).
서비스 기획서: 띵동(ThingDong) — 위치 기반 자취생 공동구매 분할 웹 플랫폼.
(기획서 내 ERD·상태값·API 명세는 스택과 무관하게 유효. **단, 기획서 7장의 "Next.js / Spring / JPA / MySQL" 아키텍처 서술은 무시할 것** — 실제 스택은 아래 참조.)

## 기술 스택

| 영역             | 선택                                                                             | 비고                                                                                                                                                                                              |
| ---------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 프론트엔드       | React + Vite (순수 SPA)                                                          | Next.js 아님. SSR/SEO 불필요                                                                                                                                                                      |
| 언어             | JavaScript (TS 아님)                                                             |                                                                                                                                                                                                   |
| 백엔드           | Express                                                                          | Spring 아님                                                                                                                                                                                       |
| DB               | MySQL                                                                            |                                                                                                                                                                                                   |
| ORM              | Sequelize                                                                        | 순수 JS 친화적이고, 기획서 7.3의 비관적 락(`SELECT ... FOR UPDATE`)을 `transaction.LOCK.UPDATE`로 그대로 지원                                                                                     |
| 인증             | OAuth 로그인 → JWT (Access Token은 메모리, Refresh Token은 httpOnly+Secure 쿠키) | 기획서 7.7 그대로                                                                                                                                                                                 |
| OAuth 프로바이더 | 카카오, 네이버                                                                   | 구글은 제외                                                                                                                                                                                       |
| 지도 API         | 카카오맵 JS SDK                                                                  | 스크립트 태그로 로드, REST/JS 키 필요 (`.env`의 `KAKAO_MAP_JS_KEY` 등)                                                                                                                            |
| 로컬 개발 DB     | Docker Compose로 MySQL 컨테이너                                                  | 혼자 개발이어도 추천 — 로컬 설치 버전 꼬임 방지, 나중에 팀원/배포 환경과 설정 통일 쉬움                                                                                                           |
| 알림 구현 순서   | 이메일(SMTP) 먼저 → 웹 푸시(FCM) 나중                                            | 웹 푸시는 Service Worker + VAPID 키 발급 등 설정이 더 걸려서 뒤로 미룸. `Notification` 엔티티/발송 로직은 처음부터 이메일·웹푸시 두 채널을 다 받을 수 있게 설계하고, 웹 푸시 발송부만 나중에 구현 |

## 디렉토리 구조

```
my-project/
├── AGENTS.md
├── frontend/
│   ├── src/
│   │   ├── api/            # axios 인스턴스, 엔드포인트별 함수
│   │   ├── components/     # 재사용 UI 컴포넌트 (design-system.md 패턴 준수)
│   │   ├── pages/          # 라우트 단위 페이지 (HomePage, GroupPurchaseDetailPage 등)
│   │   ├── routes/         # React Router 설정
│   │   ├── hooks/          # 커스텀 훅 (useGeolocation 등)
│   │   ├── store/          # 클라이언트 상태 (Zustand)
│   │   ├── styles/
│   │   │   └── tokens.css  # 디자인 토큰
│   │   └── utils/
│   ├── public/
│   ├── docs/
│   │   └── design-system.md  # 컴포넌트 코드 패턴 레퍼런스
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── config/         # db.js, env.js
│   │   ├── models/         # Sequelize 모델 (User, GroupPurchase, UserGroupPurchase, Notification)
│   │   ├── controllers/    # 요청 검증 + DTO 변환만, 비즈니스 로직 없음
│   │   ├── services/       # 트랜잭션 경계 + 도메인 로직
│   │   ├── routes/
│   │   ├── middlewares/    # auth, errorHandler, validate
│   │   ├── schedulers/     # node-cron 배치 (마감 공구 자동취소 등)
│   │   └── utils/          # haversine 거리 계산, apiResponse 포맷 등
│   ├── .env.example
│   └── package.json
└── package.json
```

## 라이브러리

**프론트엔드**

- `react-router-dom` — 라우팅
- `axios` — API 통신
- `@tanstack/react-query` — 서버 상태(피드 목록, 상세 등) 캐싱/리페칭
- `zustand` — 클라이언트 전역 상태(로그인 유저 정보 등), Redux 대신 가볍게
- 카카오맵 JS SDK — npm 패키지 아님, `index.html`에 `<script src="//dapi.kakao.com/v2/maps/sdk.js?appkey=...">`로 로드하거나 `react-kakao-maps-sdk` 래퍼 사용 가능

**백엔드**

- `express`, `sequelize` + `mysql2`
- `jsonwebtoken`, `bcrypt` — 인증
- `passport`, `passport-kakao`, `passport-naver-v2` — 카카오/네이버 OAuth (직접 REST 호출로 구현해도 되지만, 두 개뿐이라 라이브러리로 보일러플레이트 줄이는 쪽 추천)
- `cookie-parser`, `cors`, `helmet` — 보안/쿠키
- `express-validator` — 요청 검증 (Controller 레이어에서 사용)
- `node-cron` — 스케줄러 (7.4 자동취소 배치)
- `nodemailer` — 이메일 발송 (1차 알림 채널, 먼저 구현)
- `web-push` — 웹 푸시(Web Push API + VAPID) — 2차로 나중에 구현
- `winston` 또는 `morgan` — 로깅
- (Advanced 단계) `ioredis` — Redis 캐시/분산락, `socket.io` — 실시간 상태 반영을 폴링 대신 소켓으로

## 코드 컨벤션

- 파일명: React 컴포넌트는 `PascalCase.jsx`, 나머지 JS 파일은 `camelCase.js`
- 백엔드 레이어 규칙: Controller → Service → Model(Repository 역할) 순서 유지, Controller에 비즈니스 로직 넣지 않기
- API 응답은 항상 `{ success, data, error }` 형태로 통일
- 에러는 커스텀 `AppError` 클래스 + 중앙 `errorHandler` 미들웨어에서 처리 (컨트롤러에서 직접 try/catch로 응답 만들지 않기)
- ESLint + Prettier 적용 (세부 룰셋은 개발 착수 시 `eslint-config-airbnb-base` 또는 `eslint-config-standard` 중 택1 — 아래 체크리스트)
- `.env`는 커밋 금지, `.env.example`에 필요한 키만 이름으로 명시

## 커밋 로그 규칙 (Conventional Commits)

```
<type>: <설명>

예)
feat: 공구 참여 신청 API 추가
fix: 정원 초과 시 동시 신청 레이스 컨디션 수정
docs: AGENTS.md에 백엔드 디렉토리 구조 추가
refactor: GroupPurchase 서비스 트랜잭션 분리
style: 버튼 컴포넌트 포맷팅
test: 참여 승인 API 테스트 추가
chore: 패키지 업데이트
```

- type: `feat` `fix` `docs` `style` `refactor` `test` `chore` `perf`
- 설명은 한글, 현재형("~한다"체 아닌 "~함/~추가" 식 요약), 끝에 마침표 없음
- 브랜치명: `feature/기능명`, `fix/버그명` (예: `feature/group-purchase-join`)
- 혼자 개발이면 `main` 하나로 가도 되지만, 기능 단위로 브랜치 나누고 머지하는 습관은 유지 (나중에 롤백/리뷰 쉬움)

## 프론트엔드 디자인 시스템 (ThingDong / Fresh Share Modern)

프론트엔드에서 UI 컴포넌트를 새로 만들거나 수정할 때는 반드시 아래 두 파일을 먼저 확인한다.
임의로 색상, 폰트, radius, spacing 값을 정하지 않는다.

- `frontend/src/styles/tokens.css` — 색상/폰트/radius/spacing/shadow CSS 변수(`--td-*`)와 타이포그래피 유틸리티 클래스.
- `frontend/docs/design-system.md` — 이미 만든 컴포넌트(Button, ProductCard, ProgressBar, SearchInput, Chip)의 실제 JSX + CSS 코드와 네이밍/구조 규칙.

React 함수형 컴포넌트, 이름 있는 export. Tailwind / CSS-in-JS / styled-components 사용하지 않고 `ComponentName.jsx` + `ComponentName.css`로 분리. className은 `td-` 접두사 + BEM.

| 요소         | 규칙                                                                       |
| ------------ | -------------------------------------------------------------------------- |
| Radius       | 버튼/필=pill, 카드=20px, 히어로 배너=24px, 카테고리 아이콘=16px, 그 외=8px |
| 주요 액션 색 | `--td-primary-container` 배경 + `--td-on-primary` 텍스트, pill             |
| 보조 액션 색 | `--td-mint-green` 배경 + `--td-primary` 텍스트, 8px 라운드                 |
| 경고/에러    | 에러/마감=`--td-danger`, 주의=`--td-warning`. 파랑은 유틸리티 전용         |
| 카드 hover   | shadow + `scale(--td-scale-hover)`를 항상 같이                             |

## 개발 전 결정 사항

- [x] **지도 API**: 카카오맵 JS SDK
- [x] **OAuth 프로바이더**: 카카오, 네이버
- [x] **웹 푸시 vs 이메일 우선순위**: 이메일(SMTP) 먼저 구현 → 웹 푸시(FCM)는 나중에 추가
- [x] **로컬 개발 DB**: Docker Compose로 MySQL 컨테이너 (혼자 개발이어도 재현성/재설치 편의 때문에 추천)
- [x] **Redis 도입 시점**: 기획서대로 Advanced 단계로 미룸 — MVP는 Sequelize 트랜잭션 락(`transaction.LOCK.UPDATE`)만으로 간다
- [x] **배포 환경**: 프론트 Vercel(정적 호스팅, 자동배포 간편) + 백엔드 Railway(Express+MySQL을 한 곳에서 관리하기 편함, 무료 티어로 MVP/포트폴리오 데모에 충분). 트래픽 늘면 백엔드만 별도 VM/컨테이너로 이전
- [x] **테스트 범위**: 전체 테스트는 생략하고, 4.3(동시성 제어)·4.4(상태 전이) 두 핵심 로직만 Jest + Supertest로 최소 테스트. 이 두 개가 깨지면 서비스 신뢰(정원 초과, 상태 꼬임)가 바로 무너지기 때문
- [x] **CI**: 혼자 개발이라 지금은 생략. GitHub Actions는 나중에 협업하거나 배포 자동화가 필요해지면 추가 (지금 만들어도 유지비만 듦)
- [x] **ESLint 룰셋**: `eslint-config-standard` — 세미콜론/따옴표 등 논쟁적인 규칙이 airbnb보다 적어서 혼자 개발할 때 규칙과 싸울 일이 적음

모두 결정돼서 이 프로젝트 시작 전 체크리스트는 닫혔다. 진행하다 새로 결정할 게 생기면 이 표 형식으로 아래에 추가한다.

| 날짜 | 결정 사항 | 이유 |
| ---- | --------- | ---- |
|      |           |      |

## 백엔드 (Express) — 추가 컨벤션

(개발 착수 후 API 에러 코드 체계, 트랜잭션 헬퍼 함수 패턴 등 확정되는 대로 이 섹션에 추가)
