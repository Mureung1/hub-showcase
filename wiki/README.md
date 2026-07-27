# 답냥이 코드 위키

마지막 업데이트: 2026-07-27

## 이 문서의 목적

답냥이 저장소의 실행·변경·운영 지점을 빠르게 찾도록 돕는 근거 기반 위키다.

## 빠른 요약

- React 19/Vite 클라이언트가 메시지 작성 흐름을 제공하고, Vercel Function 두 개가 AI 생성과 비식별 상호작용 이벤트를 처리한다.
- 메시지 카드와 교수 이메일은 로컬 템플릿으로 즉시 생성한다. 가이드/직접 입력 AI 경로는 `POST /api/generate`를 호출한다.
- PostgreSQL(Neon)·Drizzle은 실행 메타데이터, 이벤트, 버전, retrieval 예시를 저장하도록 정의되어 있다.

## 추천 읽기 순서

1. [시작하기](01-getting-started.md)
2. [저장소 구조](02-repo-structure.md)
3. [아키텍처](03-architecture-overview.md)
4. [API](06-api.md), [데이터 모델](05-data-model.md)
5. [CI/CD](08-ci-cd.md), [보안](10-security.md)

## 빠른 링크

- [모듈 지도](04-modules.md)
- [설정 및 환경 변수](07-config-and-env.md)
- [관측성](09-observability.md)
- [기여 방법](11-contributing.md)
- [용어집](appendix-glossary.md)
- [결정 기록](appendix-decisions.md)

## 근거

- 애플리케이션 진입점: `src/main.tsx`, `src/app/App.tsx`
- 함수 진입점: `api/generate.ts`, `api/interaction.ts`
- 런타임/의존성/명령어: `package.json`

## 주의사항/함정

`README.md`의 일부 상태 설명과 현재 코드가 다를 수 있으므로, 이 위키는 구현 파일을 우선 근거로 한다. 예를 들어 Gemini provider와 DB sink는 현재 `api/`에 구현돼 있다.

## TODO/확인 필요

- 실제 Vercel 프로젝트의 Production Branch, 환경변수 적용 범위, 배포 이력은 저장소만으로 확인할 수 없다.
