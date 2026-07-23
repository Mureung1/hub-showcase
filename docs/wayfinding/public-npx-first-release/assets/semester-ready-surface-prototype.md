# Semester Ready 완료·후속 여정 표면 prototype 판정

## 범위와 evidence

이 문서는 [Ticket 012](../tickets/012-semester-ready-first-action.md)의 throwaway UI prototype에서 채택한 제품 경계만 기록한다. Prototype source와 CSS는 production 구현이 아니며 working branch로 merge하거나 그대로 port하지 않는다.

| 항목 | Evidence |
| --- | --- |
| Evidence branch | `prototype/semester-ready-surface` |
| Immutable commit | `2abecefe3626a34704c552b14404ceeed960752e` — `prototype: compare semester ready surfaces` |
| 비교 route | `/?prototype=semester-ready&variant=A\|B\|C&state=<projection>` |
| 검증 화면 | Final confirmation, working, first Ready, ready relaunch, reauth, account unavailable, transition retry, restart required, pre-admission safe discard, manual recovery, release mismatch |
| 정적 gate | Chat Shell test 38개, typecheck, build, lint, `git diff --check` 통과 |
| Visual gate | 1440 × 900 desktop viewport에서 A·B·C와 confirmation·Ready·safe-discard를 확인하고 Browser console error가 없음을 확인 |
| Human verdict | 2026-07-23 사용자가 **A → C** 조합을 선택 |
| Inherited account state | `unsupported_account`의 login·logout control은 Ticket 008이 소유한다. Prototype에 별도 visual variant를 만들지 않았으며 C는 workspace-preserved 보호 frame만 제공한다. |

Prototype은 다음 세 가설을 비교했다.

| 안 | 가설 | 판정 |
| --- | --- | --- |
| A — Guided checkpoint | Setup을 단계형 화면에서 한 번 명확히 닫으면 생성 범위와 승인 시점이 가장 잘 보이는가 | **`input_required`·`confirmation_required`·`working`에 채택** |
| B — Workbench handoff | Setup부터 Ready까지 기존 3-column frame을 유지하면 workspace가 열렸다는 감각이 강해지는가 | 기각 |
| C — Compact status center | Ready·relaunch·recovery를 같은 semester home에서 과장 없이 표현할 수 있는가 | **Ready 이후와 recovery에 채택** |

## 채택한 A → C 전환

`Codex account 연결`은 Ticket 008의 독립된 선행 화면이다. Fresh account가 연결되고 학생이 학년·학기·parent 위치를 고른 뒤부터 아래 UI 전환을 사용한다.

```text
Ticket 008 account 연결
  → A: 학년·학기·위치 확인
  → A: editable suggested folder name
  → A: 최종 확인·학기 공간 만들기 승인
  → A: coarse working
  → C: 학기 공간 준비 완료

same-version ready relaunch
  → C로 바로 진입

pending·blocked·recovery reconciliation
  → C의 recovery 상태로 진입

C에서 resume 승인
  → A: coarse working
  → C: ready 또는 다음 보호 상태
```

A의 step rail은 생성 승인 전의 위치 감각을 위한 일회성 UI다. `ready`가 되면 완료된 wizard를 계속 남기지 않고 C로 전환한다. Relaunch는 A를 다시 보여주거나 완료 ceremony를 반복하지 않는다. Fresh Ready와 ready relaunch는 모두 canonical Browser projection `ready`를 사용하며, 별도 raw receipt outcome을 Browser contract에 추가하지 않는다.

| Ticket 011 Browser projection | 화면 owner |
| --- | --- |
| `account_required/first_connection` | Ticket 008의 account 연결 화면 |
| `input_required`, `confirmation_required`, `working` | A Guided setup |
| `account_required/workspace_reauth`, `transition_blocked`, `release_blocked`, `recovery_required` | C의 보호·복구 상태 |
| `ready` | C의 semester status center |

Resume action이나 host reconciliation이 다시 `working`을 projection하면 항상 A의 coarse progress로 돌아간다. 이는 새 wizard를 시작하는 것이 아니라 기존 approved setup의 현재 작업을 같은 단계 표현으로 보여 주는 것이다. Browser reload 여부에 따른 별도 UI history를 만들지 않으므로 같은 projection은 항상 같은 화면 owner로 수렴한다.

`AccountProjection.unsupported_account`의 control과 copy는 Ticket 008이 소유한다. Workspace가 아직 없으면 Ticket 008 account 화면만 쓰고, pending 또는 active workspace를 보존해야 하면 C의 보호 frame 안에 account control을 조합한다. 두 경우 모두 explicit logout 뒤 ChatGPT reconnect만 허용하며 Ready나 discard를 합성하지 않는다.

### A — Guided setup

A는 아래 학생 선택과 App mutation 경계만 보여 준다.

- 완료된 Codex 연결, 학년·학기 선택, parent 위치 선택과 현재 `학기 공간 만들기` 단계
- `2학년 · 1학기` 같은 semester label
- Parent의 Browser-safe 표시 이름
- 수정 가능한 suggested leaf `AY-PLE-2학년-1학기`
- Server가 projection한 `문서 › AY-PLE-2학년-1학기` 같은 safe display location
- `지금은 빈 학기 공간과 AY의 기본 도움 기능만 준비합니다. 과목과 자료는 아직 만들지 않아요.`
- Primary action `학기 공간 만들기`와 secondary action `위치 다시 선택`

승인 뒤 working은 허구의 퍼센트나 durable phase 대신 `학기 공간 만들기`, `AY 기본 도움 기능 준비`, `Codex 연결 확인`의 coarse한 학생 의미만 보여 준다. 취소·discard를 제공하지 않고, Browser tab을 닫아도 operation이 취소되지 않으며 같은 exact command가 current state를 다시 확인한다는 copy를 둔다.

### C — Semester status center

C는 첫 Ready와 모든 relaunch의 기본 semester home이다.

| 영역 | Ready에서 보여 주는 내용 |
| --- | --- |
| Header | `2학년 · 1학기`와 `Codex 연결됨` |
| Validation strip | `Codex 연결 확인됨`, `학기 공간 확인됨`, `AY 작업 환경 확인됨` |
| Main status | `학기 공간 준비 완료`와 `2학년 1학기의 학기 공간과 Codex 연결을 확인했습니다.` |
| Workspace summary | Semester label, leaf folder name과 safe display location |
| Boundary copy | `과목과 자료는 학기 공간 준비 완료의 조건이 아닙니다. 학기 내용 정리는 첫 자료를 가져오는 다음 여정에서 시작합니다.` |
| Next journey | `다음 제품 여정 · COMING NEXT`, `첫 자료 가져오기`와 disabled availability copy |

Ready checklist는 `ready` invariant를 학생 언어로 풀어 쓴 것이며 Browser에 manifest·bundle·context validation boolean roster를 새로 제공하라는 뜻이 아니다. Ready 전·blocked·recovery 상태에서는 Ready checklist, current Ready workspace card와 next-journey card를 렌더하지 않는다. 대신 `만들 예정인 학기 공간` 또는 `보존된 학기 공간`과 App이 자동으로 덮어쓰거나 삭제하지 않았다는 보호 copy만 보여 준다.

Prototype에 보였던 `과목 0개 · 자료 0개` exact count는 채택하지 않는다. Ticket 011의 `ready` projection에는 count authority가 없고 Course는 zero-or-more이므로, 후속 capability가 authoritative count projection을 별도로 제공하기 전에는 완료 조건이 아니라는 경계만 표시한다.

## 후속 여정 availability

`첫 자료 가져오기`는 `Semester Ready`의 일부가 아니라 독립된 post-Ready capability다.

- 첫 public preview에 실제 import journey가 없으면 `COMING NEXT`와 `다음 공개 단계에서 열립니다`를 함께 표시하고 control을 disabled로 둔다.
- 미구현 control을 클릭 가능한 CTA로 만들거나 자료 pane 기반 workbench·Chat composer를 노출하지 않는다.
- 후속 implementation이 실제 route, admission과 recovery를 제공할 때에만 같은 card가 active CTA로 전환된다.
- Landing과 release claim은 disabled card를 shipped academic capability의 증거로 사용하지 않는다.

## Recovery와 action rendering

Browser는 Ticket 011의 Browser-safe projection과 그 projection이 명시적으로 허용한 action만 렌더한다. Copy나 current state를 보고 filesystem authority를 추론하지 않는다.

| Projection outcome | 학생용 main copy | 허용 action | 절대 제공하지 않는 것 |
| --- | --- | --- | --- |
| Pending·active workspace의 reauth | `Codex를 다시 연결해 주세요`, `학기 공간은 그대로 보관되어 있습니다` | `Codex 다시 연결` 뒤 `준비 계속하기` | Discard, 새 scaffold, 연결만으로 Ready 합성 |
| Unsupported account | `현재 연결 방식은 이 preview에서 지원하지 않아요. ChatGPT로 다시 연결해 주세요.`, workspace 보존 명시 | Ticket 008의 explicit logout → ChatGPT reconnect → `준비 계속하기` | 다른 auth 방식 fallback, discard |
| Account read unavailable | `계정 상태를 확인하지 못했어요` | `다시 확인` | Provider outage·logout·token expiry 단정 |
| Proven-safe transition retry | `학기 공간 연결을 이어갈 수 있어요` | `준비 계속하기` | Discard |
| Ambiguous close·restart required | `같은 명령으로 다시 열어 주세요` | Exact public command copy만 제공 | Same-process retry, Ready 합성 |
| Release mismatch | `이 학기 공간은 다른 AY-PLE 버전과 연결되어 있어요` | Required exact-version command | 자동 update·migration·downgrade |
| Matching app-owned pre-admission incomplete root | `만들던 학기 공간을 이어갈까요?` | `계속 만들기`, projection이 허용할 때만 `미완성 항목 안전하게 정리` | 일반 workspace 삭제 |
| Ready workspace의 missing declared support path | `AY 기본 도움 파일 일부가 빠졌어요`, workspace 보존 명시 | Explicit no-clobber recovery 뒤 fresh reverify | Discard, unrelated entry overwrite |
| Modified·extra·symlink·native-context conflict | `자동으로 바꾸지 않은 설정이 있어요`, bytes 보존 명시 | `확인 방법 보기`와 manual recovery | Discard, automatic recovery, overwrite, move, delete |

`미완성 항목 안전하게 정리`는 matching app-owned root가 아직 admission되지 않았고 Ticket 011 evidence가 safe discard를 명시적으로 허용할 때만 나타난다. Admitted workspace, valid bundle 뒤 transition pending, active Ready, modified·extra·symlink·user-authored byte에서는 동일 label이나 generic delete control도 보이지 않는다.

Reauth의 `Codex 다시 연결`은 account lifecycle만 완료한다. Fresh `connected`를 확인한 뒤 C가 기존 recovery projection을 다시 읽어 `준비 계속하기`를 제시하고, 그 user action이 opaque `recoveryId`로 `resume`을 요청한다. Resume가 `working`을 반환하면 A의 progress로 이동하고 `ready`를 반환할 때만 C의 Ready content를 연다. Unsupported account도 explicit logout·ChatGPT reconnect 뒤 같은 resume 경계를 사용한다.

## Browser-safe 표시 경계

학생 UI에 허용하는 것은 semester display label, leaf folder name, Server-projected safe display location, coarse account 상태, 제품 copy와 allowlisted action뿐이다.

다음 값은 화면, URL, Browser storage와 client log에 올리지 않는다.

- Raw canonical path와 username
- Workspace·setup·recovery ID
- `approved`, `prepared`, `active_ready`, `discard_requested` 같은 receipt phase
- `WorkspaceManifest`·bundle digest와 release identity
- Runtime generation·PID·thread·turn·login handle
- `CODEX_HOME`, credential path, token과 raw account object
- Native error, discovered project root와 ancestor context

Account chip은 fresh managed account read가 증명한 coarse state만 보여 준다. `account_unavailable`을 `OpenAI 장애`로 바꾸거나 `Codex 연결됨`을 model request·entitlement·subscription 성공까지 확대하지 않는다.

## Typography와 desktop guardrail

원래 workbench에서 발견한 10–13px 중심의 작은 글자 문제를 반복하지 않는다. 1440–1920px desktop에서 Ready 제목은 약 28–36px, 본문은 16px, helper·status는 최소 13–14px를 기준으로 한다. 11–12px uppercase는 badge·eyebrow처럼 낮은 정보 밀도의 label에만 제한한다. 이 값은 prototype CSS를 그대로 채택한다는 뜻이 아니라 downstream visual acceptance의 최소 hierarchy다.

## B를 기각한 이유

B는 setup과 Ready를 현재 3-column workbench에 바로 넣어 workspace가 열렸다는 감각은 강했다. 그러나 아직 제공하지 않는 자료 pane·AY Chat과 live action을 준비된 capability처럼 보이게 하고, 작은 pane width가 typography를 다시 압축하며, current v2 workbench를 새 v3 first-run shell의 구조 authority로 오인시킬 위험이 컸다. 따라서 public preview는 B를 쓰지 않고, 실제 post-Ready action이 구현된 뒤 C의 next-journey entry에서 해당 workbench로 이동한다.

## Downstream acceptance

Resulting spec과 implementation은 다음 관찰로 이 결정을 증명한다.

1. 최종 확인에서 student가 semester, parent display location과 editable leaf를 확인하기 전 disk mutation이 없다.
2. Ready 화면만 본 student가 `학기 공간과 Codex 연결은 준비됐지만 과목·자료는 완료 조건이 아니고 학업 action은 아직 시작하지 않았다`고 설명할 수 있다.
3. Same-version ready relaunch는 A 없이 C로 직접 진입한다.
4. Recovery 상태에서 Ready checklist·next journey·Chat composer와 허용되지 않은 discard가 보이지 않는다.
5. DOM·URL·Browser storage·client log에 raw path, receipt phase, digest, Runtime·account private identity가 없다.
6. 1440px desktop에서 본문과 helper가 위 typography hierarchy를 지키고 primary action·status가 잘리거나 겹치지 않는다.
7. Ready가 권한 없는 Course·RawMaterial count를 합성하지 않고, unsupported account는 workspace를 보존한 explicit logout·ChatGPT reconnect·resume으로 수렴한다.
