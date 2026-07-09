# 전자 매니저 키우기 문서 허브

이 폴더는 XP 데스크톱형 전자 생물 매니저 MVP의 기획, 화면 설계, 구현 명세, 작업 계획을 역할별로 나누어 관리한다.

문서 원칙은 `한 파일 = 한 역할`이다. Wiki에는 이 문서들을 복사해 페이지로 만들고, PR에는 `docs/` 문서와 `public/prototype-static.html` 정적 미리보기를 함께 포함한다.

## 문서 지도

| 파일 | 역할 | Wiki 권장 페이지 |
|---|---|---|
| ../AGENTS.md | 코딩 에이전트 작업 규칙과 세션 인수인계 기준 | 저장소 작업 지침 |
| `product-plan.md` | 문제 정의, 사용자 시나리오, 핵심 기능, MVP 범위 | 프로젝트 기획서 |
| `user-flow-wireframes.md` | 사용자 흐름, 화면 목록, 와이어프레임 | User Flow Wireframes |
| design-system.md | concept.png 기반 XP 디자인 토큰과 컴포넌트 규칙 | Design System |
| `mvp-functional-spec.md` | MVP 기능 동작과 완료 조건 | MVP 기능 명세 |
| `agent-design.md` | AI Agent 역할과 MVP 규칙 기반 동작 | Agent Design |
| `future-expansion-plan.md` | MVP 이후 기술·기능 확장 백로그 | MVP 이후 확장 계획 |
| `four-week-roadmap.md` | 4주 개발 체크리스트 | 4주 개발 계획 |
| `status.md` | 현재 진행 상황, 확인 링크, 남은 작업 | 진행 상황 |
| `archive/haetsalharu-plan.md` | 이전 아이디어 백업 | 햇살하루 백업 |

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

- 기획 내용은 `product-plan.md`에만 둔다.
- 화면 흐름과 와이어프레임은 `user-flow-wireframes.md`에만 둔다.
- 색상, 타이포그래피, 간격과 컴포넌트 스타일은 `design-system.md`에 둔다.
- 구현해야 할 기능 동작과 완료 조건은 `mvp-functional-spec.md`에 둔다.
- AI Agent 설명은 `agent-design.md`에 둔다.
- MVP 이후 기능과 기술 후보는 `future-expansion-plan.md`에 둔다.
- 일정과 작업 분해는 `four-week-roadmap.md`에 둔다.
- 완료/진행/남은 항목은 `status.md`에 둔다.
- 이전 아이디어는 `archive/` 아래에 둔다.






