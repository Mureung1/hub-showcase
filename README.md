# AI 운동 루틴 적응 코치

사용자의 운동 기록과 컨디션 피드백을 누적 추적하고, 예외 상황(통증·시간 부족·스킵)이 발생하면 하드 제약(통증 부위 제외, 인접 세션 부위 중복 금지) 안에서 루틴을 재편성하는 Agent.

- 참가자: N001_강민구
- 프로그램: AI Agent Challenge (네이버 커넥트재단 + 서울대, 코드스쿼드 운영)

## 문서

- [기획서 (Wiki)](../../wiki) — 문제정의, 사용자 시나리오, 핵심 기능
- [경쟁사 분석](docs/경쟁사분석.md) — 유사 서비스 기능 조사 및 채택/미채택 근거
- [사용자 흐름 다이어그램](docs/diagrams/user-flow.html) — 화면·동작 플로우차트 (다운로드 후 브라우저로 열람)
- [개발 Task 목록](docs/PLAN.md) — 2~4주차 개발 task 체크리스트
- [개발 백로그](docs/BACKLOG.md) — 주차별 우선순위(P0/P1/P2)와 DoD

## 개발 환경

React(Vite) 프론트엔드 + Express 백엔드 구조다. 프론트엔드는 저장소 루트(`src/`), 백엔드는 `server/`에 있다.

```bash
# 최초 1회
npm install              # 루트(client) 의존성
npm --prefix server install   # server 의존성
cp server/.env.example server/.env   # 실제 Supabase 연결 정보로 채워넣기

# 개발
npm run dev:all   # client(Vite)+server(Express) 동시 실행
npm run dev       # client만
npm run dev:server  # server만

npm run build     # client 프로덕션 빌드
npm run lint      # client ESLint
npm run test      # client Vitest
npm run preview   # client 빌드 결과 미리보기
```
