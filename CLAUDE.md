## 프로젝트
통증·시간부족으로 계획한 운동을 못 할 때, 판단 없이 루틴을 재편성해주는 AI 운동 코치.

## 코드 위치
이 저장소가 실제 앱 코드다 — client는 저장소 루트(`src/`), server는 `server/`. 기획·디자인 원본 작업은 로컬 `naver_ai_agent/fitness`에서 진행하고, 완성되면 이 저장소로 복사해서 커밋한다.

## 기술 스택
- Frontend: React + Vite (JavaScript, TypeScript 아님), React Router(화면 전환), Tailwind CSS(스타일링 — `src/index.css`의 `@theme`에 docs/design.md 토큰 반영)
- Backend: Express (`server/`), cors, dotenv
- DB: Supabase(PostgreSQL) + Prisma(ORM). Express가 Prisma로 Supabase에 접속하고, Supabase 자체 Auth/REST API는 쓰지 않는다(로그인 기능 자체가 범위 밖)
- 테스트: Vitest + React Testing Library (client). server 테스트 도구는 아직 미정
- import: `@/`는 client의 `src/`를 가리키는 절대경로 alias (같은 폴더 안에서는 상대경로 그대로 사용)
- 개발 서버 실행·설정 상세는 README.md 참고

## 컨벤션
- 컴포넌트: PascalCase
- 포맷: Prettier(세미콜론 없음, 홑따옴표) — `npm run format`. ESLint는 client/server 각각 별도 설정(`npm run lint`, `npm run lint:server`)
- 커밋: 파일/개념 단위로 쪼개서 여러 번 (한 커밋에 몰아넣지 않기). 메시지는 `타입: 제목` 한 줄 + 빈 줄 + 본문 불릿 형식으로 쓰고, 타입은 `docs`/`chore`/`test`/`feat`/`fix` 중 맞는 것을 쓴다

## 하지 말 것
- 통증 원인 추정, "계속해도 됨" 같은 의료 판단 문구 생성 금지
- 정적 운동 테이블 밖의 운동을 새로 지어내지 않기 — 테이블 안에서만 선택
- 로그인/인증 기능 구현 금지 (4주 범위 밖, 매니저 지침)
- 코드 에러 발생 시 조용히 고치지 말고 원인부터 설명
- 요청 범위 밖 리팩토링·파일 분리 금지

## 참고
- 기획서: @docs/기획서.md
- 경쟁사 분석: @docs/경쟁사분석.md
- 디자인(Claude Design 실제 화면 기준, 화면 검토 전이라 바뀔 수 있음): @docs/design.md
