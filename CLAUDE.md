# CLAUDE.md

이 저장소(hub)에서 작업할 때 참고할 안내입니다.

## 프로젝트

React + Vite + TypeScript 프론트엔드와 Express + Prisma(SQLite) 백엔드로 구성된
"소상공인 폐업 도우미" 서비스 프로토타입입니다. 기획 배경은 `docs/기획서.md`,
UI 디자인 시스템은 `docs/design-system.md` (+ `.claude/skills/ui-design`)를 참고하세요.

## 명령어

### 프론트엔드 (루트)
```bash
npm i          # 의존성 설치
npm run dev    # 개발 서버, http://localhost:5173
npm run build  # 프로덕션 빌드 (tsc -b && vite build)
npm run lint   # oxlint
```

### 백엔드 (`server/`)
```bash
npm i                   # 의존성 설치
npm run dev              # tsx watch, http://localhost:4000
npm run build             # tsc
npm run start              # 빌드된 dist/index.js 실행
npm run prisma:migrate      # 마이그레이션 생성/적용
npm run prisma:generate      # Prisma Client 재생성
```

## 아키텍처

### 프론트엔드 (`src/`)

라우터 없이 `App.tsx`의 상태 전환만으로 화면을 바꾼다: 저장된 프로필이 없으면
`Landing` → `OnboardingForm` → `Dashboard` 순으로 진입하고, 프로필이 있으면 재방문 시
바로 `Dashboard`로 간다.

| 경로 | 내용 |
|---|---|
| `components/Landing.tsx` | 마케팅 랜딩 페이지 (히어로, 목업, 기능 소개, CTA) |
| `components/OnboardingForm.tsx` | 5문항 상황 진단 폼 (필/토글 UI) |
| `components/Dashboard.tsx` | 진행률 + 기능별 필터 버튼 + 체크리스트 |
| `components/TaskCard.tsx` | 체크리스트 카드 (근거/출처/D-day) |
| `data/tasks.ts` | 정적 작업 항목 정의 — `condition`/`reason`/`dueDate`가 프로필을 인자로 받는 함수 |
| `hooks/useLocalStorage.ts` | `profile`/`progress` 상태를 localStorage에 캡슐화하는 훅 |
| `types.ts` | `Profile`, `Task`, `TaskGroup` 타입 |

### 백엔드 (`server/`)

| 경로 | 내용 |
|---|---|
| `src/index.ts` | Express 앱 진입점, cors/cookie-parser/session 미들웨어 연결 |
| `src/middleware/session.ts` | 쿠키(`sid`) 기반 익명 세션 발급/조회 |
| `src/routes/profile.ts` | `GET`/`POST /api/profile` |
| `src/routes/progress.ts` | `GET /api/progress`, `POST /:taskId/toggle`, `POST /reset` |
| `prisma/schema.prisma` | `Session` / `Profile` / `TaskProgress` 모델 |

프론트는 아직 `useLocalStorage`로 동작하며, 서버 API로 교체하는 작업은 진행 중이다.
`GET /api/tasks`(작업 항목 필터링)는 아직 없다 — `data/tasks.ts`의 함수 필드를 서버에
어떻게 옮길지(복제 vs 공유 패키지) 결정이 필요하다.

## 커밋 메시지 규칙

`[태그] 요약` 형식. 요약은 50자 내외, 필요하면 본문에 "왜 바꿨는지"를 덧붙인다.
커밋 하나는 논리적으로 하나의 변경만 담는다 — 성격이 다른 변경은 나눠서 커밋한다.

| 태그 | 용도 |
|---|---|
| `[기능]` | 새 기능 추가 |
| `[수정]` | 버그 수정, 기존 동작 변경 |
| `[디자인]` | UI/스타일링 변경 |
| `[문서]` | 문서 추가/수정 (기획서, README, 스킬 문서 등) |
| `[설정]` | 빌드/의존성/디렉토리 구조 등 설정 변경 |
| `[리팩터]` | 동작 변화 없는 코드 구조 개선 |

예: `[기능] 랜딩 페이지 추가`, `[수정] 온보딩 제출 버튼 비활성화 조건 수정`,
`[설정] 서버 디렉토리 스캐폴딩`

## 코드 컨벤션

- **파일명**: 컴포넌트는 PascalCase (`OnboardingForm.tsx` + 동일 이름 `OnboardingForm.css`
  페어), 훅/유틸은 camelCase (`useLocalStorage.ts`), 서버 라우트는 리소스명 camelCase
  (`profile.ts`).
- **네이밍**: 이벤트 핸들러는 `handle*`, boolean 값/props는 `is*`/`has*`, 컴포넌트 props
  타입은 `ComponentNameProps`.
- **컴포넌트**: `function ComponentName(props: Props) { ... }` 선언 + 파일 끝
  `export default`. named export는 지양한다.
- **Import 순서**: 외부 라이브러리 → 내부 타입/훅/컴포넌트 → 스타일(`.css`, 항상 마지막
  줄에 import).
- **TypeScript**: `strict` 모드 유지, `any` 지양. 데이터 shape는 `interface`로 정의하고
  `types.ts`에 모은다.
- **CSS**: BEM 스타일 클래스명(`.block__element--modifier`), 컴포넌트 전용 `.css` 파일
  하나씩. 색상 등 디자인 토큰은 하드코딩하지 않고 `src/index.css`의 CSS 커스텀
  프로퍼티를 재사용한다. 상세 규칙과 컴포넌트 패턴은 `.claude/skills/ui-design` 스킬과
  `docs/design-system.md`를 따른다.
- **서버**: 라우터는 `server/src/routes/`에 리소스별로 분리하고 `Router()`를 export한다.
  Prisma는 `server/src/prisma.ts`의 싱글턴을 재사용한다. 세션이 필요한 라우트는
  `session` 미들웨어가 채워주는 `req.sessionId`를 사용한다.
