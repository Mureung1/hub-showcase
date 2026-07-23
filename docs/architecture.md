# 아키텍처

전체 시스템 구성과 프론트엔드·백엔드 책임, 외부 연동, 배포 구조를 다룬다. 코드를 FSD 레이어/세그먼트로
어떻게 조직하는지는 [development-guide.md](./development-guide.md)를 참고한다.

## 1. 시스템 구성 개요

저장소는 pnpm workspace 기반 모노레포다.

```text
frontend/  # React, TypeScript, Vite 기반 프론트엔드 앱과 prototype 산출물
backend/   # 백엔드 작업 영역, 현재는 빈 골격(.gitkeep)만 유지
```

현재 실제로 동작하는 것은 프론트엔드 앱 셸뿐이며, 백엔드·AI 연동·외부 데이터 연동은 아직 구현 전이다.

## 2. 프론트엔드 책임

Feature-Sliced Design 레이어(`app/pages/widgets/features/entities/shared`)로 화면 조합, 상태 관리,
API 클라이언트 역할을 담당한다. 레이어별 상세 책임과 의존성 방향은
[development-guide.md의 Feature-Sliced Design](./development-guide.md#feature-sliced-design)을
참고한다.

## 3. 백엔드 책임

`backend/`는 NestJS 기반 워크스페이스 패키지 `@gazua/backend`다. 현재는 헬스체크(`GET /health`)
엔드포인트와 기본 툴체인(ESLint, Prettier, Jest, `class-validator` 기반 전역 `ValidationPipe`,
`@nestjs/config` 기반 환경 변수 로딩, Vite 개발 서버용 CORS 설정)만 갖춘 상태다.

데이터베이스는 Supabase(Postgres)를 사용한다. `src/config/env.schema.ts`의 Zod 스키마로 필수 환경 변수
(`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)를 부팅 시점에 검증하고,
`src/supabase/`의 전역 `SupabaseModule`이 `@supabase/supabase-js` 클라이언트(`service_role` 키 기반, RLS 우회)를
`SupabaseService`로 주입한다. 도메인 모듈에서는 `SupabaseService`를 주입받아 `client.from(...)`으로 조회한다.

TODO: API 서버가 담당할 도메인 모듈 구조(AI 분석, 최근 분석 기록, 시황 뉴스, 학습 콘텐츠)와 사용자별 인증
흐름(Supabase Auth 연동 여부, RLS 정책, anon key 기반 클라이언트 분리 여부)은 아직 정의되지 않았다.

## 4. 외부 금융 데이터 API 연동

TODO: 시세·뉴스 등 외부 데이터 소스가 아직 정의되지 않았다.

## 5. 인증 및 데이터 흐름

TODO: 인증 방식과 사용자별 데이터 흐름이 아직 정의되지 않았다.

## 6. 배포 구조

TODO: 배포 대상 환경, CI/CD 파이프라인이 아직 정의되지 않았다. 현재 저장소에는
`.github/workflows/auto-merge.yml`(자동 머지) 외의 배포 관련 워크플로가 없다.

## 7. 주요 요청 흐름

TODO: AI 질의응답 등 핵심 시나리오의 요청/응답 흐름(프론트엔드 → 백엔드 → 외부 API/LLM)이 아직
정의되지 않았다. 답변에 담겨야 하는 정보 구조(근거·리스크·시나리오)는
[ai-system.md](./ai-system.md)에 있다.
