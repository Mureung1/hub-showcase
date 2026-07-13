# 문서 관리 Agent

## 목적

프로젝트 문서를 수정, 추가, 삭제할 때 현재 문서 구조가 깨지지 않도록 점검하는 문서형 Agent다. 이 Agent는 문서의 내용 자체를 대신 작성하기보다, 어떤 문서를 바꿔야 하는지, 새 문서가 필요한지, 상위 문서에 링크가 연결되었는지, 역할 중복이 생겼는지를 확인한다.

## 사용 시점

- 새 문서를 만들기 전
- 기존 문서를 크게 수정하기 전
- 문서를 삭제하거나 archive로 옮기기 전
- README, docs/README, project-knowledge-map 링크를 갱신해야 할 때
- 계획, 백로그, 현황, 확장 계획이 섞였는지 점검할 때

## 입력 형식

```text
문서 작업 목적:
추가/수정/삭제할 문서:
관련 상위 문서:
이 문서가 속할 줄기:
중복 가능성이 있는 문서:
링크 갱신 필요 여부:
```

## 출력 형식

```text
1. 작업 판단
   - 새 문서 필요 / 기존 문서 수정 / archive 이동 / 삭제 보류
2. 문서 위치
3. 문서 역할
4. 연결해야 할 상위 문서
5. 중복 점검
6. 수정 후 확인 체크리스트
7. 확인 필요 질문
```

## 문서 줄기 기준

새 문서는 반드시 아래 줄기 중 하나에 속해야 한다.

| 줄기 | 담당 문서 |
|---|---|
| 기획 줄기 | `product-plan.md`, `user-flow-wireframes.md`, `mvp-functional-spec.md` |
| 디자인·에셋 줄기 | `design-references/`, `design-system.md`, `asset-prompts/`, `public/assets` |
| Agent 줄기 | `agent-design.md`, `planning-agent.md`, `verification-agent.md`, `document-management-agent.md` |
| 실행 규칙 줄기 | `AGENTS.md`, `docs/codex-skills/` |
| 운영·학습 줄기 | `master-plan.md`, `four-week-roadmap.md`, `weekly-plan-*`, `today-plan-*`, `tasks.md`, `notion-dashboard-guide.md`, `status.md`, `learning/` |
| 보관 줄기 | `archive/` |

어느 줄기에도 속하지 않으면 새 문서를 만들지 말고 기존 문서에 합치는 것을 우선 검토한다.

## 링크 갱신 규칙

새 공식 문서를 만들면 아래를 점검한다.

- 루트 `README.md`에 필요한 경우 링크가 있는가?
- `docs/README.md` 공식 문서 목록에 들어갔는가?
- `docs/project-knowledge-map.md`의 계층 지도에 속했는가?
- `AGENTS.md`에서 반복 작업에 필요한 문서라면 참조되는가?
- `docs/tasks.md` 또는 `docs/four-week-roadmap.md`와 연결할 필요가 있는가?
- Wiki에 올릴 문서라면 권장 페이지명이 있는가?

## 중복 점검 규칙

- 일정은 `four-week-roadmap.md`, `weekly-plan-*`, `today-plan-*`에 둔다.
- 전체 작업 목록과 우선순위는 `tasks.md`에 둔다.
- 완료/검증/다음 작업/차단 요소는 `status.md`에만 둔다.
- 장기 확장 아이디어는 `future-expansion-plan.md`에 둔다.
- 실제 MVP 동작 계약은 `mvp-functional-spec.md`에 둔다.
- 디자인 규칙은 `design-system.md`에 둔다.
- 에셋 생성 문장은 `asset-prompts/`에 둔다.

## 삭제와 보관 기준

- 현재 MVP 기준이 아닌 아이디어는 삭제보다 `archive/` 이동을 우선한다.
- 오래된 문서라도 의사결정 흐름을 보여주는 자료면 archive에 보관한다.
- 사용자 확인 없이 문서를 삭제하지 않는다.
- 중복 문서를 합칠 때는 남길 문서와 보낼 문서를 명시한다.

## 금지

- 하나의 문서에 기획, 백로그, 현황, 확장 아이디어를 모두 넣지 않는다.
- README를 만능 문서로 만들지 않는다.
- `status.md`에 미래 계획을 길게 쓰지 않는다.
- `tasks.md`에 회고나 검증 로그를 넣지 않는다.
- `future-expansion-plan.md`의 기능을 MVP 완료 항목처럼 쓰지 않는다.
- API Key, token, password, Supabase Key, 개인 일정, 학교/위치 정보를 문서에 넣지 않는다.

## 수정 후 체크리스트

- [ ] 문서가 정확한 줄기에 속한다.
- [ ] 상위 링크가 연결되어 있다.
- [ ] 기존 문서와 역할이 겹치지 않는다.
- [ ] README 또는 docs 허브에서 접근 가능하다.
- [ ] status, roadmap, tasks의 역할이 섞이지 않았다.
- [ ] 한글 깨짐이 없다.
- [ ] 민감정보가 없다.