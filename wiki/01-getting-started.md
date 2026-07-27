# 시작하기

마지막 업데이트: 2026-07-27

## 이 문서의 목적

로컬에서 클라이언트, 테스트, API 타입 검사, 선택적 DB 도구를 실행한다.

## 빠른 요약

Node `22.12.0`과 npm을 사용한다. 기본 화면은 DB나 Gemini 키 없이 실행되지만, AI API는 키가 없으면 서버에서 실패 응답을 반환하고 UI가 템플릿 fallback을 사용한다.

## 로컬 실행

```bash
nvm use
npm ci
cp .env.example .env.local
npm run dev
```

Vite가 표시하는 로컬 URL을 연다. 빌드/검증은 다음 순서로 실행한다.

```bash
npm run lint
npm run typecheck:api
npm run build
npm test
```

추가 명령은 `package.json`에 정의되어 있다.

```bash
npm run templates:check
npm run db:check
npm run retrieval:eval
```

## 환경 변수

|키|용도|필수 조건|예시|
|---|---|---|---|
|`DATABASE_URL`|Neon PostgreSQL 연결 및 비동기 메트릭 sink|DB 기록/Drizzle migration|`postgresql://...`|
|`DB_SMOKE_CONFIRM`|개발 DB smoke 쓰기 보호|`db:smoke*` 실행 시|`t30-development-write`|
|`GEMINI_API_KEY`|Gemini 생성 provider 인증|실제 `/api/generate` 호출|비밀 값|
|`GEMINI_MODEL`|Gemini 모델명|키가 있을 때 선택|`gemini-3.1-flash-lite`|
|`VOYAGE_API_KEY`|retrieval embedding provider 인증|ingest/smoke 시|비밀 값|
|`VOYAGE_EMBEDDING_MODEL`|embedding 모델명|ingest/smoke 시|`voyage-4-lite`|
|`RETRIEVAL_INGEST_CONFIRM`|개발 DB ingestion 쓰기 보호|ingest/smoke 시|`t35-development-write`|

## 흔한 문제 해결

|증상|확인/조치|
|---|---|
|`npm ci`가 Node 버전을 거부|`.nvmrc`의 `22.12.0`을 사용하고 `package.json` engines를 확인한다.|
|`/api/generate`가 500|`GEMINI_API_KEY`가 없으면 `createUnconfiguredGenerationProvider()`가 실패한다. `.env.local`과 함수 실행 환경을 확인한다.|
|DB 명령이 연결되지 않음|`drizzle.config.ts`는 `.env.local`의 `DATABASE_URL`만 읽는다. PostgreSQL URL인지도 확인한다.|
|템플릿 검증 실패|생성 파일을 직접 수정하지 말고 `npm run templates:generate` 후 `npm run templates:check`를 실행한다.|

## 근거

- Node 버전: `.nvmrc`; 지원 범위/스크립트: `package.json`
- 변수 정의 및 용도: `.env.example`
- DB 설정: `drizzle.config.ts`, `api/_lib/db/database.ts`
- unconfigured provider: `api/_lib/generation/geminiProvider.ts`

## 주의사항/함정

`.env.local`은 `*.local` ignore 규칙으로 Git에 포함되지 않는다. `db:smoke`와 retrieval 쓰기 명령은 확인 문자열 없이 실행하지 않는다.

## TODO/확인 필요

- Vercel 로컬 개발에서 `api/` 함수를 함께 실행하는 공식 명령은 `package.json`에 없다. Vercel CLI 사용 절차는 확인 필요.
