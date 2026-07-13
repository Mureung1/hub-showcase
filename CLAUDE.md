## 프로젝트
선호도 기반 약속 시간 조율 서비스(모바일 웹 기반)

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
- 실제 URL/키는 프로젝트 생성 후 팀원 개별 로컬 `.env`에 채움

## 하지 말 것
- docs 폴더는 별도의 요청이 없는 경우 읽지 않는다.
