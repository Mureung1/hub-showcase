---
name: submit-daily-pr
description: Write today's handoff doc, commit, push, draft a PR title/body in the repo's 4-section template, get explicit user approval, then submit the PR to the course upstream repo. Use when the user says things like "오늘 PR 제출해줘", "오늘 작업 인수인계하고 PR 올려줘", "PR 만들어줘" for the hub project, or invokes /submit-daily-pr.
---

# Submit Daily PR

`/Users/bricepark/Documents/hub`의 오늘(또는 이번 세션) 작업을 정리해 인수인계 문서로 남기고, 커밋·푸시한 뒤, 챌린지 저장소로 보낼 PR을 초안 → 승인 → 제출까지 한 흐름으로 처리한다.

**항상 지킬 것: PR 제목·본문은 4단계에서 사용자에게 그대로 보여주고 명시적 승인을 받기 전에는 `gh pr create`를 실행하지 않는다.** 1~3단계(문서·커밋·푸시)는 이 skill이 호출된 것 자체를 진행 승인으로 보고 이어서 실행한다.

## 0. 시작 전 확인

```bash
pwd
git status --short --branch
git branch --show-current
git fetch upstream --quiet
```

- 경로가 `/Users/bricepark/Documents/hub`인지 확인한다.
- 브랜치가 `work`가 아니면 사용자에게 확인한다(다른 브랜치면 그 브랜치명으로 아래 단계를 진행).

## 1. 이번에 제출할 작업 범위 파악

칼렌더 날짜가 아니라 **"아직 PR로 안 보낸 커밋 전부"** 를 범위로 삼는다(세션이 여러 날에 걸쳐도 정확함).

```bash
git log upstream/N077_박병관..work --oneline
git status --short
```

- 위 로그가 비어 있고 `git status --short`도 깨끗하면: 제출할 새 작업이 없다고 사용자에게 보고하고 멈춘다(빈 PR 만들지 않음).
- `git status --short`에 아직 커밋 안 된 변경이 있으면, 이번 제출에 포함할지 사용자에게 짧게 확인한다(단, 이미 진행 중인 대화에서 무엇을 커밋할지 합의된 상태라면 다시 묻지 않아도 됨).
- 이 커밋 목록 + diff 요약이 아래 인수인계 문서와 PR 본문의 재료가 된다.

## 2. 오늘 인수인계 문서 작성

`docs/handoff/CODEX_HANDOFF_<YYYY-MM-DD>.md`를 만든다(오늘 날짜는 `date +%F`로 확인). 이전 예시: [docs/handoff/CODEX_HANDOFF_2026-07-20.md](../../../docs/handoff/CODEX_HANDOFF_2026-07-20.md).

형식(작업량에 맞게 섹션은 줄여도 됨, 과장 없이 실제 한 일만):

```markdown
# Codex 인수인계 — <YYYY-MM-DD> <한 줄 주제>

> 이전 인수인계: [<이전 파일명>](./<이전 파일명>).

## 0. 저번 이후 달라진 점 (핵심 차이)
- (1단계에서 뽑은 커밋들을 사람이 읽을 요약으로)

## 1. 오늘 만든 커밋 (work 브랜치)
- `<hash>` <커밋 메시지>

## 2. 오늘 실제로 검증한 것
- (build/lint 결과, 브라우저 확인, 경계 케이스 등 — 실제로 한 것만)

## 3. 남은 것 / 다음 착수점
- (다음 세션이 이어받을 것. 없으면 생략)

## 4. 하드룰 (재확인, 바뀐 게 있으면만 적기)
```

- 직전 인수인계 파일을 `docs/handoff/`에서 찾아 "이전 인수인계" 링크를 정확히 건다.
- 이 문서는 승인 없이 작성해도 된다(문서 생성은 저위험). 다만 요약이 실제 커밋·검증 내용과 일치하는지 스스로 다시 확인한다.

## 3. 커밋 + 푸시

`docs/pr-guide.md` §3~4 규칙을 따른다(승인된 파일만 stage, `node_modules`/`.DS_Store`/`dist`/개인 env 제외, 시크릿 점검).

```bash
git add docs/handoff/CODEX_HANDOFF_<날짜>.md <그 외 이번에 합의된 파일>
git diff --cached --stat
git commit -m "<변경 범위를 요약한 메시지>"
npm run build
npm run lint
git push origin work
```

- 커밋은 되도록 하나로 묶는다(관련 있는 변경끼리는 쪼개지 않는다).
- 커밋 메시지·PR 본문에 AI 생성 크레딧(Co-Authored-By 등)을 넣지 않는다.
- build/lint 실패 시 진행을 멈추고 사용자에게 보고한다.
- **🚨 bare 이슈번호 금지(중대):** 이 PR은 **업스트림 공용 저장소**(`connect-AIAgentChallenge-26-1/hub`)로 올라간다. **커밋 메시지·PR 제목·PR 본문에 `#27` 같은 bare 이슈번호를 절대 쓰지 않는다** — 업스트림의 같은 번호(= **다른 참가자의 이슈**)로 자동 링크되고, 그 사람 이슈 타임라인에 "언급됨" 백링크까지 생긴다(본문을 고쳐도 이 이벤트는 남을 수 있다). 자기 포크 이슈를 참조하려면 full path(`bricepark94/hub#27`)나 전체 URL을 쓰거나, 그냥 번호 없이 기능명으로만 적는다. 커밋 직전 `git log`·본문 파일을 `grep -oE '#[0-9]+'`로 점검한다.

## 4. PR 제목·본문 초안 — 반드시 승인받기

`.github/pull_request_template.md`의 4섹션 형식을 그대로 따른다(섹션 이름·순서 변경 금지).

- **제목**: `[N077_박병관] - <이번 작업 한 문장 요약>`
- **본문** (파일로 작성, 예: `/private/tmp/claude-501/.../scratchpad/hub-pr-body.md` — 커밋 금지):

```markdown
## 주요 작업 리스트
- (1단계 커밋 목록을 근거로, 실제로 한 일만 리스트로. 검증 결과도 여기 녹여 씀)

## 내가 설명할 수 있는 부분
- (코드/설계 한 곳을 골라 왜 이렇게 했는지 1인칭으로. 오늘 실제로 판단한 근거를 쓴다)

## 아직 이해 못 한 부분
- (진짜로 남아있는 불확실한 점만. 없으면 "이번엔 특별히 없음")

## 새로 알게 된 것
- (이번 세션에서 실제로 새로 알게 된 개념·사실만. 지어내지 않는다)
```

내용은 지어내지 말고 1~3단계에서 실제로 한 일(커밋 로그, 검증 결과, 이번 대화에서 사용자와 논의한 판단)에서만 뽑는다.

**작성 후, 제목과 본문 전체를 대화창에 그대로 보여주고 승인을 요청한다.** 승인 문구가 오기 전까지 5단계로 넘어가지 않는다. 수정 요청이 오면 반영해 다시 보여준다.

**필수: 승인된 제목·본문 파일을 `gh pr create` 실행 전 아래로 반드시 점검한다** (commit-msg 훅은 커밋 메시지만 막고, `gh pr create`는 git 훅 대상이 아니라서 별도 점검이 필요하다 — 2026-07-21 이 검사 없이 PR을 올려 업스트림의 다른 참가자 이슈에 오링크된 실사고가 있었다):

```bash
echo "<승인된 제목>" | node scripts/check-no-bare-issue-refs.mjs -
node scripts/check-no-bare-issue-refs.mjs <본문 파일 경로>
```

둘 다 `✅ bare 이슈번호 없음`이 나와야 다음 단계로 진행한다. 걸리면 번호를 빼거나 `bricepark94/hub#27` 전체 경로로 고쳐 다시 점검한다.

## 5. PR 제출 (승인 후에만)

먼저 같은 head에서 이미 열려 있는 PR이 있는지 확인한다(있으면 새로 만들지 업데이트할지 `docs/pr-guide.md` §9 기준으로 사용자에게 물어본다):

```bash
gh pr list --repo connect-AIAgentChallenge-26-1/hub --head bricepark94:work --state open
```

새 PR 생성:

```bash
gh pr create \
  --repo connect-AIAgentChallenge-26-1/hub \
  --base "N077_박병관" \
  --head "bricepark94:work" \
  --title "<승인된 제목>" \
  --body-file <위 본문 파일 경로>
```

`gh`가 없거나 인증이 안 되면 `docs/pr-guide.md` §8의 웹 compare URL로 대체 안내한다.

## 6. 마무리 보고

- 생성된 PR URL
- 이번에 커밋·푸시한 파일 목록, build/lint 결과
- 이 저장소는 `.github/workflows/auto-merge.yml`이 매일 자동으로 non-main 대상 PR을 병합하므로, 리뷰 라벨이나 충돌이 없으면 **자동 병합될 수 있음**을 안내한다.
- 임시 PR 본문 파일은 정리한다(커밋되지 않았는지 재확인).

## 참고 문서

- [docs/pr-guide.md](../../../docs/pr-guide.md) — gh 명령·브랜치 규칙의 원본
- [.agents/skills/create-pr/SKILL.md](../../../.agents/skills/create-pr/SKILL.md) — Codex용 동일 워크플로우(브랜치·타깃 규칙은 이 두 문서가 항상 일치해야 함)
- [.github/pull_request_template.md](../../../.github/pull_request_template.md) — PR 본문 4섹션 원본
