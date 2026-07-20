# Current adapter representative trace

이 문서는 Wayfinder ticket `006`의 throwaway prototype 결과다. [004 runtime envelope](../tickets/004-first-assignment-runtime-envelope.md#answer)가 요구한 first-vertical runtime outcome을 [005 overlap 가설](first-vertical-runtime-overlap.md)에 따라 검증한다. Production runtime·제품 DB·Browser contract를 구현하거나 최종 `Assignment` schema를 채택하지 않는다.

> **2026-07-19 후속 범위 정정:** [Codex 실행 권한과 AY-PLE 제품 확인 경계](codex-execution-permission-boundary.md)에 따라 raw report의 `confirmed_residual`/exit `2`와 synthetic default `accept` 관찰은 그대로 보존한다. 다만 당시 fail-closed assertion은 더 이상 first-vertical product invariant가 아니다. 이 관찰은 008의 native permission disposition 입력이며 reject patch·SDK extension·narrow port를 자동 요구하지 않는다.

## 결론

- Frozen current adapter의 exact bundle, native acceptance·terminal·interrupt, process-loss settlement, bounded process-group cleanup과 fresh restart는 기존 actual-child trace에서 충족됐다.
- Official Python SDK direct seam은 versioned `SkillInput`, 선택한 두 TXT의 Markdown link·path text, strict `outputSchema`와 completed result를 한 turn에 결합할 수 있었다. Local probe와 live-provider 3회 모두 schema·selected-source·exact-quote validation을 통과했다.
- Account·workspace·Recipe·source preflight, in-memory `ModelingRun` receipt, final JSON·source-reference validation과 accepted-loss의 product `unknown` projection은 Codex가 아니라 first vertical의 얇은 adaptation으로 남는다. 이 prototype은 그 adaptation을 증명했지만 target API나 persistence schema로 승격하지 않는다.
- Historical harness에서 유일하게 실패한 assertion은 unexpected command/file approval이었다. Exact high-level Python SDK의 low-level default handler는 injected request 두 family에 `accept`를 반환했고, effective `never + readOnly + networkAccess:false`와 side-effect marker 비발생은 별도로 충족됐다.
- 최종 prototype status `confirmed_residual`, exit code `2`는 당시 harness contract의 immutable 결과다. Active interpretation에서 default `accept`는 제품 blocker가 아니라 current fixed bridge profile과 함께 008이 판정할 native permission evidence다.

## Evidence provenance와 실행 경계

| 항목 | 고정한 evidence |
| --- | --- |
| Evidence branch | `prototype/first-vertical-runtime-trace` |
| Base | `4e2ffb99bf0a669c987206d99ba14c6fce261155` — working branch에서 006을 `claimed`로 고정한 commit |
| Prototype commit | `fbc9efdd1e6f06fd5f3da60dac344ddd1704ee2c` — `prototype: capture first vertical runtime trace` |
| Exact native source | `openai/codex@8c68d4c87dc54d38861f5114e920c3de2efa5876`, `rust-v0.144.4`, `codex-cli 0.144.4` ([provenance ledger](../../../../packages/codex-chat-runtime/upstream/UPSTREAM.md)) |
| Official SDK | Package-owned exact SDK distribution `0.0.0.dev0`, ordered patches `0001`–`0005`, patch stack SHA-256 `a8fcb62ca1838930f9e3b6dad5e345fab3724e609d005b77a0bde6c97b4a6015` |
| Python artifact | Standalone Python `3.10.18`, build `20250818` |
| Stored report | Prototype commit의 `packages/codex-chat-runtime/prototypes/first-vertical-runtime-trace/report.json`; `status`, exact pins와 sanitized check outcome만 포함 |

Prototype source와 fixtures는 working branch에 merge하지 않았다. Evidence는 다음처럼 다시 볼 수 있다.

```bash
git show --stat fbc9efdd1e6f06fd5f3da60dac344ddd1704ee2c
git show fbc9efdd1e6f06fd5f3da60dac344ddd1704ee2c:packages/codex-chat-runtime/prototypes/first-vertical-runtime-trace/report.json
```

Login command는 official SDK `login_chatgpt()`를 사용했다. Gitignored `.artifacts/prototype-first-vertical-auth/`에 file-store auth seed만 남기고, ambient `~/.codex`와 ambient API credential을 사용하지 않았다. Credential value·digest, OAuth URL/token, raw provider response와 native thread·turn·item identifier는 evidence branch와 sanitized report에 기록하지 않았다. Prototype-only receipt는 raw protocol과 실행 때 조합된 전체 prompt를 저장하지 않는다.

각 live run은 auth seed에서 credential만 exclusive copy하고 workspace·`HOME`·`CODEX_HOME`·SQLite·temp·native session을 새로 만들었다. 세 run이 끝난 뒤 per-run root와 process tree를 제거했으며 persistent auth seed만 local ignored state로 남겼다.

## Fixture와 prototype-only contract

| Fixture | 역할 |
| --- | --- |
| `lms-outline-notice.txt` | 선택 source 1. 과제명과 제출 방식을 제공한다. |
| `problem-solving-syllabus.txt` | 선택 source 2. 과목 맥락과 마감을 제공한다. |
| `unselected-control.txt` | 선택되지 않은 거짓 과제명·마감. 결과 또는 evidence에 섞이면 실패하는 negative control이다. |
| `assignment-extractor/SKILL.md` | Prototype-only versioned Recipe. Exact `SkillInput` body가 한 번만 주입되는지 검증한다. |
| `output-schema.json` | `title`, `dueAt`, `submissionMethod`, selected source path·field·exact quote를 가진 `evidence[]`만 허용하는 strict schema다. |

이 output shape는 final product `Assignment` schema가 아니다. In-memory `ModelingRun` receipt도 Recipe version, selected source digest, opaque execution correlation, terminal과 validation outcome만 기록한다. Raw protocol·전체 prompt·native identifier는 저장하지 않으며 explicit retry는 기존 receipt를 덮어쓰지 않고 새 receipt와 새 native turn을 만든다.

## Layer별 representative trace

| Layer | 관찰한 trace | 판정 |
| --- | --- | --- |
| Deterministic admission | Account not-ready, invalid workspace·Recipe·selection과 missing selected source는 native start count `0`으로 끝났다. | `satisfied` |
| Deterministic receipt·settlement | 한 receipt가 한 accepted native turn과 한 authoritative terminal에 연결됐다. Pre-accept known failure, accepted loss의 `unknown`, native failure와 completed terminal을 구분했다. | `satisfied` |
| Deterministic interrupt | Interrupt acknowledgement 뒤 receipt는 `stopping`에 머물고 matching interrupted terminal 뒤에만 settled가 됐다. | `satisfied` |
| Deterministic retry | 자동 retry count는 `0`이며 explicit retry는 새 receipt·opaque correlation·native turn을 만들었다. | `satisfied` |
| Deterministic validation | Malformed JSON, schema mismatch, unselected source path, quote/value/date mismatch를 native failure가 아닌 product validation failure로 분류했다. | `satisfied` |
| Frozen adapter bundle | Exact source/native/SDK/patch manifest와 complete bundle roster를 검증했다. | `satisfied` |
| Frozen adapter actual child | Explicit `cwd`, native acceptance·terminal·interrupt, response loss·accepted process loss와 bounded close/process-group settlement를 통과했다. | `satisfied` |
| Frozen adapter local provider | Production bundle → Python bridge → official SDK → exact native child의 policy·interrupt·follow-up·cleanup regression을 통과했다. | `satisfied` |
| Exact-local semantic seam | `SkillInput` body 1회, 두 selected TXT의 Markdown link·path text와 strict `outputSchema`가 upstream turn request에 적용됐다. | `satisfied` |
| Selected-source result | Local completed result가 schema, selected source membership과 exact quote validation을 통과했다. Unselected control의 본문·거짓 사실은 tool continuation에 없었고, control path·사실은 결과 evidence에 없었다. | `satisfied` |
| Permission posture | Effective `approvalPolicy=never`, `sandbox=readOnly`, `networkAccess=false`를 관찰했고 write·network marker가 생기지 않았다. | `satisfied` |
| Synthetic unexpected approval | Injected command approval과 file-change approval에 current SDK default handler가 모두 `accept`를 반환했다. Fake request라 실제 side effect는 없었다. Historical harness는 이를 `residual`로 분류했지만 active product invariant는 아니다. | `observed` |
| Live provider run 1 | Fresh roots와 distinct opaque native correlation에서 completed, schema-valid, selected-source-linked result와 clean SDK shutdown을 확인했다. | `satisfied` |
| Live provider run 2 | Run 1 state를 재사용하지 않고 같은 invariant를 충족했다. | `satisfied` |
| Live provider run 3 | Run 1·2 state를 재사용하지 않고 같은 invariant를 충족했다. | `satisfied` |
| Three-run reproducibility | 세 sequential run이 수동 복구 없이 distinct native correlation, authoritative terminal, result validation과 cleanup을 모두 충족했다. | `satisfied` |

최종 report에는 `blocked`가 없다. Auth seed가 없는 사전 실행은 fallback·skip 없이 `blocked`/exit code `3`으로 끝났고, harness contract는 materialized exact runtime 부재도 같은 상태로 분류한다. `harness_error`는 prototype 자체 contract·process 오류만 뜻하며 exit code `1`이다.

## SourceSelection·Recipe·structured result 판정

005의 가장 좁은 path/link 가설은 기각되지 않았다.

1. Product preflight가 두 selected TXT의 canonical workspace-relative path와 digest를 고정했다.
2. Initial SDK input은 versioned `SkillInput`과 두 selected path의 Markdown link·명시적 path text를 한 번 전달했다.
3. Local journal에서 두 selected source의 내용이 tool continuation을 통해 model boundary에 도달했고, unselected control의 본문·거짓 사실은 도달하지 않았음을 확인했다.
4. Strict `outputSchema`가 upstream request에 존재했고 completed final response를 JSON parse·schema·selected-source·exact-quote validator가 다시 확인했다.
5. Workspace에 존재한 unselected control의 거짓 사실과 path는 result·evidence에 나타나지 않았다.

이 결과는 Markdown link가 generic local-file attachment protocol이라는 뜻이 아니다. First vertical의 selected path를 explicit `cwd`에서 읽게 하는 evidence-backed client convention이 충분했다는 뜻이다. Recipe version/arguments, SourceSelection receipt와 final reference validation은 계속 product-owned adaptation이다.

## Permission 관찰의 정확한 범위

Normal live·local path에서 unexpected approval이 실제 발생한 것은 아니다. Negative control이 exact SDK client를 fake App Server에 연결해 command/file approval request를 강제로 보냈고, high-level client의 default response가 `accept`임을 관찰했다. 그러므로 다음 두 사실을 섞지 않는다.

| 사실 | 판정 |
| --- | --- |
| Normal turn에 전달한 effective policy와 side-effect marker | `never + readOnly + networkAccess:false`, write/network marker 없음 |
| Policy assumption을 위반해 synthetic request가 도착했을 때 client response | command·file 모두 default `accept`; current-pin fallback 관찰 |

006은 SDK patch나 production adapter를 수정하지 않았다. 008은 proposal-only AY-PLE product effect와 native Codex execution permission을 분리하고, current bridge의 fixed `deny_all + read_only`, desired permission profile·설정 소유자와 actual request projection을 판정한다. 그 뒤에도 public seam에 gap이 확인될 때만 explicit reject·extension·port를 검토한다.

## 실행한 command와 결과

| Command | 결과 | 증명 범위 |
| --- | --- | --- |
| `npm run prototype:first-vertical:login -w @ay-ple/codex-chat-runtime` | `passed`, exit `0` | Isolated file-store ChatGPT auth seed와 fresh-client readiness. Credential·OAuth URL 비기록 |
| `npm run prototype:first-vertical -w @ay-ple/codex-chat-runtime` | `confirmed_residual`, exit `2` | 당시 harness assertion 기준 결과. Deterministic, bundle, frozen actual/local, exact-local semantic·permission과 live 3회 실행·sanitized report·cleanup을 한 command로 수행 |
| `npm run verify:production-runtime -w @ay-ple/codex-chat-runtime` | `verified` | Exact materialized bundle과 complete roster |
| `npm run test:node-unit -w @ay-ple/codex-chat-runtime` | 51/51 pass | Runtime contract, strict routing·settlement와 bundle verifier regression |
| `npm run test:bridge-unit -w @ay-ple/codex-chat-runtime` | 5/5 pass | Bridge exact decode, bounds와 admission regression |
| `npm run test:node-actual -w @ay-ple/codex-chat-runtime` | 53/53 pass | Actual process/native identity·interrupt·loss·deadline·cleanup regression |
| `npm run test:local-provider -w @ay-ple/codex-chat-runtime` | 최종 1/1 pass | Exact native local-provider policy·lifecycle regression |
| Direct strict TypeScript `tsc --noEmit` | pass | Prototype TypeScript 세 파일의 strict contract |
| Ruff check·format | pass | Prototype Python 두 파일의 lint·format |
| `git diff --check` | pass | Evidence branch diff whitespace |

Standalone `test:local-provider`의 첫 post-live 실행은 assertions 전후의 semantic failure가 아니라 cleanup existence probe `waitForProcessGroupExit`의 `process.kill(..., 0)`에서 일회성 `EPERM`으로 종료됐다. 같은 gate는 통합 prototype 안에서 이미 통과했고 즉시 단독 재실행도 1/1 통과했으며 재현되지 않았다. 이를 confirmed runtime residual로 승격하지 않되, 반복되면 별도 flake/cleanup diagnosis가 필요하다는 verification caveat로 보존한다.

## 008 handoff

006은 `keep | replace | delete`를 확정하지 않는다. 다음 frontier는 아래 evidence를 함께 사용해 adopted local-web path의 disposition을 결정한다.

| Current responsibility·seam | 006이 확인한 사실 | 008이 결정할 것 |
| --- | --- | --- |
| Exact bundle·controlled child·bounded supervisor | Representative lifecycle·settlement와 fresh restart를 충족 | Current custom implementation을 `keep | adapt | replace | delete` 중 어디에 둘지 |
| Official SDK semantic input | Skill·selected TXT path/link·`outputSchema`와 live result가 충족 | Product invocation에 연결할 최소 adaptation 경계 |
| Product validation·receipt | Throwaway in-memory seam이 admission, receipt, unknown, retry와 result validation을 충족 | Resulting spec에 필요한 observable contract만 채택하고 prototype schema·Module은 폐기 |
| Native permission posture | Synthetic request에 high-level path의 low-level default `accept`를 관찰했고 normal local/live turn에는 approval request가 없었음 | Current fixed bridge profile의 생존 여부, desired native permission 설정·사용자 선택과 request projection. 선택 후 actual public-seam gap이 있을 때만 patch·port 검토 |
| Current Chat Server·Browser tracer | 이번 trace에 사용하지 않았고 Browser E2E도 실행하지 않음 | First-vertical product surface에 필요한 범위가 확인되기 전 일반 Chat 기능을 추가하지 않음 |

전체 Browser product E2E는 이 runtime trace의 대체물이 아니다. Resulting first-vertical spec 이후 자료 선택, Browser adapter, `StatePatch`, Review·`UserConfirmation`과 `SemesterModel` persistence를 연결한 별도 gate로 반드시 수행한다.

## Exclusions

- Production runtime, Server·Browser route와 package public Interface를 변경하지 않았다.
- `StatePatch`, Review·`UserConfirmation`, `SemesterModel`, 제품 DB와 3-pane UI를 구현하지 않았다.
- Final `Assignment` schema, persistence owner, API·Module graph를 결정하지 않았다.
- First-party host를 runtime 후보로 다시 열거나 general Chat catalog·replay·two-client surface를 검증하지 않았다.
- Synthetic default approval 관찰을 prototype 안에서 수정하거나 008의 native permission disposition을 선결하지 않았다.
