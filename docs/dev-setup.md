# Decision Log 개발 환경 설정

## 1. 목적

Decision Log의 현재 개발 환경, 실행 방법, 패키지 구조와 최소 디렉토리 구성을 정리한다.

처음부터 모든 폴더와 기능을 만들지 않는다.

```text
최소 실행 환경 구성
→ Web·API 실행 확인
→ Mock 기반 기능 개발
→ 필요한 폴더와 패키지를 순차적으로 추가
```

---

## 2. 기술 스택과 현재 상태

| 영역 | 기술 | 현재 상태 |
|---|---|---|
| Frontend | React + Vite 8 | 설정 완료 |
| Backend | Node.js + Express | 설정 완료 |
| Language | TypeScript 6.0.3 | Web·API 적용 완료 |
| Frontend Lint | ESLint + typescript-eslint | Web 적용 완료 |
| Validation | Zod | 설치 완료, 실제 검증은 기능 개발 시 적용 |
| Design System | Astryx (`@astryxdesign`) 0.1.6 | Web 설치·적용 완료 (React 19 호환 확인) |
| Styling | Astryx 테마 토큰 오버라이드 + 보조 일반 CSS | 적용 완료 (`apps/web/src/theme.ts`) |
| 초기 저장 | localStorage | 기능 개발 시 적용 |
| 저장 추상화 | storageAdapter | 기능 개발 시 적용 |
| DB | Supabase PostgreSQL | 후반 적용 |
| Auth | Supabase Auth (이메일 + 비밀번호) | 도입 결정, 기능 개발 시 적용 |
| 패키지 관리 | npm Workspaces | 설정 완료 |
| 동시 실행 | concurrently | 설정 완료 |
| Backend 실행 | tsx | 설정 완료 |
| 환경변수 로드 | dotenv | 설치 완료 |
| 환경변수 검증 | Zod | API `env.ts` 적용 (SPEC-AUTH-003) — `SUPABASE_URL`·`SUPABASE_PUBLISHABLE_KEY` 서버 시작 시 검증 |
| API Auth | Supabase JWT 검증 (`supabase.auth.getUser`) | Express Auth Middleware 적용 (SPEC-AUTH-003) — `req.auth.userId` 설정, `GET /api/auth/me` |

### 핵심 기술 규칙

- Web과 API는 TypeScript 6.x를 사용한다.
- 현재 설치된 TypeScript 버전은 `6.0.3`이다.
- 루트 `package.json`의 `overrides`로 Workspace 전체 TypeScript 버전을 통일한다.
- TypeScript 7은 현재 ESLint 도구 호환성 문제로 사용하지 않는다.
- Zod 스키마를 먼저 작성하고 `z.infer`로 TypeScript 타입을 만든다.
- 외부 요청, AI 응답, DB 응답은 Zod로 검증한다.
- `storageAdapter`는 처음부터 `Promise` 기반으로 작성한다.
- React는 회원가입, 로그인, 로그아웃, 세션 확인 등 Supabase Auth 기능에 한해 Supabase Client를 직접 사용할 수 있다.
- 서비스 데이터의 조회·저장에는 Supabase Client를 직접 사용하지 않고 Express API를 거친다.
- 로그인 사용자의 데이터 소유자는 `auth.users.id`(`user_id`)를 기준으로 한다.
- 저장 흐름은 `React → Express → Supabase`를 따른다.
- AI API Key와 Supabase Secret Key, Service Role Key는 백엔드에서만 관리한다.

---

## 3. 현재 디렉토리 구조

```text
decision-log/
├── apps/
│   ├── web/
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── assets/
│   │   │   ├── App.tsx
│   │   │   ├── App.css
│   │   │   ├── index.css
│   │   │   ├── main.tsx
│   │   │   └── vite-env.d.ts
│   │   ├── eslint.config.js
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsconfig.app.json
│   │   ├── tsconfig.node.json
│   │   └── vite.config.ts
│   │
│   └── api/
│       ├── src/
│       │   ├── modules/
│       │   │   └── health/
│       │   │       └── health.route.ts
│       │   ├── app.ts
│       │   └── server.ts
│       ├── package.json
│       └── tsconfig.json
│
├── docs/
│   └── dev-setup.md
├── prototype/
├── .github/
├── .gitignore
├── CLAUDE.md
├── README.md
├── package.json
└── package-lock.json
```

현재 존재하지 않는 폴더를 미리 만들지 않는다.

다음 폴더는 실제 기능 개발 시점에 추가한다.

```text
apps/web/src/components/
apps/web/src/features/
apps/api/src/shared/config/
packages/shared/
prompts/
supabase/
```

---

## 4. npm Workspaces 구조

루트 `package.json`에서 Web과 API를 함께 관리한다.

```json
{
  "name": "decision-log",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "concurrently \"npm run dev:web\" \"npm run dev:api\"",
    "dev:web": "npm run dev --workspace=@decision-log/web",
    "dev:api": "npm run dev --workspace=@decision-log/api",
    "build": "npm run build --workspaces --if-present",
    "typecheck": "npm run typecheck --workspaces --if-present",
    "lint": "npm run lint --workspaces --if-present"
  },
  "overrides": {
    "typescript": "^6.0.0"
  }
}
```

Workspace 이름은 다음과 같다.

```text
apps/web/package.json
→ @decision-log/web

apps/api/package.json
→ @decision-log/api
```

패키지 설치는 프로젝트 루트에서 실행한다.

```bash
npm install
```

`package-lock.json`은 루트에 하나만 유지한다.

```text
decision-log/package-lock.json       O
apps/web/package-lock.json           X
apps/api/package-lock.json           X
```

---

## 5. 프론트엔드 TypeScript 설정

Web은 Vite 8 React TypeScript 구조를 따른다.

```text
apps/web/tsconfig.json
→ Project References 관리

apps/web/tsconfig.app.json
→ React 및 브라우저 코드 설정

apps/web/tsconfig.node.json
→ vite.config.ts의 Node 환경 설정
```

`apps/web/package.json`의 주요 스크립트:

```json
{
  "name": "@decision-log/web",
  "scripts": {
    "dev": "vite",
    "typecheck": "tsc -b",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  }
}
```

Web 개발 의존성에는 다음 패키지가 포함된다.

```text
typescript
typescript-eslint
@types/react
@types/react-dom
@types/node
```

TypeScript를 다시 설치할 경우 6.x 버전을 명시한다.

```bash
npm install -D \
  typescript@^6.0.0 \
  typescript-eslint \
  @types/react \
  @types/react-dom \
  @types/node \
  --workspace=@decision-log/web
```

### Astryx Design System 설치

```bash
npm install @astryxdesign/core @astryxdesign/theme-neutral --workspace=@decision-log/web
```

```bash
npm install -D @astryxdesign/cli --workspace=@decision-log/web
```

CLI 실행용 스크립트를 `apps/web/package.json`에 추가한다.

```json
"astryx": "node node_modules/@astryxdesign/cli/bin/astryx.mjs"
```

- 빌드 플러그인, PostCSS, Babel 설정은 필요하지 않다.
- 앱 진입점에 Astryx CSS import와 Theme Provider를 설정한다.
- 브랜드 색·간격은 `docs/DESIGN.md`의 토큰 값으로 테마 custom property를 오버라이드한다.
- 실제 설치 시 React 19와의 호환 버전을 Astryx 공식 문서에서 확인한다.

---

## 6. 백엔드 설정

`apps/api/package.json`의 주요 스크립트:

```json
{
  "name": "@decision-log/api",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/server.js",
    "typecheck": "tsc --noEmit -p tsconfig.json"
  }
}
```

백엔드 런타임 패키지:

```text
express
cors
dotenv
zod
@supabase/supabase-js   (SPEC-AUTH-003 — JWT 검증용, 토큰 검증 전용 Client)
@decision-log/shared    (공유 Zod 계약 — 에러 봉투 등)
```

백엔드 개발 패키지:

```text
typescript
tsx
@types/node
@types/express
@types/cors
```

새 환경에서 설치할 경우:

```bash
npm install express cors dotenv zod @supabase/supabase-js \
  --workspace=@decision-log/api
```

(`@decision-log/shared`는 Workspace 내부 패키지이므로 루트 `npm install`로 링크된다.)

```bash
npm install -D \
  typescript@^6.0.0 \
  tsx \
  @types/node \
  @types/express \
  @types/cors \
  --workspace=@decision-log/api
```

현재 API에는 별도의 ESLint 설정과 `lint` 스크립트가 없다.

따라서 루트 `npm run lint`는 현재 Web 코드만 검사한다.

API lint는 백엔드 코드가 본격적으로 늘어나기 전에 추가한다.

---

## 7. 실행 방법

### Web과 API 동시 실행

```bash
npm run dev
```

기본 주소:

```text
Web: http://localhost:5173
API: http://localhost:4000
```

### 프론트엔드만 실행

```bash
npm run dev:web
```

### 백엔드만 실행

```bash
npm run dev:api
```

### API Health Check

```bash
curl http://localhost:4000/api/health
```

정상 응답:

```json
{
  "ok": true,
  "service": "decision-log-api"
}
```

---

## 8. 검사 명령어

전체 타입 검사:

```bash
npm run typecheck
```

현재 Web 코드 Lint:

```bash
npm run lint
```

전체 배포 빌드:

```bash
npm run build
```

현재 검사 범위:

```text
Web
→ typecheck + lint + build

API
→ typecheck + build
```

---

## 9. 환경변수 관리

현재 Mock 단계에서는 실제 `.env` 파일 없이도 Web과 API가 실행된다.

서버는 기본 포트 `4000`을 사용한다.

실제 AI API 또는 Supabase 연결 전에 환경변수 파일을 만든다.

```text
apps/web/.env.local
apps/api/.env
```

예시 파일은 최종적으로 Git에 포함하는 것을 권장한다.

```text
apps/web/.env.example
apps/api/.env.example
```

프론트 예시:

```env
VITE_API_BASE_URL=http://localhost:4000

VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

백엔드 예시:

```env
PORT=4000
CLIENT_ORIGIN=http://localhost:5173

OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=

SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
```

규칙:

- 실제 `.env`와 `.env.local`은 Git에 올리지 않는다.
- `.env.example`에는 실제 비밀값을 작성하지 않는다.
- `VITE_` 환경변수는 브라우저에 노출된다고 가정한다.
- Supabase Publishable Key는 브라우저 공개가 허용된 키이며, 실제 데이터 보안은 RLS와 권한 정책으로 보장한다.
- AI API Key와 Supabase Secret Key, Service Role Key는 `apps/api`에서만 사용한다.
- Secret Key와 Service Role Key는 RLS를 우회하므로, AI 파이프라인의 시스템 쓰기(SourceAnswer·Agenda·FinalAnswer 저장)와 같이 명확히 제한된 기능에만 사용한다.
- Secret Key Client의 시스템 쓰기는 Service 계층에서 검증된 JWT의 userId로 소유권을 확인한 뒤에만 수행한다.
- 일반 사용자 요청은 사용자 JWT와 Publishable Key를 이용해 RLS가 적용되는 Client로 처리한다.
- 실제 AI 또는 DB 연결 전에 `apps/api/src/shared/config/env.ts`를 만들고 Zod 검증을 적용한다.

### Supabase Auth 연동 준비 (SPEC-AUTH-001)

**프론트(apps/web) 패키지 — T-012에서 설치 완료:**

```bash
npm install react-router @supabase/supabase-js --workspace=@decision-log/web
```

API용 `@supabase/supabase-js` 설치와 Express JWT 검증은 **SPEC-AUTH-003에서 완료**되었다.
서버는 `SUPABASE_URL`·`SUPABASE_PUBLISHABLE_KEY`(공개 키)만 사용해 토큰을 검증한다(`supabase.auth.getUser`).
Secret Key는 아직 쓰지 않으며 DB Spec에서 도입한다.

**API 서버 env (apps/api/.env — 커밋 금지, `.env.example`만 커밋):**

```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

프론트(`apps/web/.env.local`)와 같은 Supabase 프로젝트 값을 쓴다. 필수 값이 없으면 서버는
명확한 메시지로 기동에 실패한다(키 값은 메시지에 노출하지 않는다). `GET /api/auth/me`는
Auth Middleware 뒤에 있으며 유효한 `Authorization: Bearer` 토큰이 필요하다.

**Supabase 프로젝트 연결 절차 (T-012 UI 동작 실측 = AC3·4·5 확인 전제):**

1. Supabase 프로젝트 생성 후, Project Settings > API 에서 값을 확인한다.
2. `apps/web/.env.local`을 만들고 아래를 채운다 (커밋 금지 — `.env.example`만 커밋).

   ```env
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
   ```

   값이 비어 있으면 앱은 정상 실행되되(화면·클라이언트 검증은 동작) 실제 인증 동작은
   비활성화되고 콘솔에 경고를 남긴다.

**Supabase 대시보드 수동 설정 체크리스트 (실제 키 값은 이 문서에 넣지 않는다):**

- [ ] Authentication > Providers > **Email 활성화**
- [ ] Authentication > **Confirm email = ON (이메일 인증 필수)** — 이메일 인증 완료가 서비스 이용의 필수 조건이다
- [ ] Authentication > Password policy > **최소 길이 8** (클라이언트 검증과 일치)
- [ ] Authentication > URL Configuration > **Site URL** = `http://localhost:5173` (로컬 개발)
- [ ] Authentication > URL Configuration > **Redirect URLs**에 `http://localhost:5173/login` 등록
      (회원가입 `emailRedirectTo` / 인증 링크 도착지)
- [ ] 배포 시 배포 도메인의 Site URL·Redirect URL(`/login`)을 추가 등록
- [x] JWT 설정 확인 (Express JWT 검증 = SPEC-AUTH-003에서 `supabase.auth.getUser`로 사용)
- [x] 사용자 데이터 테이블 RLS 활성화 (SPEC-DB-001 마이그레이션에서 전 서비스 테이블 RLS + 정책)

### DB 마이그레이션·2-클라이언트·암호화 (SPEC-DB-001)

**추가 API 서버 env (apps/api/.env — 커밋 금지, `.env.example`만 커밋):**

```env
SUPABASE_SECRET_KEY=<secret/service_role-key>     # 시스템 쓰기 클라이언트(RLS 우회). 서버 시작 시 필수 검증
AI_KEY_ENCRYPTION_KEY=<base64 32바이트>            # BYOK 키 AES-256-GCM 마스터 키. `openssl rand -base64 32`
SUPABASE_DB_URL=postgresql://...                  # 마이그레이션 적용용. `supabase db push --db-url` 에만 사용(런타임 미사용)
```

- 서버 시작 시 `env.ts`가 `SUPABASE_SECRET_KEY`·`AI_KEY_ENCRYPTION_KEY`(base64 32바이트)를 검증한다. 없거나 형식이 어긋나면 명확한 메시지로 기동에 실패한다(키 값은 노출하지 않는다).
- **2-클라이언트**: 조회·사용자 쓰기는 사용자 JWT 클라이언트(`createUserClient`, RLS 적용) / 시스템 쓰기는 Secret Key 클라이언트(`getAdminClient`, RLS 우회 — DB-001은 구성까지만, 실사용은 AI Spec).
- **BYOK 키**: `user_provider_keys`에 AES-256-GCM 암호문(`encrypted_key`·`key_iv`·`key_auth_tag`)만 저장한다. 평문 키는 저장·프론트·로그·에러 어디에도 두지 않는다. 복호는 서버에서만.

**마이그레이션 적용 (Supabase CLI):**

```bash
brew install supabase/tap/supabase        # CLI 미설치 시 (macOS)
supabase db push --db-url "$SUPABASE_DB_URL" --yes   # apps/api/.env 의 값 사용
```

- SQL은 `supabase/migrations/*.sql`(커밋), `supabase/config.toml`(커밋). 실제 `.env`·비밀은 커밋 금지.
- 마이그레이션은 서비스 테이블 6종 + `user_provider_keys` + Enum 6종 + 제약(FK RESTRICT/CASCADE·UNIQUE·CHECK·미완료 Question Partial Unique)·Index·`moddatetime` 트리거·전 테이블 RLS 정책(EXISTS join 소유권)·원자적 생성 RPC를 만든다.
- 역할 GRANT: RLS만으로는 부족하며 `authenticated`·`service_role`에 테이블 DML GRANT가 필요하다(별도 grants 마이그레이션 포함).

**RLS·소유권 체크리스트:**

- [x] 전 서비스 테이블 RLS 활성화 + SELECT/INSERT(WITH CHECK)/UPDATE 정책
- [x] 소유권은 `auth.uid() → chats.user_id → 하위(EXISTS join)`. 하위 테이블에 user_id 중복 저장 안 함
- [x] `user_provider_keys`는 `user_id = auth.uid()` 직접 소유
- [x] Express는 검증 JWT의 userId만 사용, 클라이언트 전달 userId 무시
- [x] 2명 교차 차단 실측(본인 것만 조회, 타인 0건 — chats·questions·user_provider_keys 양방향)

### AI Provider 실호출 (SPEC-AI-001)

**추가 API 서버 env (apps/api/.env — 커밋 금지):**

```env
# 앱 기본 AI 키 (7.4). 아래 플래그가 ON이면 서버 시작 시 3개 모두 필수.
ANTHROPIC_API_KEY=<anthropic-api-key>
OPENAI_API_KEY=<openai-api-key>
GEMINI_API_KEY=<gemini-api-key>

# 사용자 키가 없을 때 앱 기본 키를 쓸지 (7.2). "true" | "false", 미지정 시 true
APP_DEFAULT_AI_KEYS_ENABLED=true

# 활성 구현·버전 선택 (2.3). 아래 3개는 모두 선택값이며 기본값이 있다.
ANSWER_PROMPT_VERSION=v1                 # /prompts/answer/<provider>/<버전>.md 를 고른다
ANSWER_NORMALIZER_VERSION=v1             # 활성 정규화기 버전(초기엔 v1 하나)
ANSWER_PROMPTS_DIR=/abs/path/to/prompts  # 기본값 = 저장소 루트 /prompts (dev·dist 모두 해석)

# Provider별 모델 (선택). 기본값은 각 provider 최소(최저가) 티어
CLAUDE_MODEL=claude-haiku-4-5
OPENAI_MODEL=gpt-5-nano
GEMINI_MODEL=gemini-3.5-flash-lite
```

> 위 값은 **형식 예시**다. 실제 키는 각 provider 콘솔에서 발급해 로컬 `.env`에만 두고 커밋하지 않는다.

- **BYOK 해석 순서(7.1)**: `user_provider_keys`의 사용자 키 → 없으면 앱 기본 키(플래그 ON) → 둘 다 없으면 "사용 가능한 키 없음".
- **사전 점검(7.3)**: 생성 시작 요청 초입에서 3사 키를 확인하고, 하나라도 없으면 **아무것도 저장하지 않고** `400 NO_AVAILABLE_KEYS`(없는 provider를 안내)로 거절한다.
- **플래그 OFF로 두면** 앱 기본 키를 쓰지 않으므로 3개 키 env는 필수가 아니다(사용자 키가 있는 provider만 동작).
- **프롬프트는 코드가 아니라 텍스트**다. `/prompts/answer/{claude,openai,gemini}/v1.md`를 런타임에 읽으므로 문구만 고치면 **재빌드 없이** 반영된다(서버 재기동은 필요 — 프로세스 내 캐시).
- 사용한 프롬프트 버전·모델은 `source_answers.prompt_version`·`model`에 스탬프되어 재현성을 남긴다.
- Provider 호출 타임아웃은 45초 고정(Spec 3-①)이므로, 큰 모델로 override 하면 타임아웃이 늘어날 수 있다.

**엔드포인트 (SPEC-AI-001 4장):**

```bash
# 생성 시작 — 응답 자체가 SSE 스트림(EventSource 대신 fetch ReadableStream으로 소비)
curl -N -X POST "$API/api/chats/<chatId>/questions/<questionId>/source-answers" \
  -H "Authorization: Bearer <access-token>" -H "Content-Type: application/json" \
  -d '{"context": null}'

# 새로고침 복원 스냅샷
curl "$API/api/chats/<chatId>/questions/<questionId>/source-answers" \
  -H "Authorization: Bearer <access-token>"
```

- SSE 이벤트는 `{"type":"source_answer.updated", provider, status, errorCode}`와 종료 `{"type":"done", sourceAnswers}` 두 가지다(`packages/shared`의 `SourceAnswerEventSchema`).
- 사전 점검 실패·소유권 실패는 **스트림을 열기 전에** 일반 에러 봉투로 응답한다.

---

## 10. Git 제외 대상

`.gitignore`에는 최소한 다음 내용이 포함되어야 한다.

```gitignore
node_modules/
dist/

.env
.env.*
!.env.example

.DS_Store
```

다음 파일과 폴더는 Git에 올리지 않는다.

```text
node_modules/
dist/
apps/api/.env
apps/web/.env.local
```

---

## 11. 기능 개발 시 추가할 구조

프론트엔드는 기능 중심으로 확장한다.

```text
apps/web/src/
├── components/
│   ├── ui/
│   └── layout/
│
└── features/
    ├── auth/
    ├── question/
    ├── ai-answers/
    ├── comparison/
    ├── decision-log/
    └── export/
```

구분 기준:

```text
기능을 몰라도 사용할 수 있는 공통 UI
→ components/ui

화면 전체 배치
→ components/layout

특정 기능의 컴포넌트·Hook·Service
→ features/기능명
```

프론트와 백엔드가 같은 데이터 구조를 사용하기 시작하면 다음을 추가한다.

```text
packages/shared/
└── Zod 스키마와 z.infer 타입
```

실제 AI 연결 시:

```text
prompts/
```

Supabase 연결 시:

```text
supabase/
└── migrations/
```

---

## 12. 개발 규칙

- 기능 코드는 기능별 폴더에 둔다.
- 순수 공통 UI만 `components/ui`에 둔다.
- 컴포넌트에서 직접 `fetch`하지 않는다.
- 컴포넌트에서 직접 `localStorage`를 호출하지 않는다.
- 외부 데이터는 Zod 검증 후 사용한다.
- `any`는 원칙적으로 사용하지 않는다.
- 새로운 패키지는 필요한 시점에만 추가한다.
- 실제 재사용이 확인되기 전에 공통 모듈로 옮기지 않는다.
- 구조 변경이나 패키지 추가 전 이유와 영향을 확인한다.
- 실제 `.env`, `node_modules`, `dist`는 Git에 올리지 않는다.

---

## 13. 초기 환경 설정 완료 기준

다음 조건을 만족하면 초기 개발 환경 설정이 완료된 것이다.

- React 프로젝트가 `apps/web`에서 실행된다.
- Web이 TypeScript 기반으로 구성되어 있다.
- Web의 `typecheck`, `lint`, `build`가 통과한다.
- Express 서버가 `apps/api`에서 실행된다.
- API의 `typecheck`, `build`가 통과한다.
- `/api/health`가 정상 응답한다.
- 루트 `npm run dev`로 Web과 API가 함께 실행된다.
- Web과 API가 TypeScript 6.x를 사용한다.
- 루트 `package-lock.json` 하나로 패키지를 관리한다.
- 실제 `.env` 파일이 Git에서 제외되어 있다.
- `node_modules`와 `dist`가 Git에서 제외되어 있다.

현재 API lint는 별도 설정 전까지 완료 기준에서 제외한다.

---

## 14. 현재 상태

현재까지 아래 항목이 완료되었다.

```text
✅ npm Workspaces 설정
✅ React + Vite 실행
✅ React JavaScript → TypeScript 전환
✅ Vite TypeScript 3파일 설정
✅ Web TypeScript typecheck
✅ Web ESLint
✅ Web production build
✅ Express + TypeScript 실행
✅ API typecheck
✅ API production build
✅ GET /api/health
✅ Web + API 동시 실행
✅ TypeScript 6.0.3 통일
```

다음 항목은 환경 설정이 아니라 실제 기능 개발 단계에서 진행한다.

```text
- 질문 입력 기능
- Mock AI 답변
- Manager 비교 카드
- storageAdapter
- localStorage 저장
- 공통 Zod 계약
- Claude/OpenAI API
- Supabase
- Markdown 및 Zip Export
```