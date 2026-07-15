# Beacon

> 말을 걸면 지켜보고, **내 기록을 기억해 코치하는** AI 투자 에이전트

**Beacon**은 복잡한 설정 화면이나 명령어 대신 *대화*로 움직이는 투자 코치입니다. "삼성전자가 8만 원이 되면 알려줘"처럼 평소 말투로 조건을 걸면 시장을 대신 지켜보다 Discord로 알려주고, 그렇게 실행한 매매를 AI가 **과거 기록까지 끌어와** 복기해 투자 습관을 돌아보게 합니다. 복기는 단순 분석이 아니라, 과거 매매·주가 흐름·지난 복기를 도구로 직접 조회해 판단하는 **코칭 에이전트**입니다.

서비스는 **통합 웹앱을 본체**로 하고, Discord는 자연어 조건 입력과 알림 수신 채널로 사용합니다. Supabase 기반 다중 사용자 구조로, 각 사용자의 Discord와 투자 저널이 같은 계정 아래에서 데이터를 공유합니다. 구현은 1단계(1인용 MVP로 감시→기록→복기 루프 완성) → 2단계(다중 사용자 확장) 순서로 진행합니다. 기존 두 프로젝트를 하나의 서비스로 결합합니다.

**기술 스택**: Vite + React (웹) · Supabase (DB·Auth·Edge Functions·Cron) · Gemini (자연어 파싱·복기 에이전트) · KIS Open API · Discord

- [KIS_openapi](https://github.com/gyuwonlee1/KIS_openapi) — 감시하는 눈 · 자연어 입력
- [investment_journal](https://github.com/gyuwonlee1/investment_journal) — 복기하는 코치 · 차트 기록

## 문서

- [기획서 (docs/plan.md)](docs/plan.md) — 문제·페르소나·차별점·에이전트다움·핵심 기능·아키텍처·KPI·일정
- [디자인 시스템 (docs/design.md)](docs/design.md) — 색·타이포·간격·컴포넌트 토큰의 단일 원천
- [2주차 계획 (docs/week2-plan.md)](docs/week2-plan.md) — 구현 진행 현황과 우선순위 태스크
- [2주차 태스크 보드 (Notion)](https://app.notion.com/p/c70d4abe279049b193ced8b118663de3?v=39c581f4e3758160868f000c2b977634&source=copy_link) — 평일 5일(Day 1~5) 일별 태스크 칸반
- [작업 체크리스트 (docs/checklist.md)](docs/checklist.md)

## 폴더 구조

- `src/`, `public/` — Vite+React 웹앱
- `supabase/` — Edge Functions·마이그레이션·종목 seed
- `scripts/` — 로컬 초기화·운영 스크립트
- `docs/` — 기획·디자인·개발 문서

## 실행

저장소 루트에서 설치하고 실행합니다.

```bash
npm install
npm run dev             # http://localhost:5173
npm run lint
npm run build
```
