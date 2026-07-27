# 저장소 구조

마지막 업데이트: 2026-07-27

## 이 문서의 목적

코드의 책임 경계와 실행 진입점을 찾는다.

## 빠른 요약

`src/`는 브라우저 UI, `api/`는 서버 함수, `drizzle/`은 DB migration, `scripts/`는 검증/운영 보조 명령이다.

## 디렉터리 트리

```text
.
├── src/
│   ├── app/                 # App shell, splash
│   ├── pages/message-flow/  # 화면 흐름 상태 orchestration
│   ├── features/            # 단계별 UI 컴포넌트
│   ├── entities/message/    # 메시지 도메인, 템플릿, 가이드 맥락
│   ├── shared/generation/   # 브라우저↔API 생성 계약/클라이언트
│   └── shared/interaction/  # 이벤트 계약/reporter
├── api/
│   ├── generate.ts          # POST /api/generate
│   ├── interaction.ts       # POST /api/interaction
│   └── _lib/                # generation, prompt, retrieval, db
├── drizzle/                 # Drizzle SQL migration/snapshot
├── scripts/                 # DB/retrieval/template smoke·검증
├── public/                  # 정적 이미지 및 냥이 에셋
├── .github/workflows/       # CI 및 자동 병합 workflow
└── docs/                    # 제품/설계 원문
```

## 엔트리포인트와 핵심 흐름

1. `src/main.tsx`가 `#root`에 `<App />`을 렌더한다.
2. `src/app/App.tsx`가 `Splash`와 `MessageFlow`를 조합한다.
3. `src/pages/message-flow/MessageFlow.tsx`가 선택 상태를 유지하고 카드 템플릿, 이메일 템플릿, API 생성 경로를 분기한다.
4. `api/generate.ts`/`api/interaction.ts`가 Vercel의 `fetch` handler를 export한다.

## 근거

- UI 진입: `src/main.tsx`, `src/app/App.tsx`
- 흐름 orchestration: `src/pages/message-flow/MessageFlow.tsx`
- 서버 진입: `api/generate.ts`, `api/interaction.ts`

## 주의사항/함정

`templateCompiler/generated/*`는 생성 산출물이다. 직접 수정 대상이 아니라 `scripts/templates-generate.ts`의 결과다.

## TODO/확인 필요

- SPA의 호스팅 rewrite 규칙은 Vite 설정에 없고 Vercel 프로젝트 설정도 저장소에 없으므로 확인 필요.
