# 설정 및 환경 변수

마지막 업데이트: 2026-07-27

## 이 문서의 목적

빌드, 테스트, DB, 외부 provider 설정의 출처와 비밀 값 경계를 정리한다.

## 빠른 요약

환경 변수의 예시는 `.env.example`, DB migration 설정은 `drizzle.config.ts`, 프론트엔드/테스트 설정은 `vite.config.ts`에 있다. 클라이언트 코드에는 `import.meta.env` 사용이 발견되지 않았다.

## 설정 체계

|설정|파일/키|적용 지점|
|---|---|---|
|Node 런타임|`.nvmrc`, `package.json#engines`|로컬/CI|
|Vite/React/Vitest|`vite.config.ts`|브라우저 build, jsdom test|
|TypeScript API|`tsconfig.api.json`|`api/`, `scripts/`, Drizzle config|
|DB migration|`drizzle.config.ts`, `DATABASE_URL`|Drizzle Kit|
|Gemini|`GEMINI_API_KEY`, `GEMINI_MODEL`|`createEnvironmentGenerationProvider`|
|Neon|`DATABASE_URL`|generation/interaction metric sink|
|Voyage retrieval|`VOYAGE_API_KEY`, `VOYAGE_EMBEDDING_MODEL`|retrieval scripts/provider|

## 환경별 차이

|환경|코드로 확인된 차이|
|---|---|
|로컬|`.env.local`을 `drizzle.config.ts`가 로드한다. `*.local`과 `.env*`는 ignore되며 `.env.example`만 예외다.|
|함수 런타임|`process.env`가 `api/generate.ts`, `api/interaction.ts`에 주입된다.|
|DB 없는 환경|두 DB sink는 no-op이 된다.|
|Gemini 키 없는 환경|unconfigured provider로 generation이 실패한다.|

## 근거

- 변수 예시: `.env.example`
- ignore: `.gitignore`
- config loader: `drizzle.config.ts`
- runtime environment consumers: `api/generate.ts`, `api/interaction.ts`, `api/_lib/generation/geminiProvider.ts`

## 주의사항/함정

`DATABASE_URL`이 존재해도 URL이 PostgreSQL이 아니면 `createDatabase`가 오류를 던진다. metric sink는 해당 오류를 잡아 no-op으로 전환하므로, 기록 누락이 사용자 요청을 실패시키지는 않는다.

## TODO/확인 필요

- Vercel의 Development/Preview/Production별 환경변수 값과 secret rotation 주기는 확인 필요.
