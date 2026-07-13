# FirstPR

사용자의 GitHub 활동과 선호 조건을 분석해, **첫 오픈소스 기여에 적합한 레포지토리와 이슈를 추천**해주는 서비스입니다.

## 소개

오픈소스에 기여하고 싶지만 "어떤 프로젝트/이슈부터 시작해야 할지" 막막한 개발자를 위한 서비스입니다.
GitHub ID와 선호 조건(언어·난이도·주제)을 입력하면, 사용자의 기술 성향과 실력 수준에 맞는 레포/이슈를 추천합니다.

> 📄 **기획서**: [Notion 기획 문서](https://app.notion.com/p/396d15ed99be80299fddee75a63e8867?source=copy_link)
> 프로젝트 배경, 페르소나, 사용자 시나리오, 핵심 기능, 화면 흐름 등 상세 기획은 위 문서를 참고하세요.
> (요약본은 [`docs/plan.md`](docs/plan.md)에서도 확인할 수 있습니다.)

## 주요 기능

- **GitHub 프로필 분석** — 사용 언어, 커밋/PR 이력 등을 분석해 기술 성향과 실력 수준 파악
- **선호 조건 입력** — 기여하고 싶은 언어·난이도·주제 선택
- **레포/이슈 추천** — 프로필 분석 결과와 선호 조건을 조합해 적합한 레포·이슈 추천
- **추천 상세 보기** — 추천된 레포/이슈의 설명, 난이도, 필요 기술, 링크 등 상세 정보 제공
- **재조회/필터링** — 조건을 바꿔 다시 추천받거나 결과 필터링

## 기술 스택

| 구분 | 스택 |
| --- | --- |
| Frontend | React 19, Vite |
| Lint | oxlint |
| Backend | Node.js, Express *(예정, 미착수)* |
| DB | 미정 *(MVP는 MongoDB 검토, 관계 복잡 시 PostgreSQL 고려)* |

## 시작하기

### 요구 사항
- Node.js (LTS 권장)

### 설치 및 실행
```bash
npm install      # 의존성 설치
npm run dev      # 개발 서버 실행
```

### 그 외 명령어
```bash
npm run build    # 프로덕션 빌드
npm run preview  # 빌드 결과 미리보기
npm run lint     # 린트 검사
```

## 태스크 관리

개발 태스크는 Notion **개발 Task 관리** 보드에서 Week/영역(FE·BE)별로 관리합니다. (원본 소스: [`docs/checklist.md`](docs/checklist.md))

> 📌 **Notion 태스크 보드**: [개발 Task 관리](https://app.notion.com/p/a6b24df210c142798f852c67eaafae73)
> (상위 페이지: [Naver AI Agent Challenge](https://app.notion.com/p/395d15ed99be8029a792d34ec343ee9c))

> 🐛 **GitHub 이슈**: [이슈 트래커](https://github.com/kimsunho2000/hub/issues) — 버그 리포트 및 작업 이슈 관리

## 프로젝트 문서

| 문서 | 설명 |
| --- | --- |
| [docs/plan.md](docs/plan.md) | 기획서 (요약) |
| [docs/checklist.md](docs/checklist.md) | 주차별 작업 체크리스트 (Notion 태스크 보드 원본) |
| [docs/architecture.md](docs/architecture.md) | 아키텍처 설계 |
| [docs/checklist.md](docs/checklist.md) | 주차별 작업 체크리스트 |
| [docs/decisions.md](docs/decisions.md) | 주요 기술/기획 의사결정 기록 |
| [docs/log.md](docs/log.md) | 날짜별 작업 로그 |
| [docs/design.md](docs/design.md) | 디자인 시스템 (색·폰트·모서리·여백·카드 규칙) |
| [docs/conventions.md](docs/conventions.md) | 코드 컨벤션 (프론트/백엔드 작성 규칙) |
