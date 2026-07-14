# 005 — Connection·App Server ingress architecture pattern을 지도화한다

## Wayfinder ticket

- Type: research
- State: resolved
- Blocked by: tickets/003-pin-upstream-source-provenance.md

## Question

Pinned `openai/codex`의 `app-server-client`와 App Server에서 process·connection bootstrap, single ingress, request/response demultiplexing, notification drain, bounded buffering, transport terminal과 shutdown을 어떤 module과 task가 소유하며, AY-PLE이 채택할 pattern·제품 adapter에서 달라질 지점·따라 하면 안 되는 구현 편의를 어떻게 구분할 것인가?

기존 research의 결론을 복사하지 말고 pinned checkout의 source와 tests에서 재검증해 architecture evidence asset으로 남긴다.

## Answer

> **Ticket 019 correction:** 이 ticket의 Rust-centered 조사는 보존하지만 “client-side stdio 구현은 test helper뿐”이라는 판정은 exact pin의 Python `sdk/python/openai_codex` external stdio client를 누락했다. Python sole reader·serialized writer·active response routing·early turn staging·`fail_all`, Rust active pending facade와 TUI projection을 함께 대조한 [current port·재사용 감사](../assets/019-first-party-client-port-and-reuse-audit.md)가 이 부분을 supersede한다. Rust/npm에 reusable TypeScript stdio client가 없다는 좁은 결론은 유지한다.

[First-party connection·ingress architecture 근거 지도](../assets/005-first-party-connection-ingress-architecture.md)에 production `app-server-client`, App Server의 server-side stdio path, test-only subprocess helper와 TUI·exec consumer seam을 서로 다른 근거 등급으로 지도화했다.

핵심 판정은 다음과 같다.

- Pinned production `app-server-client`는 embedded `InProcessAppServerClient`와 WebSocket·Unix socket `RemoteAppServerClient`만 제공한다. AY-PLE이 쓸 production stdio child client는 없고 child spawn은 synchronous test helper에만 있다. 따라서 external process supervision, partial-spawn cleanup, serialized stdin writer, single stdout reader, child-exit watcher와 force-kill/reap은 AY-PLE connection boundary가 소유해야 한다.
- 현재 공식 문서는 protocol을 “`jsonrpc` header를 생략한 JSON-RPC 2.0 message”로 부르고 exact-pin source는 “true JSON-RPC 2.0이 아니다”고 적는다. 이는 actual wire shape 충돌이 아닌 evidence-tier별 명명 차이다. Generic library는 headerless 네 envelope, `string | integer` ID와 optional `trace`를 실제로 보존할 수 있는지 증명하기 전에 채택하지 않는다.
- First-party production source에서 가져올 pattern은 single connection authority, single ingress reader, exact direction-aware demux, response waiter와 event drain의 독립 진행, request capability와 single-consumer event surface의 분리, explicit lifecycle·layered error이다. 한 stdout writer의 line order는 sequential request execution, cross-thread causality나 product publication total order를 뜻하지 않는다.
- Upstream은 end-to-end bounded·lossless·structured system이 아니다. Command queue capacity는 detached waiter·pending request 수를 bound하지 않고, Remote event·initialize staging, server method-scope queue와 listener command은 uncapped다. Stdio의 `128`도 message count뿐이며 inbound line·parsed/outbound payload byte cap이 아니다. InProcess lower/upper lossless classifier도 다르다. 따라서 byte·message·scope·in-flight bound와 saturation outcome은 AY-PLE이 별도로 정의해야 한다.
- Stdin EOF는 stdio **connection** close trigger이지 항상 child process exit이 아니다. Persisted·explicit Remote Control connection이 공존하면 process가 남을 수 있고, stdout writer failure는 live-supervised connection terminal로 승격되지 않는다. Upstream server shutdown도 다단계 deadline 후 outer join이 globally bounded라는 proof가 없다. External client는 여러 failure·exit signal을 하나의 arbiter로 보내고, 후속 policy가 terminal로 분류한 signal에 대해 closing·waiter fan-out을 한 번만 시작하되 later child exit·force·reap evidence를 최종 cause/result에 합칠 수 있어야 한다.
- `close stdin → bounded wait → force kill → reap`은 test helper의 bounded-attempt precedent일 뿐이다. Helper는 wait 중 stdout을 drain하지 않고 full-pipe·Remote Control·partial-spawn failure test도 없다. AY-PLE은 open pipe를 unread 상태로 방치하지 않되 graceful tail drain을 유지할지, tail loss를 감수하고 read end를 닫을지는 후속 shutdown policy에서 결정한다.
- Remote의 caller-owned RequestId, live-only duplicate check, request timeout·cancel·tombstone 부재, Server request reply once-only guard 부재, silent anomaly drop, generic `request_typed<T>`·partial initialize validation은 protocol contract가 아니라 따라 하지 않을 구현 편의·누락이다. First-party consumer도 integer sequencer, UUID string, fixed initialize ID를 다르게 쓰므로 caller-owned allocator를 default로 간주하지 않는다.

Source가 지지하는 seam 결론은 low-level client와 consumer-specific RPC/config composition을 분리할 수 있다는 점까지다. TUI는 `AppServerSession` wrapper를 두지만 exec는 `InProcessAppServerClient`를 직접 조합하고 upstream에 local-web adapter precedent는 없다. 따라서 connection client·shared conversation use-case·AY-PLE local-web adapter의 positive ownership은 production fact가 아닌 [첫 tracer와 module seam을 선택한다](008-choose-first-tracer-and-module-seams.md)의 후보 가설로 남겼다.

Core·TUI·exec의 native thread/turn/item authority는 [Core·TUI·exec conversation ownership pattern을 지도화한다](006-map-first-party-conversation-ownership.md), client Interface·RequestId allocator·max-in-flight·pre-admission surface는 [첫 tracer와 module seam을 선택한다](008-choose-first-tracer-and-module-seams.md), native/product identity는 [Identity authority와 product reference 정책을 결정한다](009-decide-identity-and-authority.md), concurrency는 [Thread·turn concurrency 정책을 결정한다](010-decide-concurrency-policy.md), notification delivery queue·retention·saturation과 transcript recovery는 [Event delivery와 transcript recovery model을 결정한다](011-decide-delivery-and-recovery-model.md), accepted RequestId late lifecycle·terminal trigger·shutdown은 [Connection loss와 unknown outcome 정책을 결정한다](012-decide-connection-and-unknown-outcome-policy.md), validation은 [Source conformance verification matrix를 결정한다](013-decide-source-conformance-verification.md)가 소유한다. First supported Server request variant와 그 policy owner는 구체 tracer가 정해지는 [첫 tracer와 module seam을 선택한다](008-choose-first-tracer-and-module-seams.md) 이후에만 만든다.

Exact-pin production source·checked-in test와 test helper를 정적으로 대조했으며 upstream Rust test suite와 live subprocess probe는 재실행하지 않았다. Full stdout pipe, partial-spawn failure, stdout EOF·stdin write failure·child exit 경합은 upstream test가 고정하지 않으므로 [Source conformance verification matrix를 결정한다](013-decide-source-conformance-verification.md)의 fake-child oracle로 남겼다.

최종 독립 재리뷰에서 source conformance, repository Standards, skeptical decision boundary 세 축의 P1·P2·P3 finding은 모두 0건이었다.
