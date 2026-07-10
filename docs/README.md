# 전자 매니저 키우기 문서 허브

이 폴더는 XP 데스크톱형 전자 생물 매니저 MVP의 기획, 화면 설계, 기능 명세, 디자인, 에셋 생성, 작업 계획을 역할별로 관리한다.

문서 원칙은 `한 파일 = 한 역할`이다. 문서 간 상하 관계와 파생 구조는 [project-knowledge-map.md](project-knowledge-map.md)에 둔다.

## 먼저 볼 문서

| 문서 | 역할 |
|---|---|
| [../README.md](../README.md) | 저장소 첫 화면, 프로젝트 소개, 실행 방법 |
| [../AGENTS.md](../AGENTS.md) | Codex 작업 규칙, 금지사항, 필수 참고 문서 |
| [project-knowledge-map.md](project-knowledge-map.md) | 문서 간 관계, skill/asset 연결성, 계층 지도 |

## 공식 문서 목록

| 문서 | 역할 | Wiki 권장 페이지 |
|---|---|---|
| [product-plan.md](product-plan.md) | 문제 정의, 사용자 시나리오, 핵심 기능, MVP 범위 | 프로젝트 기획서 |
| [user-flow-wireframes.md](user-flow-wireframes.md) | 사용자 흐름, 화면 목록, 와이어프레임 | User Flow Wireframes |
| [mvp-functional-spec.md](mvp-functional-spec.md) | MVP 기능 동작과 완료 조건 | MVP 기능 명세 |
| [agent-design.md](agent-design.md) | AI Agent 역할과 MVP 규칙 기반 동작 | Agent Design |
| [design-system.md](design-system.md) | concept.png 기반 XP 디자인 토큰과 컴포넌트 규칙 | Design System |
| [future-expansion-plan.md](future-expansion-plan.md) | MVP 이후 기술·기능 확장 백로그 | MVP 이후 확장 계획 |
| [four-week-roadmap.md](four-week-roadmap.md) | 4주 개발 체크리스트 | 4주 개발 계획 |
| [status.md](status.md) | 완료, 검증, 다음 작업, 차단 요소 | 진행 상황 |
| [learning/README.md](learning/README.md) | 학습 키워드와 참고 코드 위치 | 학습 인덱스 |
| [archive/haetsalharu-plan.md](archive/haetsalharu-plan.md) | 이전 아이디어 백업 | 햇살하루 백업 |

## 에셋 관련 문서

| 문서 | 역할 |
|---|---|
| [design-references/README.md](design-references/README.md) | 디자인 참고 이미지와 후보 에셋의 역할 |
| [asset-prompts/README.md](asset-prompts/README.md) | 에셋 생성 프롬프트 구조와 적용 흐름 |

## 프로토타입 확인

React MVP 실행:

```powershell
cd D:\2026.1\AIAgentChallenge\hub
npm.cmd install
npm.cmd run dev
```

브라우저에서 확인:

```text
http://localhost:5173/
```

정적 미리보기:

```text
http://localhost:5173/prototype-static.html
```

정적 미리보기 파일 위치:

```text
public/prototype-static.html
```

## Wiki 연결 방식

GitHub Wiki는 코드 PR에 직접 포함되지 않는다. PR 본문에는 Wiki 링크를 별도로 넣는다.

```md
- Wiki: https://github.com/YIFNEN/hub/wiki
- 정적 프로토타입: `public/prototype-static.html`
```

## 관리 기준

- 문서 목록과 링크는 이 파일에 둔다.
- 문서 간 계층과 파생 관계는 `project-knowledge-map.md`에 둔다.
- 기획 내용은 `product-plan.md`에 둔다.
- 화면 흐름과 와이어프레임은 `user-flow-wireframes.md`에 둔다.
- 기능 동작과 완료 조건은 `mvp-functional-spec.md`에 둔다.
- 디자인 토큰과 스타일 규칙은 `design-system.md`에 둔다.
- 에셋 생성 프롬프트는 `asset-prompts/`에 둔다.
- 완료/검증/다음 작업/차단 요소는 `status.md`에 둔다.
- 이전 아이디어와 원본 초안은 `archive/`에 둔다.
