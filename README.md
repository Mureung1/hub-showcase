# AI 운동 루틴 적응 코치

사용자의 운동 기록과 컨디션 피드백을 누적 추적하고, 예외 상황(통증·시간 부족·스킵)이 발생하면 하드 제약(통증 부위 제외, 인접 세션 부위 중복 금지) 안에서 루틴을 재편성하는 Agent.

- 참가자: N001_강민구
- 프로그램: AI Agent Challenge (네이버 커넥트재단 + 서울대, 코드스쿼드 운영)

## 문서

- [기획서 (Wiki)](../../wiki) — 문제정의, 사용자 시나리오, 핵심 기능
- [경쟁사 분석](docs/경쟁사분석.md) — 유사 서비스 기능 조사 및 채택/미채택 근거
- [사용자 흐름 다이어그램](docs/diagrams/user-flow.html) — 화면·동작 플로우차트 (다운로드 후 브라우저로 열람)

## 개발 환경

React + Vite 프로젝트다.

```bash
npm install
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드
npm run lint     # ESLint
npm run preview  # 빌드 결과 미리보기
```
