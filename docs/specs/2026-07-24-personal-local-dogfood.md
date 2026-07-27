# AY-PLE personal/local dogfood

## Agent triage

- State: draft
- Surface: local-spec
- Next actor: user
- Disposition: superseded
- Superseded by: [InteractionCapability 기반 Semantic Review](./2026-07-27-interaction-capability-semantic-review.md), [User-owned SemesterWorkspace lifecycle과 canonical local roots](./2026-07-27-user-owned-semester-workspace-lifecycle.md)

## Problem Statement

AY-PLE에는 Official Codex Python SDK를 사용하는 supervised Runtime, managed OAuth와 account lifecycle, app-owned v3 `SemesterWorkspace` setup, same-origin local host, 그리고 `SourceSelection → StatePatch → Review → confirmed SemesterModel` 학업 kernel이 있다. 그러나 이 결과는 아직 한 사람이 매일 사용할 수 있는 하나의 제품 흐름으로 연결되지 않았다.

현재 살아 있는 두 경로는 서로 다른 지점에서 끊긴다.

- `codex/product-companion-alignment`의 current-v2 앱은 실제 Chat과 First Assignment를 실행할 수 있지만 외부에서 준비한 인증과 fixture 기반 workspace에 기대며, app-owned v3 setup을 사용하지 않는다.
- `codex/public-preview-integration`의 public-preview 구현은 managed OAuth, 새 v3 workspace와 `Semester Ready`까지 도달하지만 root 개발 명령이 그 composition을 직접 실행하지 않고, Ready 이후 학업 workbench도 의도적으로 숨겨 두었다.

이전 [public npx 첫 출시 Spec](./2026-07-23-public-npx-first-release.md)은 제품 경험 검증과 public distribution readiness를 하나의 범위에 함께 넣어 Landing, npm publication, immutable Runtime release, single-instance recovery, clean-machine 증거와 publication state machine까지 포함했다. 지금 단계에서는 repository checkout에서 소유자 한 명이 사용하는 macOS local app으로 실제 학업 가치를 먼저 검증하는 것으로 충분하다. Public release의 남은 복잡성을 구현하는 것은 AY가 “나의 한 학기를 함께 관리하는 비서”가 되는지를 확인하는 데 직접 기여하지 않는다.

다음 작업은 배포 완성도가 아니라 다음 질문에 답해야 한다.

> 새 학기 공간을 만든 뒤, 내가 실제 자료를 안전하게 가져오고 Codex와 대화하며 첫 학업 action을 끝낸 다음, 앱을 다시 열어 이어서 사용할 수 있는가?

`/Users/swh/Desktop/code/2nd-1st-semester`는 이 질문과 후속 기능을 발견하는 실제 사용 경험의 근거다. 이 directory 자체를 onboarding fixture나 `SemesterWorkspace`로 채택하지 않는다. 내부에 source code, dependency, build output, audio, PDF와 여러 과목 자료가 함께 있으므로, 오히려 기존 폴더를 무차별 복사하거나 workspace로 간주해서는 안 된다는 `ImportSource` 설계 입력이다.

## Solution

Repository-local personal dogfood 경로를 다음으로 고정한다.

```text
npm run dogfood:personal
→ same-origin local AY-PLE host
→ Codex-managed ChatGPT Browser OAuth 또는 기존 managed session 확인
→ 새 v3 SemesterWorkspace scaffold 또는 마지막 Ready workspace 재개
→ Semester Ready
→ Academic Workbench
→ 기존 폴더를 read-only ImportSource로 조사
→ AY의 course/material mapping 제안
→ 사용자 검토·승인
→ 선택된 자료만 app-owned workspace 내부로 반입
→ Chat 또는 First Assignment action
→ Review·확정
→ 종료 후 같은 workspace 재개
```

새 작업선은 `codex/public-preview-integration`의 검증된 commit `f2cc550af47cf34e73491291609227062cc57a6f`에서 시작한다. Public-preview에서 만든 Runtime, OAuth, v3 admission, setup transaction, Ready UI와 same-origin host를 donor로 사용하되 public distribution을 위한 release lane은 계속 구현하지 않는다.

Personal launcher는 repository checkout, 설치된 workspace dependency와 local verified Runtime을 사용할 수 있다. Exact public `npx` package, Landing, immutable download artifact와 clean-machine support claim은 요구하지 않는다. 반면 credential authority, app-owned workspace, fail-closed validation, source 보존과 승인 전 mutation 금지는 local app에서도 낮추지 않는다.

Ready 이후에는 v3 workspace를 authority로 사용하는 `AcademicWorkbench`를 연다. Current-v2 controller/store를 다시 workspace authority로 세우지 않고, 기존 First Assignment domain behavior와 tests를 `AcademicActionPort` 뒤의 donor로 재사용한다. 첫 vertical은 범용 학기 비서 전체가 아니라 `ImportSource → 선택 자료 반입 → Chat/First Assignment → Review/확정 → relaunch`다. 이 vertical을 실제 자료로 반복 사용하면서 다음 Course, 일정, 시험, calendar와 conflict-resolution 기능을 발견한다.

## User Stories

1. As the sole user, I want repository에서 명령 하나로 AY-PLE을 실행하고 싶다, so that 매번 별도 Server, Vite와 Runtime을 조립하지 않는다.
2. As a returning user, I want 기존 managed ChatGPT session과 마지막 Ready workspace를 재사용하고 싶다, so that 매 실행마다 로그인과 setup을 반복하지 않는다.
3. As a signed-out user, I want AY-PLE 안에서 Codex-managed Browser OAuth를 시작하고 싶다, so that API key나 외부 helper를 준비하지 않는다.
4. As a new-semester user, I want 학년·학기와 위치를 고르면 AY-PLE이 정규화된 v3 `SemesterWorkspace`를 만들기를 원한다, so that 임의 폴더가 조용히 앱 데이터 구조로 바뀌지 않는다.
5. As a student with existing material folders, I want 폴더를 read-only `ImportSource`로 보여 주고 AY가 과목·자료 mapping을 제안하기를 원한다, so that 복잡한 기존 구조를 직접 다시 정리하지 않아도 된다.
6. As the owner of those files, I want 승인 전에는 source와 workspace가 바뀌지 않고 승인 후에도 원본이 그대로 남기를 원한다, so that 실험 중 자료를 잃지 않는다.
7. As a student, I want dependency, VCS, build output와 irrelevant code가 학업 자료처럼 대량 반입되지 않기를 원한다, so that 실제 semester archive를 안전하게 대상으로 삼을 수 있다.
8. As a student, I want 반입한 자료를 근거로 AY와 일반 Chat을 하거나 First Assignment action을 실행하고 싶다, so that setup 화면이 아니라 실제 학업에서 제품 가치를 확인한다.
9. As a student, I want AY가 제안한 durable 변경을 Review하고 확정하거나 수정·거절하고 싶다, so that Agent가 학기 상태를 독단적으로 바꾸지 않는다.
10. As a returning user, I want 앱을 종료하고 다시 열어도 workspace, 반입 자료와 확정된 학업 상태가 유지되기를 원한다, so that 일회성 demo가 아니라 매일 쓰는 도구가 된다.
11. As a MacBook user, I want 1440px-class 화면에서도 본문, 상태와 주요 button을 편하게 읽고 싶다, so that 7–9px 보조 글자와 불명확한 action hierarchy 때문에 사용을 포기하지 않는다.
12. As the product owner, I want 실제 dogfood에서 생긴 friction을 다음 작은 vertical의 근거로 기록하고 싶다, so that public checklist가 아니라 한 학기 사용 경험이 backlog를 이끈다.

## Current State and Constraints

### 시작점

| Surface | 현재 상태 | 이 Spec의 target |
| --- | --- | --- |
| Working base | `codex/public-preview-integration` @ `f2cc550af`는 clean이고 public-release ticket 35개 중 21개의 결과를 통합했다. | 새 `codex/personal-dogfood`가 이 commit에서 독립적으로 이어진다. |
| Local execution | Root `npm run dev`는 legacy development composition을 실행하며 새 `PublicPreviewRoot`와 Server setup composition을 end-to-end로 묶지 않는다. | `npm run dogfood:personal` 하나가 Browser UI, Server와 required Runtime을 같은 Origin에서 시작·종료한다. |
| Account | Managed OAuth와 auth-only Runtime lifecycle이 구현·검증됐다. | 외부 login helper 없이 local launcher에서 사용한다. |
| Workspace setup | v3 admission, package bundle, transaction, Ready/relaunch가 구현·검증됐다. | 새 workspace와 마지막 Ready workspace 재개를 personal app의 진입점으로 사용한다. |
| Academic kernel | Current-v2 First Assignment와 Review/durability behavior가 존재한다. | Domain behavior와 validation을 donor로 사용하되 v3 authority와 `AcademicActionPort` 뒤에 연결한다. |
| Import | 기존 directory import는 public-preview 범위에서 의도적으로 제외됐다. | Existing directory는 read-only `ImportSource`이고, 조사·제안·승인·반입 단계로 분리한다. |
| UI | Guided Setup/Compact Ready는 새 token을 사용하지만 post-Ready workbench의 typography와 hierarchy debt가 남아 있다. | Personal golden path에서 1440×900과 1920×1080 desktop usability를 함께 닫는다. |
| Public release | H1c 이후 distribution, legal, publication과 clean-machine work가 남아 있다. | 중단한다. 이 Spec의 success와 무관하다. |

### 보존된 중단점

| Ref | 의미 | 처리 |
| --- | --- | --- |
| `codex/public-preview-integration` @ `f2cc550af` | public-preview 구현의 clean integration checkpoint | historical base로 보존, 직접 계속 개발하지 않음 |
| `codex/public-preview-h1c-single-instance` @ `7708840dc` | H1c candidate와 paused correction checkpoint | merge하지 않음. Personal launcher acceptance에 필요하지 않음 |
| `codex/archive-native-context-patch-wip` @ `b565af80a` | `0010-native-context-read`를 포함한 폐기된 SDK patch 실험 | 비교·복구 증거로만 보존. 어떤 active branch에도 merge하지 않음 |
| `codex/product-companion-alignment` @ `4f758b3aa` | 실제 실행 가능한 current-v2 fallback | 새 path가 first-action parity를 얻을 때까지 보존 |

### Adopted constraints

- 한 명의 macOS 사용자와 하나의 foreground local process만 지원한다.
- Repository checkout과 `npm install`이 완료된 개발 환경을 전제로 해도 된다.
- `SemesterWorkspace` schema, validation과 migration authority는 App code가 소유한다.
- 기존 폴더는 항상 `ImportSource`다. Workspace root로 직접 채택하지 않는다.
- Import 원본은 수정·이동·삭제하지 않는다.
- Official Codex SDK/App Server의 public surface를 우선 사용한다. AY-PLE-owned bridge/adapter로 해결 가능한 기능 때문에 ordered SDK patch stack을 늘리지 않는다.
- `0010-native-context-read.patch`는 active implementation dependency가 아니다.
- Version update, v2→v3 자동 migration과 public support matrix를 설계하지 않는다.
- Mobile과 small-screen layout은 다루지 않는다. 1440×900과 1920×1080 desktop이 검증 target이다.

## Implementation Contract

### 1. Personal local composition

Root command `npm run dogfood:personal`은 하나의 foreground process graph를 소유한다.

- Local preflight는 required workspace build와 verified Runtime availability만 검사한다.
- Same-origin host는 dynamic loopback port에서 built Chat Shell과 `/api/product/*`를 제공한다.
- Browser open 실패는 Origin을 출력하되 Server를 성공으로 가장하지 않는다.
- `SIGINT`와 normal shutdown은 listener, stream과 Runtime child process를 bounded close한다.
- 이미 같은 `appDataRoot`를 사용하는 process가 있으면 clear local error로 fail closed한다. H1c의 durable singleton, stale-lease recovery와 secondary Browser handoff는 필요하지 않다.
- Root `npm run dev`의 의미를 조용히 바꾸지 않는다. Personal dogfood command를 별도 entrypoint로 둔다.

### 2. Ready → Academic Workbench

`SemesterReadyAttestation`을 통과한 admitted v3 workspace만 workbench로 전환할 수 있다.

```ts
interface AcademicActionPort {
  readProjection(): Promise<AcademicWorkbenchProjection>
  dispatch(command: AcademicWorkbenchCommand): Promise<AcademicWorkbenchProjection>
}
```

- Browser는 v2 controller, filesystem path와 raw Runtime shape를 알지 않는다.
- `AcademicActionPort`는 admitted workspace identity, active Runtime generation과 app-wide action admission을 한 번 bind한다.
- Existing First Assignment state-patch validation, Review decision과 recovery behavior는 donor다.
- Durable Course, RawMaterial, Assignment, ModelingRun, StatePatch와 UserConfirmation identity는 v3 manifest의 authoritative ID를 사용한다. Folder name은 human-readable projection일 뿐 identity가 아니다.
- Current-v2 aggregate를 v3 workspace 안에 중첩하거나 별도 source of truth로 두지 않는다.
- 첫 구현은 active workspace 하나만 다룬다. Workspace switching UI는 후속이다.

### 3. ImportSource

Import는 다음 state machine을 따른다.

```text
unselected
→ inspecting
→ proposal_ready
→ awaiting_approval
→ committing
→ imported | rejected | failed
```

`ImportSourceInventory`는 원본을 read-only로 조사한 bounded metadata다.

- Native directory picker의 absolute path와 selection authority는 Server에만 남고 Browser에는 안전한 label과 opaque selection ID만 보낸다.
- `.git`, `.worktrees`, `node_modules`, virtual environment, cache, build output와 hidden app state는 default exclusion이다.
- Symlink는 따라가지 않는다.
- Entry count, total candidate bytes, per-file bytes, scan time과 directory depth에 bound를 둔다.
- 첫 content-capable allowlist는 UTF-8 `.txt`, `.md`, `.csv`다.
- `.pdf`, audio, Office/HWP, source code와 unknown binary는 inventory에 `unsupported` 또는 `metadata_only`로 보일 수 있지만 첫 action의 content evidence로 읽거나 자동 복사하지 않는다.
- AY는 candidate Course와 material mapping, exclusion과 unsupported item을 포함한 proposal을 만든다.
- 사용자는 Course mapping과 반입 file set을 수정하고 명시적으로 승인한다.
- Commit은 선택 file을 app-owned workspace의 canonical location으로 copy한다. 원본은 그대로 둔다.
- Staging directory와 atomic manifest commit을 사용해 partial import를 authoritative state로 노출하지 않는다.
- Destination collision, source mutation, stale proposal와 duplicate command는 fail closed한다.

`/Users/swh/Desktop/code/2nd-1st-semester`는 manual dogfood 대상이 될 수 있지만 automated fixture가 아니다. 첫 smoke에서는 전체 tree를 반입하지 않고 한 과목 또는 bounded 하위 directory를 골라 exclusion, proposal과 승인 UX를 검증한다.

### 4. Chat과 첫 학업 action

Academic Workbench의 첫 surface는 다음으로 제한한다.

- active semester와 Course/material projection
- selected imported material의 source preview
- persistent AY Chat
- imported source를 사용하는 First Assignment action
- proposal/evidence, Revise·Reject·Accept Review

Generic Chat message는 곧바로 durable semester state를 바꾸지 않는다. Durable 변경은 typed proposal과 Review를 거친다. Accept된 state만 relaunch projection에 나타난다. Existing native thread/turn binding과 Runtime lifecycle은 private seam으로 유지한다.

### 5. Desktop UI foundation

- 본문은 16px 이상, helper·support text는 13–14px 이상을 기본으로 한다.
- 11–12px는 낮은 중요도의 짧은 metadata에만 허용하고 10px 이하는 사용하지 않는다.
- 한 decision group에는 명확한 primary action 하나만 둔다.
- Destructive action은 red tertiary, 수정은 neutral secondary로 표현한다.
- Pane 폭은 1440px와 1920px에서 source, transcript와 decision controls가 읽히도록 desktop `clamp()` token을 사용한다.
- Pane별 scroll ownership, keyboard focus ring, Review tab order와 hide/reopen state 보존을 유지한다.
- UI token은 Guided Setup, Ready와 Academic Workbench가 공유한다.

### 6. Failure and recovery

| Failure | Required behavior |
| --- | --- |
| OAuth cancel/expiry | workspace를 보존하고 fresh account read 뒤 reconnect surface로 돌아감 |
| Runtime start/close failure | Browser-safe error를 보이고 다른 Runtime generation을 조용히 선택하지 않음 |
| Setup interruption | 기존 v3 transaction/recovery contract로 재개하거나 명확히 중단 |
| Import scan bound 초과 | 원본과 workspace mutation 없이 범위를 줄이라는 projection 제공 |
| Import 중 process interruption | staging을 authoritative로 보지 않고 다음 실행에서 discard/recover 결정 |
| Source file changed after proposal | stale proposal로 거절하고 다시 inspect |
| Duplicate/late Review | confirmed state를 다시 바꾸지 않음 |
| Second local launch | 기존 process를 훼손하지 않고 clear conflict error |
| Relaunch | last Ready workspace와 confirmed academic state를 다시 읽음 |

## Acceptance Criteria

### Automated highest-seam trace

Chromium → same-origin local Server → deterministic Runtime → real temporary v3 filesystem을 통과하는 최소 trace가 다음을 증명한다.

1. `npm run dogfood:personal`에 대응하는 entrypoint가 dynamic local Origin을 연다.
2. signed-out account에서 login-required projection이 나오고 deterministic managed OAuth success 뒤 setup으로 이동한다.
3. 새 v3 workspace를 승인해 `Semester Ready`에 도달한다.
4. Ready에서 `Academic Workbench`로 이동한다.
5. Mixed-content fixture directory를 `ImportSource`로 inspect하면 dependency/VCS/build item이 제외되고 unsupported item이 구분된다.
6. 승인 전에는 source와 workspace 모두 바뀌지 않는다.
7. 승인한 text material만 workspace에 반입되고 source bytes는 그대로다.
8. 반입 material을 사용하는 First Assignment proposal을 Revise한 뒤 Accept하면 confirmed state가 생긴다.
9. Browser와 host를 종료하고 다시 실행하면 같은 Ready workspace, imported material과 confirmed state가 복원된다.
10. stale import proposal, invalid evidence와 duplicate/late Review는 mutation 없이 fail closed한다.
11. 종료 뒤 Runtime child process와 listener가 남지 않는다.

### Verification gates

- Relevant unit/integration tests
- `npm test`
- `npm run typecheck`
- `npm run build`
- `npm run lint -w @ay-ple/chat-shell`
- Personal golden-path Browser E2E
- 1440×900 및 1920×1080 manual desktop dogfood
- 한 번의 live managed OAuth + bounded real-material smoke

Live smoke는 automated green을 대체하지 않는다. `/Users/swh/Desktop/code/2nd-1st-semester` 전체를 test fixture로 복사하거나 repository에 기록하지 않는다.

## Implementation Slices and Blocking Order

| Slice | Outcome | Blocks |
| --- | --- | --- |
| P0 Local composition | `dogfood:personal`이 integrated OAuth/setup/Ready graph를 실제로 실행·종료 | P1, P4 |
| P1 Workbench admission | Ready attestation에서 v3-authoritative `AcademicActionPort`로 진입 | P2, P3 |
| P2 ImportSource inventory | Bounded read-only scan, exclusion과 editable mapping proposal | P3 |
| P3 Approved import + first action | Atomic copy, v3 material identity, Chat/First Assignment와 Review | P4 |
| P4 Relaunch and recovery | confirmed state 재개, import interruption/stale/duplicate failure closure | P5 |
| P5 Desktop foundation + real dogfood | typography, hierarchy, two desktop viewports와 bounded real-material smoke | 완료 판단 |

P0와 P1 contract fixture를 먼저 고정한다. P2의 scan engine과 P1의 Browser workbench shell은 frozen contract 이후 병렬로 구현할 수 있다. Public-release branch의 H1c, R2b/R2c, H1d, I0, G0–G1, I1–I2와 P1 publication ticket은 이 DAG의 dependency가 아니다.

## Out of Scope

- Public Landing과 public repository 전환
- npm publication, public `npx`, GitHub Runtime release와 release candidate ledger
- Legal/provenance roster, distribution trust surface와 clean-machine support claim
- H1c durable single-instance/stale-lease recovery와 H1d production-host hardening
- Public publication, rollback, updater와 version migration
- `.app`, `.dmg`, code signing과 notarization
- v2→v3 자동 migration
- 여러 사용자, 여러 account와 workspace switching UI
- Mobile/small-screen responsive layout
- PDF text extraction, OCR, HWP/Office parsing, audio transcription과 source-code understanding
- Calendar provider integration, 알림, 시험 conflict 자동 조정
- `2nd-1st-semester` 전체 tree의 자동 archive 또는 golden fixture화

## Further Notes

- 이 Spec은 historical public-release 결정과 구현을 삭제하지 않는다. 다만 현재 active product scope와 다음 작업 순서는 이 문서가 대체한다.
- Public distribution을 다시 원할 때는 [public npx 첫 출시 Spec](./2026-07-23-public-npx-first-release.md)의 남은 release lane을 현재 personal implementation에 맞춰 다시 audit해야 한다. 지금 미리 호환성을 유지하지 않는다.
- 첫 vertical 이후 backlog 우선순위는 dogfood 관찰로 정한다. 모델·reasoning effort 설정, workspace switching, Course lifecycle, calendar와 exam management는 실제 반복 friction이 확인될 때 각각 작은 vertical로 승격한다.
- 이 문서의 P0–P5와 `codex/personal-dogfood` 시작점은 실행하지 않는다. Current ticketing sources는 위 `Superseded by`에 연결한 두 Spec이다.
