# Amadda

아맞다(Amadda)는 저장해둔 링크와 메모를 현재 상황에 맞춰 다시 찾게 해주는 개인 인사이트 저장소입니다. MVP는 링크 저장, 카테고리 기반 보관함, 상황 기반 꺼내보기를 중심으로 검증합니다.

## 문서 색인

| 이런 상황이면                                               | 볼 문서                                                                                                        |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 제품 문제, 타겟 사용자, MVP 범위, 사용자 흐름을 확인할 때   | [MVP 기획서](docs/plan.md)                                                                                     |
| 초기 논의 배경과 결정 이유를 아카이브로 확인할 때            | [기획 논의 아카이브](docs/discussion.md)                                                                       |
| 지금 무엇을 구현해야 하는지 작업 단위를 확인할 때           | [작업 체크리스트](docs/checklist.md)                                                                           |
| 로그인 전 서비스 온보딩의 목적, 문구, 화면 흐름을 확인할 때 | [온보딩 기획](docs/onboarding.md)                                                                              |
| `꺼내보기`의 유사도 검색과 작업팩 UX 기준을 확인할 때       | [꺼내보기 기획](docs/retrieve.md)                                                                              |
| 화면 톤, 색상, 타이포그래피, 컴포넌트 규칙을 확인할 때      | [디자인 시스템](DESIGN.md)                                                                                     |
| WDS 컴포넌트 적용 기준과 도입 순서를 확인할 때              | [WDS 적용 메모](docs/wds-adoption.md)                                                                          |
| FSD 레이어, import 규칙, 서버 구조를 확인할 때              | [개발 아키텍처](docs/development-architecture.md)                                                              |
| 기술 스택, 라이브러리 선정 이유, 설치 상태를 확인할 때      | [기술 스택 및 라이브러리](docs/tech-stack.md)                                                                  |
| 코드 스타일, 브랜치 전략, 커밋 메시지 규칙을 확인할 때       | [코딩/커밋 컨벤션](docs/coding-commit-conventions.md)                                                          |
| 도메인 용어와 제품 맥락을 빠르게 파악할 때                  | [도메인 컨텍스트](CONTEXT.md)                                                                                  |
| AI 에이전트에게 작업을 맡기기 전 프로젝트 규칙을 확인할 때  | [에이전트 작업 지침](AGENTS.md)                                                                                |
| 외부에 정리한 기획서를 확인할 때                            | [외부 기획서 링크](https://semicolon-master.notion.site/plan-md-397f551ebf23800f8700f76301a15ca4)              |
| 노션 기반 프로젝트 관리 페이지를 확인할 때                  | [프로젝트 관리 노션](https://semicolon-master.notion.site/AI-Agent-Challenge-396f551ebf238005a7fcfbe20555c4bd) |

## 구현 계획 색인

| 구현할 작업이면                                           | 볼 문서                                                                  |
| --------------------------------------------------------- | ------------------------------------------------------------------------ |
| 앱 셸, 하단 탭, 기본 화면 골격을 구현할 때                | [앱 셸 구현 계획](docs/superpowers/plans/amadda-p0-app-shell.md)         |
| Supabase Auth, Google 로그인, 인증 게이트를 구현할 때     | [인증 구현 계획](docs/superpowers/plans/amadda-auth.md)                  |
| Supabase 테이블, RLS, 사용자별 데이터 구조를 설계할 때    | [데이터 모델 구현 계획](docs/superpowers/plans/amadda-data-model.md)     |
| 로그인 후 관심 분야 선택과 초기 카테고리 생성을 구현할 때 | [개인화 온보딩 구현 계획](docs/superpowers/plans/amadda-onboarding.md)   |
| 카테고리 생성, 수정, 삭제, 필터를 구현할 때               | [카테고리 구현 계획](docs/superpowers/plans/amadda-category.md)          |
| URL 저장, 중복 검증, 저장 후 제안을 구현할 때             | [링크 저장 구현 계획](docs/superpowers/plans/amadda-insight-save.md)     |
| 인사이트 제목, 메모, 카테고리 수정과 삭제를 구현할 때     | [인사이트 수정 구현 계획](docs/superpowers/plans/amadda-insight-edit.md) |
| 보관함 목록, 검색, 카드 그리드를 구현할 때                | [보관함 구현 계획](docs/superpowers/plans/amadda-library.md)             |
| URL 메타데이터 수집과 fallback 처리를 구현할 때           | [메타데이터 수집 구현 계획](docs/superpowers/plans/amadda-metadata.md)   |
| 홈의 `꺼내보기` 유사도 검색과 작업팩을 구현할 때          | [꺼내보기 구현 계획](docs/superpowers/plans/amadda-retrieve.md)          |

## 스크립트

- `npm install`
- `npm run dev` - runs Vite and Express together
- `npm run dev:client` - runs only Vite
- `npm run dev:server` - runs only Express
- `npm run build`
- `npm test`
- `npm run lint`
- `npm run format`
- `npm run format:check`
