## 프로젝트
선호도 기반 약속 시간 조율 서비스

## 기술 스택
- React + TypeScript (FE)
- Express + TypeScript (BE)
- Supabase(Postgres) (DB)

## 디렉토리 구조
- npm workspaces 모노레포: `client/`(FE), `server/`(BE)   
- 루트 스크립트: `npm run dev`(client+server 동시 실행, concurrently) / `build` / `lint` / `format` / `test`
- 포트: client 5173(Vite 기본), server 4000 (둘 다 `.env`에서 override 가능)
- 개발 중 FE→BE 호출은 `client/vite.config.ts`의 `/api` 프록시(→ `localhost:4000`)를 통해 same-origin으로 처리

## 라이브러리
- FE: react-router, @tanstack/react-query, axios, react-hook-form + zod(@hookform/resolvers), date-fns, @supabase/supabase-js
- BE: express, cors, dotenv, zod, morgan, @supabase/supabase-js, tsx(dev), typescript
- 전역 상태관리 라이브러리는 아직 미도입 (useState/useContext로 충분, 필요해지면 추가)
- 테스트: Vitest (client는 @testing-library/react, server는 supertest 병행)

## 컨벤션
- 컴포넌트: PascalCase (파일명=컴포넌트명)
- 훅/유틸: camelCase, 폴더: kebab-case
- 린트/포맷: 루트 `eslint.config.js`(flat config, client/server 공용) + `.prettierrc`

## 환경 변수
- `client/.env.example`, `server/.env.example` 참고해서 각자 로컬 `.env` 생성 (커밋 금지)
- Supabase 프로젝트는 아직 미생성 — 실제 URL/키는 프로젝트 생성 후 팀원 개별 로컬 `.env`에 채움

## 하지 말 것
- docs/study 폴더는 읽지 않는다.



**Tradeoff:** These guidelines below bias toward caution over speed. For trivial tasks, use judgment.
## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
