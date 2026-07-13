# Issue tracker: Local Markdown

이 template은 Matt Pocock spec, implementation ticket, Wayfinder 산출물을 local Markdown으로 관리하는 저장소에 사용한다. 실제로 작성할 때는 저장소의 기존 문서 구조를 먼저 확인하고, 아래 기본 경로를 유지하거나 한 번에 일관되게 바꾼 뒤 `AGENTS.md`와 `docs/agents/issue-tracker.md`에 같은 mapping을 기록한다.

## Artifact mapping

| 산출물 | 기본 경로 | 생성 시 상태 | Lifecycle owner |
| --- | --- | --- | --- |
| Spec | `docs/specs/YYYY-MM-DD-<slug>.md` | `draft` 또는 `ready-for-ticketing` | `/to-spec` |
| Implementation ticket | `docs/tickets/<spec-slug>/NNN-<slug>.md` | `ready-for-agent` | `/to-tickets`, `/implement` |
| Wayfinder map | `docs/wayfinding/<effort>/map.md` | `active` | `/wayfinder`, `/to-spec` |
| Wayfinder ticket | `docs/wayfinding/<effort>/tickets/NNN-<slug>.md` | `open` | `/wayfinder` |
| Wayfinder asset | `docs/wayfinding/<effort>/assets/<name>` | 해당 없음 | owning Wayfinder ticket |

Implementation ticket은 반드시 한 파일에 하나씩 저장하고 dependency order에 따라 세 자리 번호를 붙인다. 여러 ticket을 한 Markdown 파일에 합치지 않는다.

## Metadata와 reference

- Spec과 implementation ticket의 state는 `## Agent triage` 아래 `State:`에 기록한다.
- Wayfinder map과 ticket의 metadata section은 `/wayfinder`가 정의한 형식을 사용한다.
- Local path는 그 정확한 artifact를 뜻한다.
- URL은 그 정확한 remote artifact를 뜻한다.
- Bare number는 remote issue나 PR로 자동 해석하지 않는다.
- Blocking edge는 bare number만 쓰지 않고 exact relative path와 읽을 수 있는 title을 함께 기록한다.
- Comments나 추가 판단은 별도 tracker history를 만들기보다 owning artifact의 관련 section에 append한다.

## Lifecycle 소유권

Tracker 문서는 local path와 reference 표현만 정의한다. State transition, frontier, claim, resolve, completion 조건은 각 skill을 정본으로 사용한다.

| 계약 | 정본 skill |
| --- | --- |
| Spec readiness와 map-to-spec handoff | `/to-spec` |
| Implementation ticket graph와 실행 gate | `/to-tickets` |
| Wayfinder state, claim, resolve, completion | `/wayfinder` |
| Implementation closeout와 final commit | `/implement` |

## Skill이 “publish to the issue tracker”라고 할 때

위 artifact mapping에 따라 local Markdown을 작성한다. 사용자가 remote 게시를 명시적으로 요청하지 않은 경우 GitHub Issues나 다른 remote tracker item을 만들지 않는다.

## Skill이 “fetch the relevant ticket”이라고 할 때

사용자가 전달한 exact local path를 읽는다. Bare number만 전달된 경우 추측하지 말고 local artifact path 또는 명시된 remote surface를 확인한다.
