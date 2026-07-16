# 🧠 ADHD 사용자를 위한 TODO 관리 AI Agent

할 일을 작은 단계로 나누고, 지금 해야 할 일 하나에만 집중할 수 있도록 돕는 웹 서비스입니다.

## ✨ 프로젝트 소개

TODO 앱과 캘린더는 이미 많습니다. 하지만 정작 어려운 것은 **일정을 기록하는 것보다 첫 번째 행동을 시작하는 것**입니다.

해당 프로젝트는 할 일을 단순히 저장하는 것이 아니라, AI Agent가 작업을 작은 단계로 나눠 ADHD 성향의 사용자가 부담 없이 시작할 수 있도록 돕는 것을 목표로 합니다.

## ⚒️ 기술 스택

<p>
    <img src="https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white">
</p>

## 📄 프로젝트 문서

| Docs | Description |
|------|-------------|
| [Wiki](https://github.com/imjyong/hub/wiki) | 상세 기획서, 발표 자료, 환경 설정, 개발 프로세스, 트러블 슈팅 등 |
| [docs/prototype/](docs/prototype/) | 순수 HTML·CSS 프로토타입 (디자인 보드 · 화이트 노이즈 테마 · ADHD 기능 제안) |
| [docs/checklist.md](docs/checklist.md) | 그날그날 실행 체크리스트 (날짜별) |
| [docs/dev-plan.md](docs/dev-plan.md) | 개발 로드맵, 우선순위, 백로그, 기술 스택 |
| [docs/spec.md](docs/spec.md) | 기능(Feat) 체크리스트, 지금 설계/개발/PR/머지 중 어느 단계인지 |
| [GitHub Issues](링크 예정) | 요일별 세부 개발 계획 |
| [docs/verification-plan.md](docs/verification-plan.md) | Claude가 작업한 내용을 직접 검증하는 계획 |
| [docs/verification-log.md](docs/verification-log.md) | 날짜별 검증 기록 |
| [docs/harness-plan.md](docs/harness-plan.md) | AI 협업 실패를 계층별로 분류해서 대응하는 하네스 구조 |

## 📁 폴더 구조

```
hub/
├── app/                       # Next.js 화면 코드 (App Router)
├── public/                    # 정적 파일 (이미지 등)
├── docs/
│   ├── checklist.md          # 일일 체크리스트 — 날짜별로 그날 할 일을 적고 완료되면 체크
│   ├── dev-plan.md           # 개발 로드맵 — 전체 진행 순서, 우선순위, 앞으로 할 일(백로그), 기술 스택
│   ├── spec.md               # 기능별 진행 단계 체크리스트 (설계 → 개발 → PR → 머지)
│   ├── verification-plan.md  # Claude가 만든 결과물을 어떻게 검증할지 정리한 계획
│   ├── verification-log.md   # 날짜별로 실제 검증한 기록
│   ├── harness-plan.md       # AI 협업 실패를 유형별로 분류해서 대응하는 하네스 구조
│   ├── images/               # 슬라이드, 다이어그램 등 문서용 이미지
│   └── prototype/            # 순수 HTML·CSS로 만든 화면 프로토타입
└── .claude/
    ├── skills/               # Claude가 작업할 때 따르는 규칙
    └── agents/               # 콕 프로젝트 전용 커스텀 Agent (계획 수립, 요구 검증 등)
```