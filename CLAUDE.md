# 팀플, 이지! — 프로젝트 가이드

대학생 팀 프로젝트의 '킥오프 1시간'을 AI가 중립적 중재자로 대신해, 15분 만에 계획과 역할 분담을 만들어주는 웹 서비스. 상세 기획·진행 현황은 `docs/plan.md`.

## 작업 규칙

1. **개발 시작 시 `docs/plan.md`의 "개발 진행 체크리스트"를 먼저 확인**한다. 작업을 마치면 해당 항목을 체크(`[x]`)로 갱신한다.
2. **각 작업(슬라이스/커밋 단위)마다 `docs/plan.md`의 "개발 로그(결정·검증)"에 기록**한다 — **왜 그렇게 구현했는지 + 어떻게 검증했는지**(테스트·lint·build·스크린샷 등). 최신을 맨 위로.
3. **커밋·푸시는 사용자가 직접** 한다. Claude는 변경 사항을 보고하고 추천 커밋 메시지만 제시한다 (임의로 `git commit`/`git push` 하지 않는다).

## 아키텍처 (안정적 사실)

- **스택**: React 19 + Vite + react-router(프론트) / Express(백엔드, 포트 3001) / Supabase Postgres + Storage(DB·파일) / Claude API `@anthropic-ai/sdk`(플래너·설명자, `server/services/`)
- **게이트웨이**: 브라우저는 오직 `/api`만 호출한다. 개발 중 Vite(5173)가 `/api`를 3001로 프록시. **Supabase Secret key·Anthropic 키는 서버 `.env`에만** 존재하며 브라우저로 절대 내려보내지 않는다 (`server/db/supabase.js`).
- **인증**: 비밀번호 bcrypt 해시 + JWT httpOnly 쿠키 (`server/lib/auth.js`). 요청의 사용자 판별은 `userIdFromReq(req)`.
- **역할 배정**: **결정적 점수 로직**(`src/logic/assignRoles.js`)이 배정을 계산하고, **AI는 역할 "정의"와 결과 "설명"만** 맡는다 — 배정 자체는 AI가 하지 않음(공정성·재현성·비공개). 조장은 실무 역할 위에 얹는 표식.
- **디자인**: Soft Mint 토큰(`src/styles/tokens.css`)만 사용, 컴포넌트에 그림자 없음. 시안 없는 화면도 같은 언어(중앙 카드·연녹 입력 필드·필 버튼)로 통일.

## 검증 기본기

- 코드 변경 후 `npx oxlint`(또는 `npm run lint`) + `npm run build` 통과 확인.
- 서버 변경은 가능하면 실제 호출(curl 등)로, 화면 변경은 헤드리스 스크린샷으로 동작을 확인한다.
