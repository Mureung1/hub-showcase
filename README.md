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
| [Wiki](https://github.com/imjyong/hub/wiki) | 상세 기획서, 환경 설정, 개발 프로세스, 트러블 슈팅 등 |
| [docs/plan.md](docs/plan.md) | 기획서 슬라이드 (문제 정의 · 시나리오 · User Flow · 화면 목록(IA) · 와이어프레임 · 기능 · MVP) |
| [docs/prototype/](docs/prototype/) | 순수 HTML·CSS 프로토타입 (디자인 보드 · 화이트 노이즈 테마 · ADHD 기능 제안) |
| [docs/checklist.md](docs/checklist.md) | 개발 계획 및 작업 분해 |
| [docs/dev-plan.md](docs/dev-plan.md) | 개발 Task, 우선순위, 백로그, 기술 스택 |
| [GitHub Issues](링크 예정) | 개발 계획 |
| [docs/verification-plan.md](docs/verification-plan.md) | Claude가 작업한 내용을 직접 검증하는 계획 |
| [docs/verification-log.md](docs/verification-log.md) | 날짜별 검증 기록 |

## 📁 폴더 구조

```
hub/
├── docs/
│   ├── plan.md               # 기획서 슬라이드
│   ├── checklist.md          # 작업 분해 및 매일 할 일
│   ├── dev-plan.md           # 개발 Task, 우선순위, 백로그, 기술 스택
│   ├── verification-plan.md  # 작업 검증 계획
│   ├── verification-log.md   # 날짜별 검증 기록
│   ├── images/               # 슬라이드, 다이어그램 이미지
│   └── prototype/            # 순수 HTML·CSS 프로토타입
└── .claude/skills/           # Claude가 작업할 때 따르는 규칙
```