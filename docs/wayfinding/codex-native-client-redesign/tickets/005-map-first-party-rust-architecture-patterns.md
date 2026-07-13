# 005 — Connection·App Server ingress architecture pattern을 지도화한다

## Wayfinder ticket

- Type: research
- State: resolved
- Blocked by: tickets/003-pin-upstream-source-provenance.md

## Question

Pinned `openai/codex`의 `app-server-client`와 App Server에서 process·connection bootstrap, single ingress, request/response demultiplexing, notification drain, bounded buffering, transport terminal과 shutdown을 어떤 module과 task가 소유하며, AY-PLE이 채택할 pattern·제품 adapter에서 달라질 지점·따라 하면 안 되는 구현 편의를 어떻게 구분할 것인가?

기존 research의 결론을 복사하지 말고 pinned checkout의 source와 tests에서 재검증해 architecture evidence asset으로 남긴다.

## Answer

[First-party connection·ingress architecture 근거 지도](../assets/005-first-party-connection-ingress-architecture.md)에 production `app-server-client`, production App Server stdio와 test-only subprocess helper의 module·task·queue ownership을 분리해 기록했다.

핵심 판정은 다음과 같다.

- Pinned production client는 embedded `InProcessAppServerClient`와 WebSocket·Unix socket `RemoteAppServerClient`만 제공한다. AY-PLE이 쓰는 stdio child client는 없으며, child spawn 구현은 synchronous test helper뿐이다. 따라서 external process supervision, partial-spawn cleanup, stdout·piped stderr drain, exit watcher와 force-kill/reap은 AY-PLE connection boundary가 소유해야 한다.
- First-party production pattern에서 채택할 것은 one connection authority, single ingress reader, exact direction-aware response demux, waiter와 event drain의 독립 진행, request capability와 event consumer의 분리, terminal fan-out, layered error와 explicit lifecycle이다. 한 stdout writer의 line order는 cross-thread causality나 product publication total order가 아니다.
- Upstream 전체가 bounded·lossless·structured라는 일반화는 틀리다. Remote event와 initialize staging, server request serialization과 per-thread listener command에는 unbounded storage가 있고, InProcess lower/upper lossless classifier도 다르다. Server stdio는 malformed input을 계속 읽고 overload response를 drop할 수 있으며 stdout write failure를 coordinated connection close로 만들지 않는다.
- Remote client의 caller-owned reusable ID, post-initialize request timeout·cancel·tombstone 부재, Server request reply once-only guard 부재, silent anomaly drop, partial initialize validation, command별 write-failure 비대칭과 shutdown failure를 success와 합치는 path는 protocol contract가 아니라 따라 하지 않을 implementation gap으로 분류했다.
- `close stdin → bounded wait → force kill → reap`은 test precedent일 뿐이다. Graceful wait 중 stdout reader를 계속 살려 pipe backpressure를 해소해야 하며, exact saturation·terminal·shutdown result policy는 Tickets 011·012가 결정한다.

Connection client, conversation use-case와 local web adapter의 분리는 production precedent가 지지하지만, positive ownership table은 Ticket 008에서 검증할 candidate hypothesis로만 남겼다. Core·TUI·exec의 native thread/turn/item ownership은 Ticket 006, identity·delivery·unknown outcome·verification policy는 Tickets 009·011·012·013에서 결정한다.

Client-side source conformance, server-side stdio/task ownership과 Wayfinder scope·deep-module boundary를 독립 재검토했고 최종 P1/P2 actionable finding은 세 축 모두 0건이다.
