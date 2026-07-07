# Beacon

> 말을 걸면 지켜보고, 되돌아보게 하는 AI 투자 코치

**Beacon**은 복잡한 설정 화면이나 명령어 대신 *대화*로 움직이는 투자 코치입니다. "삼성전자가 8만 원이 되면 알려줘"처럼 평소 말투로 조건을 걸면 시장을 대신 지켜보다 Discord로 알려주고, 그렇게 실행한 매매를 AI가 복기해 투자 습관을 돌아보게 합니다.

서비스는 **통합 웹앱을 본체**로 하고, Discord는 자연어 조건 입력과 알림 수신 채널로 사용합니다. Supabase 기반 다중 사용자 구조로, 각 사용자의 Discord와 투자 저널이 같은 계정 아래에서 데이터를 공유합니다. 구현은 1단계(1인용 MVP로 감시→기록→복기 루프 완성) → 2단계(다중 사용자 확장) 순서로 진행합니다. 기존 두 프로젝트를 하나의 서비스로 결합합니다.

- [KIS_openapi](https://github.com/gyuwonlee1/KIS_openapi) — 감시하는 눈 · 자연어 입력
- [investment_journal](https://github.com/gyuwonlee1/investment_journal) — 복기하는 코치 · 차트 기록

## 문서

- [기획서 (docs/plan.md)](docs/plan.md) — 문제 정의 · 사용자 시나리오 · 핵심 기능 2개 · 화면 흐름
- [작업 체크리스트 (docs/checklist.md)](docs/checklist.md)

## 소개 페이지 실행

Vite + React로 만든 프로젝트 소개 페이지입니다.

```bash
npm install
npm run dev
```

`http://localhost:5173`으로 접속합니다.
