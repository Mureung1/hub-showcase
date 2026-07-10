# 개발 컨벤션

React(`frontend/`) + Express(`backend/`) 개발을 시작하기 전에 정한 코드/커밋 규칙. 팀원이 늘어나면 논의 후 갱신한다.

---

## 커밋 메시지 컨벤션

[Conventional Commits](https://www.conventionalcommits.org/) 형식 + 한글 설명을 사용한다.

```
<type>(<scope>): <subject>
```

- **type**: 아래 중 하나
  - `feat` — 새 기능
  - `fix` — 버그 수정
  - `docs` — 문서(README, 주석 등)만 변경
  - `style` — 코드 동작에 영향 없는 포맷/스타일 변경
  - `refactor` — 동작은 그대로, 구조만 개선
  - `test` — 테스트 추가/수정
  - `chore` — 빌드/설정/의존성 등 그 외 잡일
  - `perf` — 성능 개선
- **scope** (선택): 영향 범위. `frontend`, `backend`, `ui`, `api`, `db` 등
- **subject**: 한글로 간결하게, 명령형보다는 "~함/~추가" 식보다 자연스러운 서술로 작성. 마침표 생략.

예시:
```
feat(frontend): 홈 화면 오늘의 배출 일정 카드 추가
fix(backend): 지역별 규정 조회 API 404 처리 수정
docs: README 기술 스택 Backend 섹션 Express로 수정
chore: React+Express 개발 환경 초기 세팅
```

하나의 커밋은 하나의 논리적 변경 단위로 유지한다 (기능 추가 + 무관한 리팩터링을 한 커밋에 섞지 않는다).

PR 타이틀/본문 규칙은 `.github/pull_request_template.md`를 따른다 (`[루카스아이디_실명] - 작업 요약` 형식).

---

## 코드 컨벤션

### 공통 (frontend + backend)
- 언어: **TypeScript**, `strict` 모드 유지. `any` 사용 금지 — 타입을 모르면 `unknown` + 타입 가드로 좁힌다.
- 포맷: 세미콜론 없음, 싱글 쿼트, 2-space 들여쓰기 (Vite 템플릿 기본 스타일을 따른다).
- 파일명: 컴포넌트/클래스는 `PascalCase.tsx`(`HomePage.tsx`), 그 외 유틸/훅/설정은 `camelCase.ts`(`apiClient.ts`, `useAuth.ts`).
- import 순서: 외부 라이브러리 → 내부 절대/상대 경로 → 타입. 미사용 import 남기지 않는다.

### Frontend (`frontend/src`)
- 화면 단위 컴포넌트는 `pages/`, 여러 화면에서 쓰는 UI는 `components/`, 도메인 로직(인식/지역/대형폐기물/포인트)은 `features/<도메인>/`에 둔다.
- 컴포넌트는 `export default function ComponentName() {}` 형태의 named function으로 작성한다 (익명 화살표 함수 export 지양).
- 서버 상태는 반드시 `@tanstack/react-query`를 통해 가져온다 — `useEffect` + `fetch` 직접 호출 금지.
- 스타일은 Tailwind 유틸리티 + `src/styles/index.css`에 정의된 디자인 토큰(`--green-600` 등)만 사용한다. 새 색상/그림자/radius를 임의로 추가하지 않는다 — 자세한 규칙은 `skill.md` 참고.
- 린트: `npm run lint -w frontend` (oxlint).

### Backend (`backend/src`)
- 계층 분리: `routes/`(경로 정의) → `controllers/`(요청/응답 처리) → `services/`(비즈니스 로직·외부 API 호출). 라우트 핸들러에 비즈니스 로직을 직접 작성하지 않는다.
- 요청 바디/쿼리 검증은 `zod` 스키마로 하고, 실패 시 공통 `middlewares/errorHandler`가 처리하도록 에러를 던진다 (컨트롤러에서 res.status().json()으로 직접 에러 포맷을 만들지 않는다).
- 외부 연동(OpenAI, 공공데이터포털 등)은 `services/`에 클라이언트/호출 로직을 모아두고, 컨트롤러는 서비스 함수만 호출한다.
- DB 접근은 Prisma Client로만 하고, raw SQL은 꼭 필요한 경우가 아니면 쓰지 않는다.

---

## 브랜치
- 본인 브랜치(`N144_인민에이`)에서 작업하고 `main`으로 PR을 올린다. 브랜치를 새로 팔 경우 `기능/설명` 형태로 짧게 짓는다 (예: `기능/사진인식-결과화면`).
