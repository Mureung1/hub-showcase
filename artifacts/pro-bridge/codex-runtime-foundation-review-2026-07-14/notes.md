# Codex-native Runtime Foundation Pro review packet

## 상태

| 항목 | 값 |
| --- | --- |
| 준비 상태 | ChatGPT Pro 1·2차 review 완료, accepted correction 반영 완료 |
| AY-PLE baseline | `ec484901c747e593ccb01484a16af8acecf4ede4` |
| Correction fixed point | `bb2381d6` (`docs: align runtime correction contract`) |
| Codex npm pin | `@openai/codex@0.144.0` |
| Exact upstream commit | `767822446c7a594caa19609ca435281a9ec67e0d` |
| External answers | `answer-1.md`, `answer-2.md` 원문 보존 |

이 packet은 구현 전에 architecture/spec과 implementation graph를 독립적으로 falsification하기 위한 것이다. 기존 Pro 연구 답변에 anchoring되지 않도록 1차 review에는 `artifacts/pro-bridge/0714-chat/answer.md`를 첨부하지 않는다.

## 최종 disposition

2차 재심은 1차의 `not implementation-ready`를 `ready with required corrections`로 바꿨다. Accepted finding과 canonical 반영 결과는 다음과 같다.

| Disposition | Finding |
| --- | --- |
| 구현 전 P1 correction | F-01 writer cancellation/handoff, F-02 Server response capacity, F-07 exit/stdout drain |
| 함께 반영한 P2 correction | F-09 scope-local deadline ordering, F-10 pre-decode byte framing, F-14 implementation graph |
| 문구·oracle 보강 | F-06 dispatch non-await, F-11 unknown notification, F-16 Ticket 004 causal-root wording |
| 철회 | F-03, F-04, F-05, F-08, F-12, F-13, F-15 |

Canonical [runtime foundation spec](../../../docs/specs/2026-07-14-codex-native-runtime-foundation.md)과 [ADR 0010](../../../docs/adr/0010-separate-codex-app-server-connection-from-conversation-runtime.md)에 correction을 반영했다. Exact-byte control reservation은 exact RequestId를 넣어 실제 encode한 후보 중 최대 크기만 예약하고, timeout marker는 observation FIFO와 별도인 owner-local reserved slot을 사용한다. 반영 diff는 `ec484901...bb2381d6`이며 independent Source·Standards·Spec fixed-point review는 각각 0 findings였다.

이 packet은 decision authority가 아니라 review provenance다. Current contract는 위 canonical spec과 ADR이 소유하고, raw answer의 철회된 제안은 active target으로 재해석하지 않는다.

## 제출 순서

1. ChatGPT에서 이 review가 여러 차례 이어질 예정이면 새 Project를 만든다.
2. 아래 **1차 첨부 manifest**의 네 파일과 `question-1.md`를 첨부한다.
3. 새 chat에서 `question-1.md`의 본문을 prompt로 보낸다.
4. 답변을 요약하거나 수정하지 않고 `answer-1.md`로 저장한다.
5. AY-PLE 쪽에서 finding을 exact pinned source와 current code에 대조한다.
6. 실제 finding과 missing evidence만 모아 2차 source-fidelity prompt를 새 `question-2.md`로 작성한다.

서로 다른 outcome은 별도 chat으로 나눈다.

- Chat 1: Blind architecture/spec falsification
- Chat 2: Exact-pin source fidelity와 evidence audit
- Chat 3: Finding remediation 뒤 fixed-point re-review

## 1차 첨부 manifest

| Upload name | Repository path | SHA-256 | 역할 |
| --- | --- | --- | --- |
| `0010-separate-codex-app-server-connection-from-conversation-runtime.md` | `docs/adr/0010-separate-codex-app-server-connection-from-conversation-runtime.md` | `2d2ed4cca09dc76cf340a64c293bdf274c38d9667bdcdf874543e6e2d973f356` | Architecture boundary와 evidence authority |
| `2026-07-14-codex-native-runtime-foundation.md` | `docs/specs/2026-07-14-codex-native-runtime-foundation.md` | `fde40a2cf845f9c83019abde22c2fd2985934ca8ad42df294473ed1bc5d928b0` | Target implementation contract |
| `map.md` | `docs/wayfinding/codex-native-client-redesign/map.md` | `241ced208b1b7e5e28080046fc0cf0e6d33412397f5f0d1c9cee0e53b3cab0b0` | Decision history와 supersede 관계 |
| `README.md` | `packages/runtime-codex/README.md` | `53f5825f4f141baa98d0ddefd67f67a5ab98777482a653235eca77674a9c98e0` | Current implementation과 target 차이 |

`question-1.md` 자체도 함께 첨부하지만 prompt는 파일에 맡기지 말고 본문을 user message로 붙여 넣는다.

## 1차에 첨부하지 않을 것

| 제외 자료 | 이유 |
| --- | --- |
| `artifacts/pro-bridge/0714-chat/answer.md` | 같은 model 계열의 기존 결론에 anchoring될 수 있음 |
| 전체 repository archive | Architecture review를 code search와 style review로 희석할 수 있음 |
| 기존 Host 전체 test suite | Target contract보다 legacy oracle을 정답으로 취급할 수 있음 |
| Future AYPLE adapter/product 문서 | Foundation readiness와 제품 결정을 다시 결합할 수 있음 |

## 2차 source-fidelity 첨부 후보

1차 finding 중 upstream behavior, ownership 또는 verification authority를 실제로 다투는 항목에만 아래 자료를 추가한다.

| Repository path | SHA-256 | 역할 |
| --- | --- | --- |
| `docs/wayfinding/codex-native-client-redesign/assets/004-method-lifecycle-fact-table.md` | `9be4b15568fd43c15aaa7157b60c6fb13464886db15311284a8570233379f482` | Method별 response/notification/identity/terminal evidence |
| `docs/wayfinding/codex-native-client-redesign/assets/005-first-party-connection-ingress-architecture.md` | `9a265863eb80415a36520e32194e4efe4b4a1b2b3386702f57a83f22153ed401` | Python/Rust Connection ownership 근거 |
| `docs/wayfinding/codex-native-client-redesign/assets/006-first-party-conversation-ownership.md` | `6f430731f8b03dc00fd36e397b0b53a74ae2789b2f3df5be78d159560d6c4db4` | TUI/per-thread projection 근거 |
| `docs/wayfinding/codex-native-client-redesign/assets/013-source-conformance-and-ledger-evidence.md` | `d76dfa06ea2b0331f592cb5a932bebdb2631af4a1058cfda6d5599c6ef0787fb` | Oracle와 ledger promotion 기준 |
| `docs/wayfinding/codex-native-client-redesign/assets/014-host-removal-and-selective-salvage-plan.md` | `3eff6b24cc6ad09027fad13fd637c94e43202f5e15da33d9c23ae8513f1733ea` | Expand–migrate–contract 계획 |
| `docs/wayfinding/codex-native-client-redesign/assets/019-first-party-client-port-and-reuse-audit.md` | `55f2d7abdbb7708827b41cf85c55a57983e82d83c12022bda64627133aba4476` | Current code 처리와 과잉 정책 supersede |

2차에서는 model이 exact upstream commit URL 또는 첨부 source evidence의 claim-level citation을 제시하도록 요구한다. Latest `main`의 사실은 별도 upgrade option으로만 인정한다.

## 외부 답변 intake checklist

답변을 반영하기 전에 finding마다 다음을 기록한다.

| 질문 | 판정 |
| --- | --- |
| Exact pinned source 또는 generated shape로 검증되는가? | `verified fact | contradicted | missing evidence` |
| 실제 execution trace가 있는가? | `reproducible | plausible only | absent` |
| Upstream baseline인가, TypeScript hardening인가? | `upstream | inference | TS hardening | product policy` |
| Owning artifact가 정확한가? | `ADR | spec | ticket graph | code | test | none` |
| 구현 전에 고쳐야 하는가? | `blocking | follow-up | reject` |

Pro 답변은 결정 authority가 아니다. Source로 검증되는 사실, 설계를 깨뜨리는 재현 가능한 반례와 missing evidence만 owning artifact에 환류한다.

## 2차 prompt 작성 규칙

- `answer-1.md`의 모든 제안을 다시 묻지 않는다.
- Blocking 또는 source-sensitive finding만 번호를 유지해 인용한다.
- 각 finding에 대해 `accepted | disputed | needs evidence`인 AY-PLE 판정을 함께 제공한다.
- Source link는 exact commit에 고정한다.
- 수정된 fixed point가 생기면 old/new 문구를 함께 제공한다.
- 2차 결과도 원문 그대로 `answer-2.md`에 보존한다.
