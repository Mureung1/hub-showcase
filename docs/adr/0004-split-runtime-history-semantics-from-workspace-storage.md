# Runtime history 의미와 workspace storage 구현을 분리한다

분류: 활성

성숙도: 채택

범위: Runtime Harness 한정

Runtime Diagnostic History는 server 재시작을 견디는 bounded developer diagnostic data다. Lifecycle 의미와 저장 구현이 여러 module로 흩어지지 않도록 `runtime-core`가 persistence seam과 recovery semantics를 소유하고, `apps/server`가 workspace 환경에 맞는 concrete storage adapter를 조립한다.

## 결정

- `runtime-core`는 RuntimeRunLog를 저장하고 불러오기 위한 작은 persistence interface를 정의한다.
- `AgentRuntimeKernel`은 lifecycle snapshot을 언제 저장할지와 재시작 후 non-terminal run을 어떻게 복구할지 결정한다.
- 영속 record는 normalized lifecycle과 `debugLog`를 포함한 self-contained RuntimeRunLog다.
- 재시작 시 남아 있는 `running` 또는 `cancelling` run은 partial output과 debug evidence를 보존한 채 normalized `failed` 상태로 닫는다.
- `apps/server`는 repository-local developer diagnostic store, retention 설정과 per-run JSON snapshot adapter를 소유하고 kernel에 주입한다.
- Snapshot은 versioned envelope로 저장하고 같은 directory의 임시 파일을 flush한 뒤 canonical file로 rename해 run 하나의 snapshot을 atomic하게 교체한다.
- Kernel은 UUID 기반 run ID를 사용하고, 저장된 history의 hydration과 non-terminal recovery를 마친 뒤 ready가 된다.
- Run 시작 snapshot은 runtime adapter를 실행하기 전에 저장한다. `started`, `cancelling`, terminal 상태는 저장된 뒤 caller와 subscriber에 공개한다.
- Streaming output과 debug evidence는 per-run 순서를 유지하며 coalesce하고, terminal 전에는 반드시 flush한다.
- 테스트는 in-memory adapter를 사용한다.
- FakeRuntimeAdapter와 CodexRuntimeAdapter는 persistence를 알지 못한다.
- Codex-owned rollout JSONL, history, SQLite를 읽거나 참조하지 않으며 bounded storage 안의 일부 중복은 의도적으로 허용한다.
- Concrete production adapter는 두 번째 production consumer가 생기기 전까지 server 내부에 둔다.

## 검토한 선택지

| 선택지 | 결정 | 이유 |
| --- | --- | --- |
| `runtime-core`가 filesystem 또는 SQLite를 직접 소유 | 기각 | Stable lifecycle module이 Node 환경과 storage 기술에 결합된다. |
| `apps/server`가 lifecycle recovery와 storage를 모두 소유 | 기각 | Kernel 밖에서 상태 전이 지식이 중복되고 persistence timing이 route와 subscriber에 흩어진다. |
| Codex-owned history를 Runtime Diagnostic History로 재사용 | 기각 | Fake run과 host-side failure를 담지 못하고 RuntimeRun과 Codex thread를 같은 개념으로 결합한다. |
| Normalized log와 Codex evidence reference를 함께 저장 | 기각 | Runtime Diagnostic History 조회와 복구가 adapter-owned storage의 가용성과 schema에 의존한다. |
| Append-only JSONL journal | 기각 | Streaming append에는 유리하지만 checkpoint, patch, revision, replay, tail repair, tombstone, compaction이라는 별도 상태 모델이 필요하다. |
| AY-PLE-owned SQLite repository | 기각 | Append와 transaction은 강하지만 현재 필요 없는 query와 cross-run atomicity를 위해 native dependency, normalized schema migration, WAL checkpoint, vacuum 운영을 도입한다. |
| Per-run versioned JSON snapshot | 채택 | RuntimeRunLog aggregate와 crash failure domain이 파일 하나에 대응하고, bounded history에서는 directory scan과 whole-record migration 비용이 제한된다. |
| Core-owned interface와 server-owned adapter로 분리 | 채택 | Lifecycle locality를 kernel에 유지하면서 workspace I/O를 환경 조립 지점에 둔다. |

## 결과

- Kernel의 hydration과 durability barrier를 건너는 mutation은 async interface가 되며, hydration 뒤의 `getRunLog`와 `listRuns`는 in-memory read로 유지한다.
- Startup load 또는 initial save가 실패하면 server는 ready가 되지 않거나 run 시작을 거부하고, runtime adapter를 실행하지 않는다.
- Mid-run persistence failure는 memory-only 실행으로 조용히 전환하지 않는다. 해당 run을 중단하고 persistence 상태를 degraded로 드러낸 뒤 새 run을 거부한다.
- Whole-snapshot rewrite와 최근 coalesced evidence의 crash loss window는 이 선택의 비용이다. 실제 측정에서 문제가 되면 같은 persistence seam 뒤의 JSONL 또는 SQLite adapter를 다시 검토한다.

이 ADR은 실제 directory, JSON envelope의 세부 schema, streaming write의 batching 수치와 persistence error의 HTTP payload를 결정하지 않는다. 현재 구현은 [Runtime Harness 구현 지도](../architecture/runtime-harness-implementation-map.md)와 [server README](../../apps/server/README.md)가 소유한다.
