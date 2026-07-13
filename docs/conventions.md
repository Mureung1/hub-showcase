# 코드 컨벤션

이 프로젝트의 코드 작성 규칙입니다. **기존 코드에서 실제로 쓰고 있는 패턴**을 명문화한 것으로,
새 코드는 이 규칙을 따르고, 규칙에 없는 부분은 **주변 기존 코드 스타일**을 따릅니다.

- 프론트엔드 규칙: 현재 `src/`(React 19 + Vite) 코드 기준
- 백엔드 규칙: 직접 작업한 Node.js 프로젝트(`KNU_Capstone_Backend`, Express + Mongoose) 구조를 참고해 정의. 단 DB 레이어는 Mongoose 대신 **Prisma(PostgreSQL)** 사용 ([decisions.md](decisions.md) 2026-07-13)
- 포맷 검사: `npm run lint` (oxlint). 별도 포맷터(Prettier)는 도입하지 않으므로 아래 스타일 규칙은 사람이 지킨다.

---

## 1. 공통 원칙

- **ES Modules** 사용 (`import`/`export`, `package.json`의 `"type": "module"`).
- 파일·함수는 **역할이 드러나는 이름**으로. 한글 주석으로 의도를 설명해도 좋다(기존 코드 스타일).
- 한 파일은 한 가지 책임만. 커지면 역할 단위로 분리.

---

## 2. 포맷 / 스타일

프론트엔드와 백엔드의 기계적 스타일이 다르다. 각 영역의 기존 코드를 따른다.

| 항목 | Frontend (`src/`) | Backend (예정) |
| --- | --- | --- |
| 세미콜론 | 사용 안 함 | 사용 |
| 들여쓰기 | 2 space | 4 space |
| 문자열 | 싱글쿼트 `'` | 싱글쿼트 `'` 우선 |
| 모듈 | ESM | ESM |

> 두 영역을 하나로 통일하고 싶어지면 그때 별도로 결정한다. (현재는 각 코드베이스 일관성 우선)

---

## 3. Frontend 규칙 (React 19 + Vite)

### 파일 / 폴더
- 컴포넌트 파일은 `PascalCase.jsx` (예: `ProjectIntro.jsx`, `HeroIllustration.jsx`).
- 아이콘 등 **여러 개를 모아 export하는 컬렉션 모듈**은 소문자 (예: `icons.jsx`).
- 컴포넌트는 `src/components/`에 둔다. 필요할 때만 분리.

### 컴포넌트
- **함수 선언형**으로 작성한다. 화살표 함수 컴포넌트 X.
  ```jsx
  function ProjectIntro() {
    return ( ... )
  }
  export default ProjectIntro
  ```
- `export default`는 **파일 하단**에. 컬렉션 모듈은 named export(`export function HistoryIcon()`).
- Hooks 규칙(rules-of-hooks)은 oxlint가 error로 강제한다.

### 네이밍
- 컴포넌트: `PascalCase` / 변수·함수: `camelCase`
- 모듈 최상단 상수 데이터: `UPPER_SNAKE_CASE` (예: `WHY_CONTRIBUTE`, `HOW_IT_WORKS`)
- CSS 클래스: `kebab-case` (예: `hero-text`, `match-card`)

### import 순서
- 외부 라이브러리 → 내부 모듈 순. 내부 import는 **확장자 `.jsx`를 명시**한다.

### 스타일링
- CSS 파일 + `className` 방식. 인라인 `style`은 **동적 값에만** (예: `style={{ width: '92%' }}`).
- 색·여백·모서리 등 디자인 값은 하드코딩하지 말고 [`docs/design.md`](design.md)의 CSS 변수를 쓴다. (UI는 `firstpr-ui` 스킬 참조)

### 리스트 / 조건부 렌더링
- `.map()` 렌더링 시 **안정적인 key**를 쓴다. 가능하면 고유 값(예: `key={item.title}`), 배열 인덱스는 지양.

---

## 4. Backend 규칙 (Node.js + Express + Prisma)

> 아직 미착수. 백엔드 착수 시 이 규칙으로 시작하고, `KNU_Capstone_Backend`의 구조를 레퍼런스로 삼는다.

### 폴더 구조 (레이어드 아키텍처)
```
app.js                 # 엔트리: 미들웨어/라우터 등록, 서버 실행
prisma/
  schema.prisma        # Prisma 스키마 (테이블·인덱스·관계 정의, 마이그레이션 원본)
src/
  config/              # Prisma Client 인스턴스, 환경 상수 등 설정
  routes/              # 경로 정의 + 미들웨어 연결 (xxxRoutes.js)
  controllers/         # req/res 처리, 입력 검증, HTTP 응답 (xxxController.js)
  services/            # 비즈니스 로직, DB 접근 (xxxService.js)
  middlewares/         # 인증, 검증, rate-limit 등
  utils/               # 로거, 날짜, 파서 등 공통 유틸
  cron/                # 스케줄 작업
```

### 레이어별 책임 (엄격히 분리)
- **Route**: `express.Router()`로 경로 + 미들웨어(인증·검증) + 컨트롤러 핸들러만 연결. 로직 없음.
- **Controller**: `req`에서 값 추출(`params`/`body`/`req.email`), 입력 검증, 서비스 호출, **HTTP 응답 포맷팅**(status + json). `req`/`res`는 여기서만 다룬다.
- **Service**: 순수 비즈니스 로직 + DB 접근(Prisma Client). `req`/`res`를 모른다. 에러는 로깅 후 **throw**한다.
- **Schema**: 테이블·인덱스·관계는 `prisma/schema.prisma`에 정의. Prisma Client는 `config/`에서 싱글턴으로 생성해 서비스에서 import.

### 네이밍
- 파일: `xxxRoutes.js`, `xxxController.js`, `xxxService.js` (camelCase + 역할 접미사).
- Prisma 모델명: `PascalCase` (`model Analysis { ... }`), 테이블 매핑은 `@@map("snake_case")` 복수형 (예: `@@map("analyses")`), 필드는 `camelCase` + `@map("snake_case")`.
- 라우트 마운트 경로: `/api/<resource>` 복수형 (예: `/api/answers`, `/api/questions`).
- 함수: `camelCase`, 동사로 시작 (`requestAnswer`, `getAnswer`, `returnFeedback`).

### 에러 처리
- **Controller**: `try/catch`로 감싸고, 실패 시 [openapi.yaml](openapi.yaml)의 공통 에러 형식으로 응답한다.
  ```js
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '서버에서 오류가 발생했습니다.' } });
  ```
  `code`는 명세의 에러 코드 enum, `message`는 사용자용 한글 문구. 공통 처리(404·500)는 `middlewares/errorHandler.js` 사용.
- **Service**: `try/catch`로 감싸 로거로 컨텍스트와 함께 기록한 뒤 **re-throw**한다.
  ```js
  logger.error('피드백 처리 중 오류:', { error: error.message, stack: error.stack, email });
  throw error;
  ```
- HTTP 상태코드 관례: `200` 성공 · `400` 잘못된 요청 · `401/403` 인증·권한 · `429` rate limit 초과 · `500` 서버 오류.

### 로깅
- winston 기반 `createLogger('moduleName')`(utils)로 모듈별 로거 생성.
- **구조적 로깅**: 메시지 + 컨텍스트 객체(`{ error, stack, userId, email, ... }`)를 함께 남긴다. `console.log`는 부트스트랩/개발용으로 제한.

### DB (Prisma + PostgreSQL)
- 필요한 필드만 조회할 때는 `select` 옵션 사용.
- 여러 테이블을 원자적으로 쓸 때는 `prisma.$transaction()`으로 묶는다.
- 자주 조회하는 필드에 `@@index`를 건다. 모든 모델에 `createdAt DateTime @default(now())` / `updatedAt DateTime @updatedAt` 필드를 둔다.
- 스키마 변경은 반드시 `prisma migrate dev`로 마이그레이션 파일을 남긴다(마이그레이션 파일 커밋).
- 캐시 테이블(`analyses`/`repo_cache`/`issue_cache`)의 만료는 조회 시 `fetchedAt` 검사로 처리.

### 설정 / 보안
- 설정값은 `.env` + `dotenv`로 주입, 기본값 fallback (`process.env.PORT || 3000`).
- 공개 GitHub 정보만 사용(개인정보 미수집). 외부 API(GitHub) 호출은 rate limit·캐싱을 고려한다. ([plan.md](plan.md) 비기능 요구 참조)
- `.env`, 시크릿은 절대 커밋하지 않는다.

---

## 5. 커밋

커밋 메시지는 `commit-message` 스킬의 컨벤션(`<type>: <한글 설명>`)을 따른다.
