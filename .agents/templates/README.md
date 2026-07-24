# AI 협업 요청 (슬래시 커맨드)

AI에게 작업을 맡길 때 쓰는 5단계 사이클. 매번 복붙하지 않도록 각 도구의 슬래시 커맨드로 등록했다.

역할 분리는 `AGENTS.md`의 "AI 협업 운영 방식"을 따른다. 핵심은 **한 AI에게 설계와 검증을 동시에 맡기지 않는 것**이다.

## 사이클과 위치

| 단계 | 담당 | 명령 | 파일 |
| --- | --- | --- | --- |
| 1. 설계 요청 | Codex | `/design-request` | `.codex/prompts/design-request.md` |
| 2. 설계 검증 | Claude Code | `/design-review` | `.claude/commands/design-review.md` |
| 3. 구현 요청 | Claude Code | `/implementation-request` | `.claude/commands/implementation-request.md` |
| 4. 구현 1차 리뷰 | Claude Code | `/implementation-review` | `.claude/commands/implementation-review.md` |
| 5. 구현 검증 | Codex | `/implementation-verification` | `.codex/prompts/implementation-verification.md` |

- 2번의 지적 사항을 사람이 결정해 설계에 반영한 뒤 3번으로 넘어간다.
- 4번은 Claude Code의 `implementation-code-reviewer` 서브에이전트가 수행한다.
- 5번에서 실패한 항목은 3번으로 되돌아간다.

## Claude Code 슬래시

`.claude/commands/`에 있는 파일은 저장소에 커밋되어 바로 작동한다. Claude Code에서 `/design-review`, `/implementation-request`, `/implementation-review`를 치면 된다.

## Codex 슬래시 — 한 번만 설정하면 된다

Codex는 저장소의 슬래시 프롬프트를 직접 읽지 않는다. `~/.codex/prompts/`(개인 홈)만 읽는다. 저장소에 커밋된 파일을 그 위치로 연결한다.

```bash
mkdir -p ~/.codex/prompts
ln -s "$(pwd)/.codex/prompts/design-request.md" ~/.codex/prompts/design-request.md
ln -s "$(pwd)/.codex/prompts/implementation-verification.md" ~/.codex/prompts/implementation-verification.md
```

Codex를 재시작하면 `/prompts:design-request`, `/prompts:implementation-verification`로 쓸 수 있다. 심링크라 저장소 파일을 고치면 자동으로 반영된다.

## 관련 문서

- `AGENTS.md` — 역할 분리와 공통 작업 규칙
- `docs/plan/process/agent-strategy.md` — 판단 기준 상세
- `docs/quality/` — 검증 기준 (2번, 4번, 5번 단계에서 참조)
