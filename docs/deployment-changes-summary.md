# 배포 변경사항 요약 (최종)

**작성 일시:** 2026-07-28  
**기준 커밋:** c1e8cc01c31f5269dfc4e47595f37ec88fc82963  
**최종 커밋:** ee4e194f (ESM import 수정 완료 + 배포 문서)

---

## 1. Backend 설정 변경

### 1.1 `backend/tsconfig.json` - TypeScript ESM 호환성

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM"],
    "types": ["node"],
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": false,
    "noImplicitAny": false,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": false,
    "declarationMap": false,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": ".."
  },
  "include": [
    "src/**/*",
    "../shared/src/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "**/*.test.ts"
  ]
}
```

**변경 이유:**
- Node.js 최신 ESM 방식 사용
- `rootDir: ".."` — shared 패키지를 함께 컴파일하기 위한 필수 설정
- 모노레포 구조 지원 (backend + shared가 한 번에 빌드됨)
- Render 빌드 환경에서 타입 오류 최소화

**중요:** `rootDir: ".."` 때문에 빌드 결과는 `dist/backend/src/index.js`가 됨

---

### 1.2 `backend/package.json` - 의존성 및 스크립트

**Prisma 버전 고정:**
```json
"prisma": "5.22.0",
"@prisma/client": "5.22.0"
```

**추가 의존성:**
```json
"@types/node": "^22.0.0",
"@types/web-push": "^3.6.3"
```

**Start Script:**
```json
"start": "node dist/backend/src/index.js"
```

**변경 이유:**
- 빌드 결과가 `dist/backend/src/index.js`로 생성되므로 경로 맞춤
- Render의 Start Command도 동일 경로 사용

---

## 2. Render 최종 설정

### 2.1 Build Command (Render Dashboard)

```bash
rm -rf node_modules && npm install --legacy-peer-deps && npm run db:generate && npm run build
```

**순서와 의미:**

| 단계 | 명령어 | 목적 |
|------|-------|------|
| 1 | `rm -rf node_modules` | 캐시된 node_modules 완전 제거 |
| 2 | `npm install --legacy-peer-deps` | 의존성 재설치 (Prisma 5.22.0 보장) |
| 3 | `npm run db:generate` | Prisma Client 생성 (**build 전에 필수**) |
| 4 | `npm run build` | TypeScript 컴파일 (tsc 실행) |

**중요:**
- `npm run db:generate`를 `npm run build` **전에** 실행
- 그래야 tsc가 Prisma 타입을 찾을 수 있음
- `npx prisma generate`를 직접 사용하면 최신 Prisma를 다운로드할 위험

### 2.1.1 Prisma 마이그레이션 (스키마 변경 시)

**DB 테이블/컬럼 변경이 있을 때:**

```bash
rm -rf node_modules && npm install --legacy-peer-deps && npm run db:generate && npx prisma migrate deploy && npm run build
```

또는 Start Command에 마이그레이션 통합:

```bash
npx prisma migrate deploy && node dist/backend/src/index.js
```

**선택 가이드:**

| 상황 | 권장 방법 | 이유 |
|------|---------|------|
| 새 테이블/컬럼 추가 | Build에 추가 | 배포 중 DB 스키마 먼저 변경 |
| 단순 타입 생성만 필요 | `npm run db:generate`만 | 마이그레이션 불필요 |
| 프로덕션 DB 즉시 동기화 | Start에 추가 | 배포 직후 자동 실행 |

**주의사항:**
- `npx prisma migrate deploy`는 프로덕션(Supabase)에만 실행
- 로컬 개발 중에는 `npm run db:migrate` (dev) 사용
- 마이그레이션 파일(`prisma/migrations/`)이 git에 커밋되어야 함

---

### 2.2 Start Command (Render Dashboard)

**기본:**
```bash
node dist/backend/src/index.js
```

**DB 마이그레이션 자동 실행 포함:**
```bash
npx prisma migrate deploy && node dist/backend/src/index.js
```

**주의:** `dist/index.js`가 아니라 `dist/backend/src/index.js`

---

## 2.3 render.yaml과 Render 대시보드 동기화

### 코드베이스에 포함된 render.yaml

**`backend/render.yaml`:**
```yaml
services:
  - type: web
    name: naver-challenge-backend
    runtime: node
    buildCommand: rm -rf node_modules && npm install --legacy-peer-deps && npm run db:generate && npm run build
    startCommand: node dist/backend/src/index.js
```

### ⚠️ 동기화 규칙 (필수)

**Infrastructure as Code (IaC) 관점:**
- Render 대시보드(GUI)에서 변경한 Build/Start Command
- **반드시 `backend/render.yaml`에도 동일하게 반영해야 함**

**이유:**
1. **대시보드 설정 (즉시 적용)** — 현재 배포에 반영
2. **render.yaml (Blueprint 참고)** — 향후 재배포 시 참고
3. 둘이 다르면 나중에 배포할 때 혼란 발생

### 동기화 체크리스트

```
Render 대시보드에서 수정 후:

1. 변경한 명령어 복사
   ├─ Build Command: rm -rf node_modules && ...
   └─ Start Command: node dist/...

2. backend/render.yaml 열기
   ├─ buildCommand 필드 업데이트
   └─ startCommand 필드 업데이트

3. git에 커밋
   └─ git commit -m "chore: sync render.yaml with dashboard settings"
```

### 예시: DB 마이그레이션 추가 시

**Step 1: Render 대시보드 수정**
```
Build Command:
rm -rf node_modules && npm install --legacy-peer-deps && npm run db:generate && npx prisma migrate deploy && npm run build

Start Command:
node dist/backend/src/index.js
```

**Step 2: render.yaml도 수정**
```yaml
buildCommand: rm -rf node_modules && npm install --legacy-peer-deps && npm run db:generate && npx prisma migrate deploy && npm run build
startCommand: node dist/backend/src/index.js
```

**Step 3: 커밋**
```bash
git add backend/render.yaml
git commit -m "chore: add prisma migrate deploy to build command"
git push origin main
```

---

## 3. ESM Import 수정

### 3.1 변경 패턴

Node.js ESM은 상대 경로 import에 **반드시 확장자**를 요구합니다.

```typescript
// ❌ 기존 (실패)
import { verifyAuth } from "../middleware/auth"
import { CalendarService } from "../services/calendarService"

// ✅ 수정 (성공)
import { verifyAuth } from "../middleware/auth.js"
import { CalendarService } from "../services/calendarService.js"
```

### 3.2 수정된 파일 (전체)

```
backend/src/
├── routes/
│   ├── calendar.ts      ✅ 수정
│   ├── github.ts        ✅ 수정
│   └── postings.ts      ✅ 수정
├── services/
│   ├── githubService.ts                    ✅ 수정
│   ├── matchingService.test.ts             ✅ 수정
│   └── providers/
│       └── googleCalendarProvider.ts       ✅ 수정
└── index.ts             (이미 정상)
```

---

## 4. Prisma 관련 변경 및 실제 문제

### 4.1 문제: Prisma 7.9.1 자동 설치

**증상:**
```
Error: The datasource property `url` is no longer supported in schema files.
```

**원인:**
1. Render 환경: `NODE_ENV=production`
2. Production에서 npm install은 devDependencies를 설치하지 않음
3. `npx prisma generate` 실행 시 로컬 Prisma가 없으면 최신 버전 자동 다운로드
4. Prisma 7.x는 schema 문법이 변경됨 (`url` 속성 deprecated)

**해결:**
- `package.json`에 `prisma: "5.22.0"` 명시적 고정
- package-lock.json 재생성 (Prisma 5.22.0만 명시)
- Build Command에서 `npm run db:generate` 사용 (npx 대신)

---

### 4.2 문제: dist 경로 불일치

**증상:**
```
Cannot find dist/index.js
```

**원인:**
- `tsconfig.json`의 `rootDir: ".."`
- `outDir: "./dist"`
- 결과: `dist/backend/src/index.js`가 생성됨

**해결:**
- Start Command를 `node dist/backend/src/index.js`로 수정
- 이 구조는 정상이며 모노레포 설계 의도

---

### 4.3 문제: ESM Import 오류

**증상:**
```
Cannot find module "../middleware/auth"
```

**원인:**
- Node.js ESM은 CommonJS와 달리 확장자를 필수로 요구
- 컴파일 후에도 import 문이 그대로 유지됨 (TypeScript의 --module ESNext)

**해결:**
- 모든 상대 경로 import에 `.js` 확장자 추가

---

### 4.4 문제: Build Command 오류 (입력 실수)

**증상:**
```
TS6231: Could not resolve...
```

**원인:**
```bash
# ❌ 잘못된 형식 (백슬래시)
rm -rf node_modules \
&& npm install ...
```

**해결:**
```bash
# ✅ 정상
rm -rf node_modules && npm install ...
```

Render의 Build Command 필드는 한 줄로 이어서 작성해야 함

---

## 5. Build 결과 구조

Render Build가 완료되면 다음과 같은 구조가 생성됩니다:

```
dist/
├── backend/
│   └── src/
│       ├── index.js                    (메인 진입점)
│       ├── routes/
│       │   ├── calendar.js
│       │   ├── github.js
│       │   └── ...
│       ├── services/
│       │   ├── githubService.js
│       │   └── ...
│       └── middleware/
│           └── auth.js
└── shared/
    └── src/
        ├── schemas/
        └── constants/
```

이 구조는 `tsconfig.json`의 `rootDir: ".."` 설정 때문에 정상이며, 필요한 모든 파일(backend + shared)을 포함합니다.

---

## 6. Frontend 변경

### 6.1 `frontend/tsconfig.json`
- `strict: true` 유지 (엄격한 타입 체크)
- `skipLibCheck: true` 유지 (lib 타입 오류 무시)

### 6.2 `frontend/package.json`
- `build: "vite build"` (TypeScript 컴파일 제외, Vite에 위임)

### 6.3 관련 페이지 수정

| 파일 | 변경 사항 |
|------|---------|
| `GithubReposPage.tsx` | 동적 API URL 설정, UI 개선 |
| `Dashboard.tsx` | GitHub 저장소 링크 통합 |
| `ScrapListPage.tsx` | 레이아웃 일관성 개선 |
| `githubApi.ts` | Render 배포 URL 자동 감지 |

---

## 7. 환경 변수 (필수)

Render 대시보드에서 반드시 설정해야 할 환경 변수:

```
DATABASE_URL          (Supabase 연결 문자열)
JWT_SECRET            (JWT 서명 키)
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI   (예: https://backend.render.com/api/calendar/oauth-callback)
GOOGLE_REFRESH_TOKEN
VAPID_PUBLIC_KEY      (Push 알림)
VAPID_PRIVATE_KEY     (Push 알림)
```

**선택사항:**
```
PORT                  (기본값: 3000)
NODE_ENV              (기본값: production)
LLM_PROVIDER          (기본값: claude)
CLAUDE_API_KEY        (LLM 사용 시)
```

---

## 8. 최종 배포 흐름

```
┌─────────────────────────────────────┐
│   Render "Manual Deploy" 클릭        │
└────────────┬────────────────────────┘
             ↓
┌─────────────────────────────────────┐
│        Build Phase (1~2분)           │
├─────────────────────────────────────┤
│ 1. rm -rf node_modules              │
│ 2. npm install --legacy-peer-deps   │
│ 3. npm run db:generate              │ ← Prisma Client 생성
│ 4. npm run build                    │ ← TypeScript 컴파일
│ 5. dist/backend/src/index.js 생성   │
└────────────┬────────────────────────┘
             ↓
┌─────────────────────────────────────┐
│  Build Cache 업로드 (자동)            │
└────────────┬────────────────────────┘
             ↓
┌─────────────────────────────────────┐
│        Start Phase                  │
├─────────────────────────────────────┤
│ node dist/backend/src/index.js      │
└────────────┬────────────────────────┘
             ↓
┌─────────────────────────────────────┐
│    Server Listening (PORT 3000)     │
│  ✅ 배포 완료                        │
└─────────────────────────────────────┘
```

---

## 9. 배포 체크리스트

### Before Deploy (배포 전)

**코드 검증:**
```
☑ Prisma 버전이 5.22.0으로 고정되어 있는가?
☑ package-lock.json이 최신 상태인가?
☑ 모든 상대 import에 .js 확장자가 있는가?
☑ tsconfig.json이 ESNext + bundler로 설정되어 있는가?
☑ rootDir: ".."로 설정되어 있는가?
```

**DB 마이그레이션 (스키마 변경 시):**
```
☑ prisma/schema.prisma 변경사항 확인?
☑ npx prisma migrate dev로 로컬에서 테스트?
☑ prisma/migrations/ 폴더에 마이그레이션 파일 생성됨?
☑ 마이그레이션 파일들이 git에 커밋됨?
```

**Render 대시보드 설정:**
```
☑ Build Command가 정확히 명시되어 있는가?
☑ Start Command가 정확히 명시되어 있는가?
☑ backend/render.yaml과 대시보드 설정이 동기화?
☑ 환경 변수가 모두 설정되어 있는가?
  └─ DATABASE_URL, JWT_SECRET, GOOGLE_*, VAPID_* 등
```

### After Deploy (배포 후)

**빌드 검증:**
```
☑ Render Build 로그에서 "Build successful 🎉" 표시?
☑ "npm run db:generate" 성공?
☑ (마이그레이션 포함 시) "prisma migrate deploy" 성공?
☑ "npm run build" 완료?
☑ "dist/backend/src/index.js" 파일 생성 확인?
```

**배포 검증:**
```
☑ Start 로그에서 "🚀 서버 시작" 메시지?
☑ /health 엔드포인트 정상 응답 (HTTP 200)?
☑ 데이터베이스 연결 정상?
☑ (마이그레이션 포함 시) DB 스키마 변경 반영됨?
```

**기능 검증:**
```
☑ Frontend에서 회원가입 가능?
☑ 로그인 후 공고 목록 조회?
☑ API 호출에서 에러 없음?
☑ 데이터베이스 쿼리 정상 실행?
```

---

## 10. 주요 학습 사항

이 배포 과정에서 얻은 중요한 교훈:

1. **ESM의 엄격성**: 상대 경로 import에 확장자가 필수
   - CommonJS의 유연성을 포기하고 표준 준수

2. **Render 환경의 특이성**: NODE_ENV=production에서 devDeps 미설치
   - package.json에 버전 명시 필수
   - npx의 자동 다운로드 주의

3. **모노레포 설정**: rootDir 설정의 중요성
   - backend와 shared 동시 컴파일 가능
   - 하지만 dist 경로가 변경됨을 인식해야 함

4. **Build 순서**: Prisma 작업의 순차 실행 중요성
   - `npm run db:generate` → `npm run build` (타입 생성 후 빌드)
   - `npx prisma migrate deploy` → `npm run build` (스키마 변경 후 코드 빌드)
   - 순서 역전 시 타입 미스매치 또는 마이그레이션 누락

5. **캐시 관리**: 의존성 변경 시 node_modules 명시적 제거
   - Render의 캐시는 편리하지만 때로 문제의 원인

6. **Infrastructure as Code**: 코드베이스와 대시보드 동기화
   - render.yaml과 Render 대시보드 GUI 설정 일치 필수
   - Blueprint 배포 시 render.yaml을 참고하므로 중요
   - 소규모 변경이라도 yaml에 반영할 것

7. **마이그레이션 전략**: 프로덕션 DB 변경 자동화
   - `prisma migrate deploy`를 빌드/시작 단계에 통합
   - DB 스키마 변경이 자동으로 프로덕션 DB에 반영
   - 수동 실행보다 자동화가 휴먼 에러 방지

---

## 11. 다음 배포를 위한 참고사항

### 정기 배포 프로세스

```
1. 기능 개발 완료 (로컬)
   ├─ npm run dev로 테스트
   └─ git commit & push

2. DB 스키마 변경이 있으면
   ├─ npx prisma migrate dev (로컬 생성)
   ├─ prisma/migrations/ 커밋
   └─ Render Build Command에 "npx prisma migrate deploy" 추가

3. Render 대시보드 설정 변경
   ├─ Build/Start Command 수정
   └─ backend/render.yaml도 동시에 수정 후 커밋

4. Render Manual Deploy 클릭
   ├─ Build 로그 확인
   ├─ Start 로그 확인
   └─ 기능 테스트

5. 문제 발생 시
   └─ "실제 Render 배포 중 발생했던 문제" 섹션 참고
```

### 체크리스트 (Quick Reference)

```
매 배포마다 확인:
□ prisma/migrations/이 최신인가? (스키마 변경 시)
□ backend/render.yaml과 대시보드 명령어 동기화?
□ 환경 변수 설정 완료?
□ Render Build "Build successful" 로그?
□ Frontend에서 회원가입/로그인 테스트?
```

### 문서 버전 히스토리

| 버전 | 날짜 | 주요 변경 |
|------|------|---------|
| 1.0 | 2026-07-28 | 초판 작성 |
| 2.0 | 2026-07-28 | Prisma 마이그레이션, render.yaml 동기화 추가 |

---

**문서 최종 수정:** 2026-07-28  
**버전:** 2.0 (실제 배포 경험 + IaC 전략 반영)
