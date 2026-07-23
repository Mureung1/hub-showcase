# 012 — Semester Ready 완료와 후속 여정 진입 표면을 검증한다

## Wayfinder ticket

- Type: prototype
- State: resolved
- Blocked by: [첫 public preview의 성공 여정을 고정한다](004-first-public-preview-success-journey.md), [Browser-launched Codex OAuth lifecycle을 설계한다](008-browser-oauth-lifecycle.md), [첫 public release의 SemesterWorkspace schema·scaffold 경계를 정한다](009-semester-workspace-admission.md), [재개 가능한 setup과 workspace instruction/Skill bundle의 authority를 정한다](010-resumable-setup-authority.md), [Bootstrap과 setup의 durability·recovery contract를 확정한다](011-bootstrap-and-setup-recovery.md)

## Question

첫 `npx` 실행과 setup을 마친 학생에게 `Semester Ready`를 `학기 공간 준비 완료`로 정직하게 전달하려면 어떤 account connection, 학년·학기·위치, `WorkspaceManifest`·workspace instruction/Skill bundle validation, active workspace와 recovery 정보를 보여야 하는가? Ticket 010의 editable suggested folder name·최종 확인, bundle drift와 effective-native-context conflict의 action block을 어떤 Browser state·copy로 표현해야 하는가? Ticket 011의 Browser-safe `account_required`, `working`, `transition_blocked`, `release_blocked`, `recovery_required`, `ready` projection만 소비하고 raw receipt phase·canonical path·digest·Runtime identity를 UI contract로 올리지 않으면서, admitted workspace와 valid bundle은 있지만 Runtime transition·fresh account read가 끝나지 않은 pending 상태에서 scaffold discard를 제시하지 않고 transition retry, reauth와 account/Runtime unavailable을 어떻게 구분할 것인가? Course·RawMaterial·live model turn·학업 action을 완료 조건처럼 오인시키지 않으면서 `첫 자료 가져오기`를 후속 독립 여정으로 넘기는 onboarding·workbench 경계와 copy를 어떤 prototype으로 검증할 것인가?

## Answer

Evidence branch `prototype/semester-ready-surface`의 immutable commit `2abecefe3626a34704c552b14404ceeed960752e`에서 A Guided checkpoint, B Workbench handoff, C Compact status center와 11개 setup·Ready·recovery 상태를 비교했다. Chat Shell test 38개, typecheck, build, lint와 1440 × 900 Browser visual gate를 통과했고, 2026-07-23 사용자가 **A → C** 조합을 선택했다. Prototype source와 CSS는 production branch로 merge하지 않는다.

채택안은 Ticket 011의 `input_required`·`confirmation_required`·`working`에 A의 일회성 guided setup을 사용하는 것이다. `account_required/first_connection`은 Ticket 008의 선행 화면이 계속 소유한다. `ready`가 되면 완료 step rail을 남기지 않고 C의 semester status center로 전환하고, `account_required/workspace_reauth`·`transition_blocked`·`release_blocked`·`recovery_required`도 C에서 Ready checklist와 next journey를 숨긴 보호 상태로 표현한다. C의 resume 뒤 `working`이 나오면 기존 setup의 A progress로 돌아가고 완료 뒤 다시 C로 전환한다. Same-version ready relaunch는 A나 완료 ceremony를 반복하지 않고 C로 바로 진입한다. Fresh Ready와 relaunch를 구분하기 위한 raw receipt outcome을 Browser contract에 추가하지 않는다.

C는 `학기 공간 준비 완료`, semester label, leaf folder name, Server-projected safe display location, `과목과 자료는 Ready 완료 조건이 아님`이라는 경계와 `Codex 연결 확인됨`·`학기 공간 확인됨`·`AY 작업 환경 확인됨`의 학생용 의미만 보여 준다. Ticket 011의 `ready` projection에 없는 Course·RawMaterial count를 합성하지 않는다. Ready는 live Turn·학업 action이나 AY가 학기를 이해했다는 뜻도 아니다. 첫 public preview에 실제 import journey가 없으면 `첫 자료 가져오기`는 `COMING NEXT`와 availability copy가 붙은 disabled surface이며, 실제 post-Ready capability가 구현되기 전에는 자료 pane 기반 workbench·Chat composer나 clickable CTA를 노출하지 않는다.

Recovery action은 Ticket 011의 Browser-safe projection이 명시적으로 허용한 것만 렌더한다. Reauth, unsupported account, account unavailable, proven-safe transition retry, restart required, release mismatch, missing declared support path와 modified-byte manual recovery를 서로 다른 copy·action으로 표현한다. Admission을 통과했거나 valid bundle 뒤 Runtime transition을 기다리는 pending workspace에는 discard를 제공하지 않는다. `미완성 항목 안전하게 정리`는 matching app-owned pre-admission incomplete root에서 projection이 explicit하게 허용할 때만 보인다. Reauth는 `Codex 다시 연결` 뒤 별도 `준비 계속하기`로 `resume`하고, 연결만으로 Ready를 합성하지 않는다. Raw canonical path, receipt phase, manifest·bundle digest, Runtime·thread·account private identity는 Browser에 올리지 않는다.

B는 아직 제공하지 않는 자료 pane·AY Chat과 live action을 준비된 capability처럼 보이게 하고 current v2 workbench를 v3 first-run shell의 authority로 오인시킬 위험 때문에 기각했다. 상세 screen hierarchy, copy, recovery matrix, typography guardrail과 downstream acceptance는 [Semester Ready 완료·후속 여정 표면 prototype 판정](../assets/semester-ready-surface-prototype.md)에 기록했다.
