# Briefy — 자연어 라이프 매니저

> 말하듯 한 줄 적으면 정리되고, 아침이면 하루가 한눈에 보이는 나의 하루 관리 서비스

일정·과제·루틴·식단을 앱 여러 개에 나눠 관리하는 대신, 하나의 입력창에 **"다음주 화요일 오후 3시 치과, 전날 알려줘"** 처럼 적거나 말하면 AI가 해석해 알맞은 곳에 저장하고, 오늘 화면 하나로 하루 전체를 보여줍니다. 저장뿐 아니라 조회·수정·삭제까지 자연어로 합니다.

## 핵심 기능

1. **자연어 대화형 관리 (CRUD)** — 텍스트/음성 한 줄로 저장·조회·수정·삭제. 모호하면 선택지를 제시하며 되묻기
2. **오늘 브리핑 대시보드** — 오늘의 일정, 루틴(시간대+내용), 식단, 마감 임박 과제 Top 5, 메모를 한 화면에

## 스택

- Next.js (App Router) + TypeScript + Tailwind CSS
- Anthropic Claude API (자연어 파서) — API Route 경유
- localStorage (MVP 저장소) / Web Speech API (음성 입력)
- MVP는 모바일 뷰포트 기준 웹, 최종 지향은 모바일 앱

## 실행 방법

```bash
npm install
cp .env.example .env.local   # ANTHROPIC_API_KEY 입력
npm run dev                  # http://localhost:3000
```

음성 입력은 크롬 기준으로 동작합니다.

## 문서

| 문서 | 내용 |
|---|---|
| [docs/plan.md](docs/plan.md) | 기획서 — 문제 정의, 사용자 시나리오, 핵심 기능, 화면 흐름 |
| [docs/checklist.md](docs/checklist.md) | 주차별 작업 체크리스트 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 폴더 구조, 데이터 모델, 파서 API 계약 |
| [CLAUDE.md](CLAUDE.md) | AI 협업용 프로젝트 규칙 |

## 시각 자료 (Figma)

- 유저 플로우 (FigJam): _링크 추가_
- 화면 목록 IA (FigJam): _링크 추가_
- 와이어프레임: https://www.figma.com/design/8Tjc7ZZecZhw5N9ng56kY6

## 프로젝트 정보

- 4주 MVP 프로젝트 · 주제: 대학생(본인)이 겪는 문제 해결
- 확장 계획: 음성 대화(TTS), 푸시 알림, 캘린더 연동, 주간 리포트, 네이티브 앱 — [plan.md 확장 계획](docs/plan.md) 참조