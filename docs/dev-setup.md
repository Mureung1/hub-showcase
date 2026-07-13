# Decision Log 개발 환경 설정

## 1. 목적

Decision Log의 개발 환경, 실행 방법, 최소 디렉토리 구조를 정리한다.

처음부터 모든 폴더와 기능을 만들지 않는다.

```text
최소 구조 생성
→ Web 실행 확인
→ API 실행 확인
→ 기능 개발 시 관련 폴더 추가
```

---

## 2. 기술 스택

| 영역 | 기술 |
|---|---|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Language | TypeScript |
| Validation | Zod |
| Styling | 일반 CSS |
| 초기 저장 | localStorage |
| DB | Supabase PostgreSQL |
| 패키지 관리 | npm Workspaces |
| 동시 실행 | concurrently |
| Backend 실행 | tsx |
| 환경변수 | dotenv + Zod |

### 핵심 기술 규칙

- Zod 스키마를 먼저 작성하고 `z.infer`로 TypeScript 타입을 만든다.
- 외부 요청, AI 응답, DB 응답은 Zod로 검증한다.
- `storageAdapter`는 처음부터 `Promise` 기반으로 작성한다.
- React에서 Supabase를 직접 호출하지 않는다.
- 데이터 저장은 `React → Express → Supabase` 흐름을 따른다.
- AI API Key와 Supabase Secret Key는 백엔드에서만 관리한다.

---

## 3. 최소 디렉토리 구조

```text
decision-log/
├── apps/
│   ├── web/
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── styles/
│   │   │   ├── main.tsx
│   │   │   └── vite-env.d.ts
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vite.config.ts
│   │
│   └── api/
│       ├── src/
│       │   ├── modules/
│       │   │   └── health/
│       │   ├── shared/
│       │   │   └── config/
│       │   ├── app.ts
│       │   └── server.ts
│       ├── .env.example
│       ├── package.json
│       └── tsconfig.json
│
├── docs/
│   ├── dev-setup.md
│   └── status.md
│
├── prototype/
├── .github/
├── .gitignore
├── CLAUDE.md
├── README.md
├── package.json
├── package-lock.json
└── tsconfig.base.json
```

기능 폴더는 실제 개발 시점에 추가한다.

```text
components/ui
components/layout
features/question
features/ai-answers
features/comparison
features/decision-log
packages/shared
prompts
supabase
```

---

## 4. 저장소 구조 변경 순서

현재 루트에 있는 React 프로젝트를 다음 순서로 정리한다.

```text
1. 기존 React 파일을 apps/web으로 이동
2. Web 단독 실행 확인
3. 루트 npm Workspaces 설정
4. React TypeScript 전환
5. apps/api Express TypeScript 설정
6. Web과 API 동시 실행 확인
```

폴더 이동, TypeScript 전환, Express 설정은 한 번에 진행하지 않는다.

---

## 5. 루트 package.json

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
  }
}
```

루트에서 설치한다.

```bash
npm install
npm install -D concurrently
```

`package-lock.json`은 루트에 하나만 유지한다.

---

## 6. 프론트엔드 실행

`apps/web/package.json`의 이름은 다음과 같이 설정한다.

```json
{
  "name": "@decision-log/web"
}
```

실행:

```bash
npm run dev:web
```

기본 주소:

```text
http://localhost:5173
```

프론트 환경변수:

```env
VITE_API_BASE_URL=http://localhost:4000
```

`VITE_` 환경변수에는 비밀키를 넣지 않는다.

---

## 7. 백엔드 설치 및 실행

필수 패키지 설치:

```bash
npm install express cors dotenv zod --workspace=@decision-log/api
npm install -D typescript tsx @types/node @types/express @types/cors --workspace=@decision-log/api
```

`apps/api/package.json`:

```json
{
  "name": "@decision-log/api",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/server.js",
    "typecheck": "tsc --noEmit"
  }
}
```

실행:

```bash
npm run dev:api
```

기본 주소:

```text
http://localhost:4000
```

Health Check:

```text
GET /api/health
```

---

## 8. 환경변수

`apps/api/.env.example`:

```env
PORT=4000
CLIENT_ORIGIN=http://localhost:5173

OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=

SUPABASE_URL=
SUPABASE_SECRET_KEY=
```

규칙:

- 실제 값은 `.env`에 작성한다.
- `.env`는 Git에 올리지 않는다.
- `.env.example`은 Git에 올린다.
- AI API Key는 `apps/api`에만 둔다.
- Supabase Secret Key는 `apps/api`에만 둔다.
- Mock 단계에서는 AI와 Supabase 키 없이도 서버가 실행되어야 한다.

---

## 9. 실행 명령어

전체 실행:

```bash
npm run dev
```

프론트엔드만 실행:

```bash
npm run dev:web
```

백엔드만 실행:

```bash
npm run dev:api
```

검사:

```bash
npm run typecheck
npm run lint
npm run build
```

---

## 10. 개발 규칙

- 기능 코드는 기능별 폴더에 둔다.
- 공통 UI만 `components/ui`에 둔다.
- 컴포넌트에서 직접 `fetch`하지 않는다.
- 컴포넌트에서 직접 `localStorage`를 호출하지 않는다.
- 외부 데이터는 Zod 검증 후 사용한다.
- `any` 사용은 원칙적으로 금지한다.
- 새로운 패키지는 필요한 시점에만 추가한다.
- 실제 `.env`, `node_modules`, `dist`는 Git에 올리지 않는다.
- 구조 변경과 패키지 추가는 먼저 이유를 확인한다.

---

## 11. 완료 기준

다음 조건을 만족하면 개발 환경 설정이 완료된 것이다.

- React 프로젝트가 `apps/web`에서 실행된다.
- Express 서버가 `apps/api`에서 실행된다.
- `/api/health`가 정상 응답한다.
- 루트 `npm run dev`로 Web과 API가 함께 실행된다.
- 루트 `package-lock.json` 하나로 관리된다.
- `npm run typecheck`가 통과한다.
- `npm run build`가 통과한다.
- 실제 `.env` 파일이 Git에서 제외되어 있다.