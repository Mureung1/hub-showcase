# 에이전트 실행 엔진 재사용 후보 조사

| 항목 | 내용 |
| --- | --- |
| 조사 질문 | AY-PLE가 `AgentRuntimeKernel`과 Codex App Server 상위 계층을 계속 직접 만들 필요가 있는가? 이미 포크하거나 의존할 수 있는 구현은 무엇인가? |
| 조사일 | 2026-07-10 (Asia/Seoul) |
| 조사 방법 | 공식 저장소, 공식 패키지 문서, 해당 버전의 소스 코드만 확인했다. 호환성은 실제 소스에서 확인되지 않으면 추정하지 않았다. |
| 기준선 | [Runtime Harness 구현 지도](../../architecture/runtime-harness-implementation-map.md), [`runtime-core`](../../../packages/runtime-core/src/index.ts), [`runtime-codex`](../../../packages/runtime-codex/src/adapter.ts), [실행 이력 ADR](../../adr/0004-split-runtime-history-semantics-from-workspace-storage.md) |
| 결론 상태 | **후속 결정으로 갱신됨:** 4주 제품 범위에서는 Codex App Server를 직접 우선 지원한다. ACP 전환은 미룬다. |
| 결정 문서 | [ADR 0005 — 4주 제품 수직 흐름에 Codex App Server 우선 사용](../../adr/0005-use-codex-app-server-as-first-class-mvp-runtime.md) |

## 후속 결론

이 보고서의 후보 조사와 소스 비교는 유효하지만, 최초의 ACP 우선 권고는 후속 기능 보존 감사와 4주 제품 범위 결정으로 대체됐다. `@agentclientprotocol/codex-acp`는 Codex App Server를 실행하는 유용한 구현이지만 투명한 상위 계층은 아니며 일부 기능을 잃는 ACP 변환 계층이다.

결정적인 차이는 다음과 같다.

| 영역 | Codex App Server | 기본 `codex-acp@1.1.2` |
| --- | --- | --- |
| 진행 중 정정 | 진행 중 `turn`과 예상 `turn`을 대상으로 하는 `turn/steer` | ACP v1 표준과 어댑터에 진행 중 정정 기능이 없음 |
| 생명주기 식별자 | `thread`, `turn`, `item`, `request` 식별자와 형식이 지정된 `started`·`completed` 상태 | `turn` 식별자는 어댑터 내부에서 주로 소비되고 ACP 클라이언트에는 축약됨 |
| AY→학생 질문 | 형식이 지정된 사용자 입력 `request`와 MCP `elicitation` | MCP `elicitation` 일부는 지원하지만 Codex 사용자 입력 `request` 처리기가 없음 |
| Codex 이벤트 수신 | `hooks`, `diff/patch`, `realtime`, `skill/settings` 변화 등을 포함한 App Server 범위 | 변환기가 여러 `notification`을 명시적으로 버리고 원본 통과 경로가 없음 |
| 중단·승인 | `turn` 단위 중단과 형식이 지정된 승인 | 현재 `turn` 중단과 명령·파일·권한 승인은 비교적 충실하게 연결 |

근거는 [Codex App Server API](https://learn.chatgpt.com/docs/app-server#api-overview), [ACP v1 prompt lifecycle](https://agentclientprotocol.com/protocol/v1/prompt-turn), [ACP extension mechanism](https://agentclientprotocol.com/protocol/v1/extensibility), [`codex-acp` 이벤트 변환기](https://github.com/agentclientprotocol/codex-acp/blob/8aff492d4b033ff2c02ad3b9d591994d57617463/src/CodexEventHandler.ts#L105-L221)다. ACP 프로토콜은 사용자 정의 `method`와 `notification`을 허용하므로 원천적으로 불가능한 것이 아니다. 기본 어댑터를 유일한 제어·이벤트 표면으로 삼을 때 제품에 필요한 기능 보존 수준이 낮아지는 것이 문제다.

따라서 4주 제품 범위에서는 다음을 선택한다.

1. **Codex App Server를 4주 제품의 주 실행 기반으로 직접 사용한다.** 이어지는 AY 작업 맥락, AY의 작업 진행, 진행 중 정정, 중단 완료 확인, 실행 권한 확인, 작업 중 사용자 질문을 먼저 제품에서 검증한다.
2. **`AgentRuntimeKernel`은 단일 실행 Runtime Harness 모듈로 한정한다.** 여섯 가지 이벤트 생명주기를 전체 제품 프로토콜로 확대하지 않는다.
3. **AY-PLE가 CoControl과 제품 상태를 소유한다.** `thread`/`turn`/`item`/`request` 식별자를 보존하고, 필요한 내용만 `SourceSelection → ModelingRun → StatePatch/Review → UserConfirmation → TrustedState`의 제품 의미로 바꾼다.
4. **ACP는 캠프 이후 다른 실행 엔진을 붙일 때 비교할 후보로 남긴다.** 실제 두 번째 제품 실행 엔진이 필요해지면 같은 제품 시나리오를 비교한 뒤 공통 변환 계층 또는 Codex 확장을 검토한다.

Open WebUI 같은 채팅 UI는 빠른 데모 외곽 화면으로는 쓸 수 있지만 실행 기반을 없애지 않는다. 외부 에이전트를 Open WebUI Pipe 뒤에 연결해도 `thread`, 승인, 중단, 저장을 처리하는 에이전트 백엔드는 여전히 필요하다. 현재 라이선스의 대규모 배포 브랜딩 제한도 제품 포크에는 별도 검토 사항이다.

## 후보를 구분하는 기준

이 조사에서는 이름이 비슷한 프로젝트를 다음 네 종류로 나눴다. 이 구분을 하지 않으면 “UI를 가져왔는데 실행 엔진은 그대로 직접 구현”하거나 “Codex를 유지하려다 사실상 다른 엔진으로 교체”하는 결정을 하기 쉽다.

| 종류 | 의미 | AY-PLE에 미치는 변화 |
| --- | --- | --- |
| A. Codex App Server 직접 구현 | `codex app-server`를 실제로 구동하고 프로토콜을 번역·호스팅한다. | 현재 `raw-client.ts`와 Codex 어댑터 대부분을 직접 대체할 수 있다. |
| B. App Server가 아닌 Codex 상위 API | Codex를 쓰지만 `codex exec` 또는 다른 API 경로를 사용한다. | 구현은 쉬워질 수 있으나 App Server의 상호작용 요청과 세션 의미가 달라진다. |
| C. 대체 에이전트 실행 엔진 | Pi, OpenCode, Agents SDK처럼 자체 반복 처리·세션·도구 모델을 가진다. | 실행 기반만 교체하는 것이 아니라 실행 엔진과 기능 의미도 바뀐다. |
| D. UI·클라이언트 외곽 화면 | ACP UI, AI SDK UI, Open WebUI처럼 대화·이벤트를 표시한다. | 백엔드를 없애지 않는다. 다만 Inspector와 ChatSidecar 구현량은 줄일 수 있다. |

## AY-PLE가 현재 직접 소유하는 것

현재 `AgentRuntimeKernel`은 단순 어댑터 목록보다 훨씬 많은 범용 실행 엔진 책임을 갖고 있다.

| 현재 책임 | 현재 구현 | 재사용 가능성 | 판단 |
| --- | --- | --- | --- |
| 실행 엔진 프로세스와 초기 연결 | Codex CLI 실행, JSONL `request`/`response`, `initialize`, `thread/start`, `turn/start` | ACP Codex도 구현 | 캠프에는 유지하고, 향후 어댑터 전환 시 제거 가능한 기반 코드 후보로 봄 |
| 이벤트 변환 | 원본 Codex `notification`을 `started`, `output_delta`, `completed`, `cancelled`, `failed`로 축소 | ACP Codex가 더 상세한 ACP 갱신 이벤트로 번역하지만 Codex 이벤트 일부를 버림 | 여섯 가지 이벤트 확대는 중단하되 ACP로 즉시 교체하지 않고 이벤트 관측과 제품 의미 변환을 분리 |
| 실행 목록과 구독 | 실행 ID, 상태, 이벤트 기록, 구독자, 종료 대기자 | ACP 세션·프롬프트와 클라이언트 콜백이 일부 제공 | Runtime Harness 진단 생명주기로 유지하고, 이어지는 AY 작업 맥락과 구분 |
| 취소 일관성 | `AbortController`, 실행별 잠금, `cancelling`, 어댑터가 확인하는 종료 대기 | ACP Codex가 진행 중 프롬프트와 `turn/interrupt` 경로를 처리 | 현재 중단 완료 확인 근거로 재사용하고, 향후 ACP에서도 같은 의미가 유지되는지 검증 |
| 실행 엔진 이력 | 정규화 이벤트 스냅샷을 실행별 JSON으로 원자 저장 | Codex `thread` 저장소와 ACP 목록·불러오기는 실행 맥락을 제공 | Runtime Diagnostic History, 이어지는 작업 이력, 제품 감사 기록을 같은 저장소로 취급하지 않음 |
| 제품 상태 | 아직 Runtime Harness 밖에 있음 | 어떤 후보도 AY-PLE 도메인을 제공하지 않음 | 반드시 AY-PLE가 소유 |

현재의 `RuntimeRunEvent`가 여섯 가지 이벤트의 텍스트 중심 생명주기에 맞춰져 있는 동안에는 명령·파일 변경, 도구 호출, 권한, 계획, 추론, 토큰 사용량, 검토 같은 실제 에이전트 상호작용을 추가할 때마다 자체 프로토콜을 계속 확장해야 한다. 이것이 가장 강한 재발명 신호다.

규모도 이미 작은 검증 수준을 넘어섰다. 테스트, 생성 프로토콜, 테스트 도우미, CSS를 제외한 조사 당시 실행 엔진 관련 코드는 약 5,355 LOC였다: `runtime-core` 1,110, `runtime-codex` 2,327, `runtime-fake` 97, `apps/server` 1,004, Inspector 817 LOC다. 이 숫자 자체가 문제라는 뜻은 아니지만, 스트리밍 중간 저장, 보존 한도, 진단 저장소 장애 처리를 우선 제품 상호작용보다 먼저 완성하는 것은 4주 범위의 투자 중단 신호다.

또한 `FakeRuntimeAdapter`는 테스트 대역이지 두 번째 제품 실행 엔진이 아니다. 따라서 현재 범용 어댑터 경계는 아직 “언젠가 여러 엔진”이라는 가설에 가깝다. Codex와 실제 두 번째 실행 엔진이 같은 AY-PLE CoControl 시나리오를 의미 손실 없이 수행할 때 비로소 공통 경계를 추출할 근거가 생긴다.

## 후보 지도

### A. Codex App Server를 직접 사용하는 구현

| 후보 | 조사 시점 상태 | 라이선스·런타임 | App Server 관계 | 권고 |
| --- | --- | --- | --- | --- |
| [`@agentclientprotocol/codex-acp`](https://github.com/agentclientprotocol/codex-acp/tree/8aff492d4b033ff2c02ad3b9d591994d57617463) | v1.1.2, 2026-07-09 소스, `@openai/codex ^0.144.0` 번들 | Apache-2.0, TypeScript/Node | **직접**: 번들된 `codex app-server`를 표준 입출력으로 실행하고 ACP↔Codex를 번역 | 캠프 이후 이식성 어댑터 후보. 기본 어댑터의 Codex 기능 보존 수준이 부족하므로 도입 시 확장·포크 비용을 직접 어댑터 유지비와 비교 |
| OpenAI [`openai-codex` Python SDK](https://github.com/openai/codex/tree/1f0566d3f59298d1bb88820a0d35294f1eeb07ea/sdk/python) | 공개 패키지 0.1.0b3, 베타; 소스 의존성은 `openai-codex-cli-bin==0.137.0a4` | Apache-2.0, Python 3.10+ | **직접**: 형식이 지정된 JSON-RPC 클라이언트가 번들된 `codex app-server`를 표준 입출력으로 실행 | 공식 상위 계층 대안. Python 보조 프로세스, 실행 엔진 버전 지연, 수동 승인 표면을 검증해야 함 |
| [OpenClaw `@openclaw/codex`](https://github.com/openclaw/openclaw/tree/3bec587d742f675c3fd219646b0ba3c2c0eaaccb/extensions/codex) | 2026.6.11 계열, `@openai/codex 0.144.1`; 활발한 단일 저장소 | MIT, TypeScript/Node | **직접**: 표준 입출력·웹소켓 클라이언트와 세션·이벤트·승인 연결을 포함 | 운영 수준 참고 구현 또는 OpenClaw 전체 채택 후보. 독립 추출은 권고하지 않음 |
| OpenAI [`codex-app-server-client`](https://github.com/openai/codex/tree/1f0566d3f59298d1bb88820a0d35294f1eeb07ea/codex-rs/app-server-client) | Codex 2026-07-09 커밋의 워크스페이스 크레이트, 독립 공개 크레이트 버전은 확인되지 않음 | Apache-2.0, Rust | **직접**: 프로세스 내부·원격의 형식 지정 클라이언트 파사드 | 프로토콜 정답과 생명주기 구현 참고용. Node 앱이 즉시 채택할 경계는 아님 |
| OpenAI [`app-server-test-client`](https://github.com/openai/codex/blob/1f0566d3f59298d1bb88820a0d35294f1eeb07ea/codex-rs/app-server-test-client/README.md) | Codex 작업공간의 수동 검증 도구 | Apache-2.0, Rust CLI | **직접** | 스키마·세션·재합류를 확인하는 검증 도구로 사용하고 제품 라이브러리로는 사용하지 않음 |

| 후보 | 이벤트 모델 | 세션·이력·저장 | 중단 | 승인·도구 | 사용자 정의 UI | 도입·포크 비용 평가 |
| --- | --- | --- | --- | --- | --- | --- |
| ACP Codex | ACP `session/update`로 `text`, `shell`, `file`, `permission`, `MCP/tool`, `reasoning`, `plan`, `web/image`, `token`, `review` 등을 변환하고 세션별 이벤트 대기열을 직렬화한다. | Codex `thread`의 목록·불러오기·재개·삭제를 ACP 세션 API로 노출한다. 영속화 주체는 Codex `thread` 저장소다. | ACP 중단을 진행 중 Codex `turn` 중단으로 연결하고 프롬프트·중단 경쟁 조건을 관리한다. | Codex의 명령·파일·권한 `request`를 ACP `requestPermission`으로 변환하며 실패 시 안전하게 거절한다. 클라이언트 제공 MCP도 연결한다. | ACP SDK로 임의 UI를 만들 수 있다. 완성된 React 위젯은 포함하지 않는다. | **소비 낮음 / 포크 중간.** 패키지는 작고 경계가 명확하지만 매우 신생이며 Codex·ACP 버전 추종이 필요하다. |
| OpenAI Python SDK | 형식이 지정된 이벤트 스트림과 `thread` 시작·목록·읽기·재개·포크·보관·압축, `turn` 정정·중단, 인증을 상위 객체로 제공한다. | Codex `thread` 저장소를 그대로 사용하며 SDK가 호환 CLI 실행 파일을 함께 설치한다. | 상위 `turn` 객체가 중단과 정정을 제공한다. | 공개 `ApprovalMode`는 `auto_review`·`deny_all` 중심이고 수동 콜백은 저수준 `CodexClient(approval_handler=...)`에만 있다. 처리기가 없으면 저수준 클라이언트는 명령·파일 승인을 허용한다. | Python 호스트 또는 Node↔Python 보조 프로세스가 필요하다. | **공식성 높음 / 통합 중간.** App Server 세부 구현은 크게 줄지만 현재 TypeScript 제품에는 ACP보다 패키징·승인 연결 코드가 많고 번들 실행 엔진이 뒤처진다. |
| OpenClaw Codex | Codex 이벤트 변환, 동적 도구, `elicitation`, 사용량 제한·모델 갱신까지 폭넓다. | OpenClaw 세션 연결과 대화 기록 복제에 강하게 결합한다. | 시간 초과, 감시, 재시도, 중단을 호스트 생명주기와 함께 처리한다. | 승인, 사용자 입력, 동적 도구 연결이 있다. | OpenClaw 게이트웨이와 클라이언트 안에서는 완성도가 높다. AY-PLE UI만 떼기는 어렵다. | **소비: 전체 플랫폼이면 중간 / 독립 포크 매우 높음.** 조사 커밋의 `extensions/codex/src/app-server`만 테스트 제외 약 4.3만 LOC이며 플러그인 API 의존이 크다. |
| OpenAI Rust 클라이언트 | 생성 타입, 형식 지정 `request`·이벤트 채널, 제한된 대기열과 지연 처리를 제공한다. | App Server가 가진 `thread` API에 접근하지만 AY-PLE용 저장소를 제공하지 않는다. | 프로토콜 `request`로 처리하고 정상 종료를 중앙화한다. | 지연된 승인 `request`를 방치하지 않고 거절하는 방어가 있다. | 없음 | **Node 소비 높음 / 참고 낮음.** Rust 작업공간을 제품에 들이는 것보다 동작 기준으로 활용하기 적합하다. |

`@agentclientprotocol/codex-acp`는 OpenAI 공식 패키지가 아니라 **ACP 프로젝트의 검증된 상위 조직이 제공하는 Codex 어댑터**다. 반면 내부에서 실행하는 `@openai/codex`와 App Server 프로토콜은 OpenAI 구현이다. 출처와 지원 주체를 이 둘로 나눠 이해해야 한다.

또한 세션 API가 있다고 해서 재시작 내구성이 완전히 검증됐다고 단정하면 안 된다. 현재 저장소의 [재시작 영속성 E2E는 불안정한 테스트라는 이유로 건너뜀](https://github.com/agentclientprotocol/codex-acp/blob/8aff492d4b033ff2c02ad3b9d591994d57617463/src/__tests__/CodexACPAgent/e2e/acp-e2e-session-persistence.test.ts#L10-L48) 처리되어 있다. 향후 ACP 채택을 검토할 때 AY-PLE 환경에서 직접 검증해야 한다.

공식 Python SDK는 “공식 App Server 상위 클라이언트가 없는가?”에 대한 중요한 예외다. 다만 소스 패키지 정보가 [베타와 고정된 CLI 0.137.0 알파 의존성](https://github.com/openai/codex/blob/1f0566d3f59298d1bb88820a0d35294f1eeb07ea/sdk/python/pyproject.toml#L5-L20)을 명시하고, 상위 API의 [승인 모드](https://github.com/openai/codex/blob/1f0566d3f59298d1bb88820a0d35294f1eeb07ea/sdk/python/src/openai_codex/_approval_mode.py)는 수동 UI 콜백을 직접 노출하지 않는다. 저수준 [`CodexClient`](https://github.com/openai/codex/blob/1f0566d3f59298d1bb88820a0d35294f1eeb07ea/sdk/python/src/openai_codex/client.py#L212-L222)는 사용자 정의 처리기를 받을 수 있으므로 불가능한 것은 아니지만, 4주 TypeScript 제품 경로를 Python 보조 프로세스로 바꿀 이점은 Codex 직접 통합을 유지하는 비용보다 크지 않다.

### B. Codex를 쓰지만 App Server를 쓰지 않는 상위 구현

| 후보 | 상태·라이선스·런타임 | 이벤트·세션 | 중단·승인·도구 | 저장·UI | App Server 호환 | 권고·비용 |
| --- | --- | --- | --- | --- | --- | --- |
| OpenAI [`@openai/codex-sdk`](https://github.com/openai/codex/blob/1f0566d3f59298d1bb88820a0d35294f1eeb07ea/sdk/typescript/README.md) | Codex 2026-07-09 소스, Apache-2.0, TypeScript/Node 18+ | `thread.started`, `turn`, 상세 `item` 생명주기를 `AsyncGenerator`로 제공한다. 시작·재개와 반복 `turn`을 지원한다. | `AbortSignal`로 생성한 자식 프로세스를 중단한다. 승인 정책은 설정할 수 있지만 대화형 승인 콜백·이벤트는 SDK 표면에 없다. 구조화 출력·이미지는 지원한다. | CLI의 `~/.codex/sessions`를 재사용하지만 SDK는 목록·읽기·보관을 노출하지 않고 ID 재개 중심이다. UI는 직접 연결한다. | **아니오.** [`codex exec --experimental-json`](https://github.com/openai/codex/blob/1f0566d3f59298d1bb88820a0d35294f1eeb07ea/sdk/typescript/src/exec.ts)를 실행한다. | 승인과 세션 관리가 MVP가 아니라면 가장 단순한 공식 경로다. 현재 AY-PLE 요구에는 ACP보다 기능 손실이 크다. 소비 낮음, 포크 불필요 |
| Vercel [`@ai-sdk/harness-codex`](https://github.com/vercel/ai/tree/1146118a134946b1c33fc4dee17ed5446582f531/packages/harness-codex) | 1.0.24, **실험적**, Apache-2.0, TypeScript/Node 22 | AI SDK의 정규화 스트림과 `HarnessAgentSession`, `detach`·`suspend`·`continue`·`resume` 상태를 제공한다. | 연결 계층의 중단 신호를 Codex SDK 자식 프로세스에 전달한다. [`supportsBuiltinToolApprovals: false`](https://github.com/vercel/ai/blob/1146118a134946b1c33fc4dee17ed5446582f531/packages/harness-codex/src/codex-harness.ts#L59-L224)이며 내장 도구 거르기도 제한된다. | 불투명한 재개 상태와 이벤트 재생이 있으나 영속 앱 저장은 호스트 책임이다. AI SDK UI와 연결하기 쉽다. | **아니오.** OpenAI Codex SDK를 사용하며, 현재 실제 네트워크 샌드박스로 Vercel Sandbox를 요구한다. | 여러 엔진 비교 실험에 유용하지만 Codex 기능 보존 목적의 1순위는 아니다. 소비 중간, 포크 비권고 |

공식 TypeScript Codex SDK는 “App Server를 직접 다루기 싫다”는 문제에는 훌륭한 답이다. ACP Codex는 공식 TypeScript SDK보다 App Server 기능을 더 많이 보존하지만, 진행 중 정정과 원본 이벤트 보존이 필요한 현재 4주 제품 경로를 충족하지는 않는다.

### C. 대체 에이전트 실행 엔진과 공통 실행기

| 후보 | 조사 시점 상태 | 라이선스·런타임 | 이벤트 모델·세션·이력 | 중단·승인·도구 | 저장·사용자 정의 UI | App Server 호환 | 권고·포크 비용 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [Pi 단일 저장소](https://github.com/earendil-works/pi/tree/v0.80.6) (`pi-agent-core`, `pi-coding-agent`) | v0.80.6, 2026-07-10 | MIT, TypeScript/Node 22.19+ | `pi-agent-core`는 메모리 안의 에이전트 반복·상태·이벤트를, `pi-coding-agent`는 `AgentSession`, JSONL 트리 세션, 압축·재시도, SDK와 JSON-RPC 방식을 제공한다. | 중단·이벤트와 도구를 제공한다. `pi-agent-core`에 샌드박스·권한 대화상자는 내장하지 않으며 확장·RPC UI 요청으로 정책을 조립한다. | `pi-coding-agent` 세션 관리자가 JSONL을 저장한다. 사용자 정의 UI는 SDK·RPC로 만들 수 있지만 현재 단일 저장소에서 웹 UI 패키지는 제거됐다. | **아니오.** OpenAI Codex 제공자도 App Server가 아니라 `/codex/responses` 계열 백엔드를 직접 호출한다. | 작은 로컬 코딩 에이전트 엔진을 직접 제어하려면 강한 후보다. Codex 의미 보존용 즉시 대체재는 아니다. 소비 중간, 제품 포크 중간 |
| Vercel [`@ai-sdk/harness`](https://github.com/vercel/ai/blob/1146118a134946b1c33fc4dee17ed5446582f531/packages/harness/README.md) + Pi/Codex/OpenCode 어댑터 | 2026-07-09 소스, **실험적** | Apache-2.0, TypeScript | `HarnessV1`과 `HarnessAgentSession`으로 여러 코딩 실행기의 생성·스트림·세션 생명주기를 통일한다. | 어댑터별 지원 차이를 기능으로 드러낸다. Pi 어댑터는 내장 승인을 지원하지만 Codex 어댑터는 지원하지 않는다. | 샌드박스 생명주기, 재개 상태, 관측 가능성과 AI SDK UI 생태계를 활용한다. 영속 제품 상태는 제공하지 않는다. | Codex 어댑터는 **아니오**. 각 엔진 어댑터 경로가 다르다. | Pi까지 포함한 실제 다중 엔진 요구가 생길 때 별도 검증한다. 기존 자체 최소공배수보다 낫지만 실험적 추상화를 곧바로 핵심 계층으로 고정하지 않는다. 소비 중간, 포크 비권고 |
| [OpenCode](https://github.com/anomalyco/opencode/tree/d0ba5389248e05546849b9f69b7bc417aa5fd5d7) | 1.17.18, 2026-07-10 소스 | MIT, TypeScript/Bun | 헤드리스 서버와 생성 SDK, SSE `/event`, 세션 생성·목록·포크·중단·요약·되돌리기 API를 갖춘 완성형 코딩 에이전트 실행 엔진이다. | 권한 응답, 도구·플러그인·에이전트, MCP, 중단을 자체 서버가 처리한다. | SQLite WAL에 세션·제품 데이터를 저장하고 HTTP/SSE SDK 또는 ACP로 사용자 정의 클라이언트를 붙일 수 있다. | **아니오.** 자체 실행 엔진이다. 다만 `opencode acp`를 제공한다. | 가장 즉시 사용하기 쉬운 대체 엔진이다. AY-PLE가 서버와 실행 기반까지 직접 소유하지 않으려면 `opencode serve` 또는 ACP를 소비해 볼 가치가 있다. 전체 포크는 높고 헤드리스 소비는 중간이다. |
| [OpenAI Agents SDK JS](https://github.com/openai/openai-agents-js/tree/04807e33347b2b92bdde7685d83d84f1bc144c6d) | v0.13.1, 2026-07-10 | MIT, TypeScript | 모델·실행·항목·에이전트 갱신 스트림, 직렬화 가능한 실행 상태, `Session` 인터페이스, 압축을 제공한다. | 중단과 사람 참여형 도구 승인·거절 뒤 재개를 제공한다. | 내장·사용자 정의 세션 저장소와 AI SDK UI 스트림 어댑터가 있다. | **아니오.** 범용 에이전트 반복 실행기다. | Codex 코딩 실행기보다 AY-PLE 전용 작업 흐름 에이전트를 만들기로 결정할 때 후보다. 로컬 코딩 스킬·실행 엔진의 즉시 대체재는 아니다. 소비 낮음~중간, 포크 불필요 |
| [LangGraph JS](https://github.com/langchain-ai/langgraphjs/blob/ada0b67696d2dadb59c2f274f45c585aa4fef0e4/libs/langgraph-core/README.md) | 1.4.7, 2026-07-09 | MIT, TypeScript/Node 18+ | 그래프 상태, 영속 실행·체크포인트, HITL, 메모리에 초점 | 중단·재개 작업 흐름을 구성할 수 있으나 코딩 도구 호스트는 직접 조립 | 체크포인터·저장소와 사용자 정의 앱 통합 | **아니오** | `Review` 장기 작업 흐름을 조율하는 상위 계층 후보이며 Codex 전송·`AgentRuntimeKernel` 대체재는 아니다. 도입 중간, 포크 불필요 |

Pi와 OpenCode는 “더 나은 Codex 클라이언트”가 아니라 **Codex App Server를 버리는 선택**이다. 둘 다 충분히 진지한 후보지만 다음 차이를 먼저 받아들여야 한다.

- Pi는 작고 조립 가능한 SDK/RPC 표면이 강점이다. 대신 `sandbox`·`permission` 정책과 브라우저 UI를 AY-PLE가 선택·구현해야 한다.
- OpenCode는 서버, 저장, 권한, 세션, SDK가 이미 결합된 즉시 사용 가능한 호스트다. 대신 Bun 기반의 큰 코딩 제품을 의존성과 프로세스로 받아들이게 된다.
- 둘 다 포크하기 전에 프로세스나 SDK로 소비하는 실험이 더 싸다.

OpenCode는 특히 현재 v2 SDK에 영속 프롬프트 수락, `wait`, `interrupt`, 순서 번호 기반 이벤트 이력·재생을 제공해 현재 `AgentRuntimeKernel`의 `mutex`, `waiter`, 영속 이벤트 기록과 직접 겹친다. 그러나 OpenCode 스스로 밝히듯 `permission`은 보안 `sandbox`가 아니며 에이전트 프로세스는 실행 사용자의 권한으로 동작한다. 또한 서술형 문서는 이전 세션 API 중심이고 v2 영속 프롬프트와 이전 구조화 출력 표면이 전환 중이므로, 외부 프로세스의 정확한 버전을 고정해 시험하되 내부 모듈 포크는 피해야 한다. [v2 세션 SDK](https://github.com/anomalyco/opencode/blob/v1.17.18/packages/sdk/js/src/v2/gen/sdk.gen.ts#L5618-L5798), [보안 모델](https://github.com/anomalyco/opencode/blob/v1.17.18/SECURITY.md#L9-L23)

### D. 기존 UI와 클라이언트 외곽 화면

| 후보 | 상태·라이선스 | 제공하는 것 | 제공하지 않는 것 | AY-PLE 판단 |
| --- | --- | --- | --- | --- |
| [`@agentclientprotocol/sdk`](https://github.com/agentclientprotocol/typescript-sdk/blob/26da1ae7ab66fae0f5e77272dee3e5d562d24aee/README.md) | v1.2.1, Apache-2.0, TypeScript | 형식이 지정된 ACP 클라이언트·에이전트, stdio NDJSON, `sessionUpdate`, `requestPermission`; 실험적 HTTP/WS 전송 내보내기 | 완성 UI, AY-PLE 상태, 저장소 | 캠프 이후 ACP 어댑터를 검증할 때의 호스트 라이브러리 후보이며 현재 Codex 제품 경로의 필수 의존성은 아님 |
| [`acp-ui`](https://github.com/formulahendry/acp-ui/tree/cd9c3cb464a4b321bff652101953a64c07473e31) | [v0.1.16, 2026-05-25](https://github.com/formulahendry/acp-ui/releases/tag/v0.1.16), MIT, Vue/Tauri | ACP `session/new`/`load`, 재생 업데이트, 권한 대화상자, `session/cancel`이 있는 데스크톱 UI 참고 구현 | AY-PLE 도메인과 Codex App Server 자체. `session/list`/원격 삭제 대신 자체 `sessions.json` 또는 localStorage 목록 사용 | **일회성 UI 검증 후보.** 기본의 이전 Codex ACP 실행 명령을 새 `@agentclientprotocol/codex-acp`로 바꿔 프로토콜과 UX를 빠르게 체험하되 제품 기반으로 바로 채택하지 않음 |
| [Kanna](https://github.com/jakemor/kanna/tree/9873d72523102a968eefbeee604da1a94a7a6203) | v0.41.7, React 19/Bun; 표준 MIT가 아닌 특정 당사자 제외 조항이 있는 수정 라이선스 | Codex/Claude 프로젝트 채팅, 상세 도구 기록, 계획 검토, 재개, WebSocket, 이벤트 기반 JSONL UI·저장소 | 안전한 실행 엔진 기본값. 현재 Codex 경로는 `approvalPolicy: "never"`, `sandbox: "danger-full-access"`를 사용하고 승인 콜백을 연결하지 않음 | **완성도 높은 React UI 참고 후보.** 실행 엔진 선택과 분리해 기록·계획 UX만 참고하고 라이선스와 전체 접근 기본값을 그대로 상속하지 않음 |
| [AI SDK UI](https://github.com/vercel/ai/tree/1146118a134946b1c33fc4dee17ed5446582f531/packages/react) | Apache-2.0, TypeScript/React | `useChat`, 표준 UI 메시지 스트림, 도구 승인 UI를 조립하는 프런트엔드 구성 요소 | 코딩 실행 엔진과 영속 제품 상태 | Harness나 자체 ACP→AI SDK UI 스트림 연결을 택할 때 유용함. UI 때문에 실행 엔진까지 Harness로 교체할 필요는 없음 |
| [Open WebUI Pipe](https://docs.openwebui.com/features/plugin/functions/pipe/) | [Open WebUI License](https://github.com/open-webui/open-webui/blob/main/LICENSE): 최근 30일 기준 50명 초과 배포에서 브랜딩 변경·제거 제한 | 완성 채팅 UI에서 외부 에이전트·모델 백엔드를 노출하는 Pipe | Codex `thread`, 승인, 중단, 저장을 대신하는 표준 실행 엔진 호스트 | 내부 데모·운영 화면 후보. AY-PLE의 핵심 Review Workspace나 `AgentRuntimeKernel` 대체로는 권고하지 않음 |

즉, “기존 채팅 인터페이스를 가져오자”와 “`AgentRuntimeKernel`을 재사용하자”는 별도 결정이다. UI 참고 구현은 선택적으로 재사용할 수 있지만, 캠프 제품 경계는 ACP 클라이언트가 아니라 AY-PLE CoControl 제품 기능과 Codex 직접 통합 사이에 둔다.

## 보류 후보: ACP Codex를 공통 변환 계층으로 사용

### 실제로 대체되는 코드

`@agentclientprotocol/codex-acp` 소스에는 이미 다음 책임이 있다.

- [`CodexJsonRpcConnection`](https://github.com/agentclientprotocol/codex-acp/blob/8aff492d4b033ff2c02ad3b9d591994d57617463/src/CodexJsonRpcConnection.ts#L15-L42): 번들된 Codex App Server 실행과 JSON-RPC 표준 입출력 연결
- [`CodexAppServerClient`](https://github.com/agentclientprotocol/codex-acp/blob/8aff492d4b033ff2c02ad3b9d591994d57617463/src/CodexAppServerClient.ts#L115-L264): 초기화, 형식이 지정된 `request`, `notification` 전달, `turn` 종료 대기, 오래된 `turn` 거르기
- [`CodexAcpClient`](https://github.com/agentclientprotocol/codex-acp/blob/8aff492d4b033ff2c02ad3b9d591994d57617463/src/CodexAcpClient.ts#L509-L715): `thread` 시작·재개·읽기·목록·보관과 프롬프트·중단·이벤트 대기열
- [`CodexApprovalHandler`](https://github.com/agentclientprotocol/codex-acp/blob/8aff492d4b033ff2c02ad3b9d591994d57617463/src/CodexApprovalHandler.ts#L46-L117): 명령·파일·권한 승인 연결과 중단·오류 시 안전한 거절
- [`CodexAcpServer`](https://github.com/agentclientprotocol/codex-acp/blob/8aff492d4b033ff2c02ad3b9d591994d57617463/src/CodexAcpServer.ts#L1212-L1678): ACP 세션·프롬프트 생명주기, 진행 중 프롬프트, 취소 경쟁 조건, 목록·불러오기·재개·삭제

이 구현은 생명주기와 승인 연결을 재사용할 가치가 있다. 그러나 현재 [`packages/runtime-codex/src/raw-client.ts`](../../../packages/runtime-codex/src/raw-client.ts)와 [`adapter.ts`](../../../packages/runtime-codex/src/adapter.ts)를 즉시 교체하면 진행 중 `turn/steer`와 Codex 이벤트 관측을 잃는다. 캠프 동안에는 직접 통합 위에서 여섯 가지 이벤트 프로토콜을 확대하지 말고, 같은 Codex `thread`를 이어 쓰는 작업 맥락과 `thread`/`turn`/`item`/`request` 식별자를 보존하는 관측을 제품에 연결한다. 이후 ACP를 채택할 때는 Codex 확장 또는 보조 경로를 추가하는 비용이 직접 어댑터 유지비보다 실제로 작은지 비교한다.

### 그래도 AY-PLE에 남겨야 하는 것

| AY-PLE 소유 | 외부 실행 엔진에 위임 |
| --- | --- |
| `RawMaterial`, `SourceSelection`, `ModelingRun`, `EvidenceRef` | CLI 실행, 초기화, JSON-RPC 요청 연결 |
| 스키마 검증과 구조화 출력 검증 | Codex `thread`/`turn`/`item` 전송 |
| `DraftState`, `ReviewState`, `StatePatch`, `RecommendedChoice` | 명령·파일·MCP 도구 이벤트 전달 |
| `UserConfirmation`과 `TrustedState`의 SSOT | 실행 권한 `request`·`response` 전달 |
| `.ay-ple/semester.sqlite`, 기준 개체와 MarkdownProjection | 실행 `thread` 저장과 재개·목록·불러오기 |
| 제품 감사 기록: 누가 어떤 근거와 StatePatch를 승인·수정·거절했는가 | 중단과 진행 중 `turn` 생명주기 |

중요한 의미 구분이 하나 있다. ACP의 `requestPermission`은 셸·파일·도구 실행의 **실행 환경 안전 승인**이다. AY-PLE의 `UserDecisionRequest`와 `Review`는 학업 상태 변경의 **제품 의사결정**이다. UI에서 비슷하게 보일 수 있어도 같은 객체로 합치면 안 된다.

### 캠프 이후 채택 시 가능한 경계

```text
AY-PLE Review Workspace / ChatSidecar
              |
        AY-PLE 제품 API
  (ModelingRun, StatePatch, Review, 감사 기록)
              |
         선택적 ACP 변환
  (이식성 기준선 + Codex 확장)
              |
 @agentclientprotocol/codex-acp 프로세스
              |
        Codex App Server
```

새 AY-PLE 인터페이스를 범용 `AgentRuntimeKernel`로 설계하지 않는 원칙은 유지한다. 캠프 동안 Codex 원본 형식은 통합 내부에 가두고, 제품에는 ModelingRun 시작, 진행 중 정정·중단, 사용자 판단·실행 권한 응답, AY 진행 활동 관측처럼 제품 기능 단위의 좁은 인터페이스만 노출한다. 이후 OpenCode ACP를 시험하더라도 제품 모델을 최소공배수 에이전트 프로토콜로 축소하지 않는다.

## 후속 선택 경로

| 조건 | 선택 | 이유 | 받아들일 비용 |
| --- | --- | --- | --- |
| 4주 제품 범위에서 Codex App Server의 의미와 CoControl 기능 보존이 필요 | **Codex App Server 직접 사용** | 진행 중 정정, 상세 생명주기 식별자, 사용자 입력 요청, 새 Codex 이벤트를 가장 먼저 관측 | 프로토콜·버전 추종과 깊은 호스트 모듈 유지 |
| 캠프 이후 이식성 기준선이 필요 | **ACP Codex** | 세션, 메시지, 도구, 중단, 승인의 공통 변환을 재사용 | 빠진 Codex 기능을 확장 또는 제한된 UX로 명시 |
| Codex만 필요하고 대화형 승인·세션 관리가 MVP가 아님 | **공식 Codex TS SDK** | OpenAI가 유지하는 가장 얇은 상위 API | App Server가 아니며 대화형 요청을 잃음 |
| Codex와 OpenCode를 실제 비교하고 싶음 | **같은 ACP 클라이언트로 `codex-acp`와 `opencode acp` A/B** | 새 독자 `AgentRuntimeKernel` 없이 실행 엔진 경계 검증 | ACP 기능 차이를 제품 정책으로 다뤄야 함 |
| Pi까지 반드시 동일 API로 묶고 싶음 | **AI SDK Harness 검증** | 이미 Codex·Pi 등의 어댑터와 세션 추상화가 존재 | 실험적 상태, 샌드박스 제약, Codex 승인 기능 손실 |
| 로컬 코딩 에이전트 전체를 가져오고 싶음 | **OpenCode 헤드리스 서버** | 서버·세션·권한·저장소가 즉시 사용 가능한 형태로 결합됨 | Bun과 큰 실행 엔진을 제품 의존성으로 수용 |
| 작고 조립 가능한 로컬 엔진이 중요 | **Pi `coding-agent` SDK/RPC** | 세션·도구·확장을 낮은 계층에서 제어 | App Server 호환 없음, 샌드박스·권한·UI 조립 필요 |
| AY-PLE 전용 Review 흐름이 코딩 실행기보다 중요 | **OpenAI Agents SDK 또는 LangGraph를 제품 조율에 사용** | 영속 세션, HITL, 작업 흐름이 제품 문제에 더 직접적 | Codex의 코딩 에이전트 기능과 작업공간 의미를 다시 조립 |

## 검증 제안

### 검증 A — ACP Codex 수직 흐름 (캠프 이후)

Codex를 직접 사용하는 제품 수직 흐름이 완성되고 두 번째 실행 엔진 요구가 생기면 현재 구현을 바로 삭제하지 않고, 같은 의미의 시나리오를 작은 프로토콜 검증 뒤에서 나란히 비교한다.

| 검증 항목 | 검증 시나리오 | 통과 기준 |
| --- | --- | --- |
| 시작·스트리밍 | 새 세션에서 `prompt`, `text`와 최소 한 종류의 상세 이벤트 수신 | 순서가 안정적이고 원본 Codex 형식이 제품 API로 새지 않음 |
| 여러 `turn` | 같은 세션에서 두 번째 프롬프트 | 맥락이 이어지고 세션 ID 연결이 안정적 |
| 목록·불러오기·재개 | 호스트 프로세스를 완전히 종료·재시작한 뒤 세션 조회와 후속 `turn` | 건너뛴 상위 프로젝트 테스트에 의존하지 않고 AY-PLE 환경에서 실제 통과 |
| 중단 | 스트리밍 도중 중단, 즉시 후속 요청, 이미 끝난 `turn` 중단 | UI가 영구 `cancelling`에 남지 않고 결정적인 종료 사유를 가짐 |
| 승인 | 명령·파일 요청 승인, 거절, 클라이언트 연결 해제 | 요청이 정확한 세션에 연결되고 연결 해제 때 안전하게 거절됨 |
| 동시성 | 두 세션의 동시 스트리밍·중단 | 이벤트와 승인이 세션 사이에 섞이지 않음 |
| 정책 | 작업공간 경로, `sandbox`, 승인 방식, 인증 프로필 | AY-PLE 정책이 명시적으로 전달되고 기본값에 암묵 의존하지 않음 |
| 버전 차이 | 고정된 ACP·Codex 조합과 업그레이드 스모크 테스트 | 버전 불일치가 명확한 시작 실패 또는 테스트 실패로 드러남 |
| 코드 경제성 | 기존 `CodexRawClient`·어댑터와 신규 얇은 호스트 비교 | 기능을 이중 유지하지 않고, 통과 후 제거 가능한 코드가 추가 코드보다 분명히 큼 |

검증 A가 추후 통과하면 다음 순서로 이동할 수 있다.

1. 현재 직접 경로를 유지한 채 ACP 호스트 어댑터를 병렬 검증으로 추가한다.
2. 기본 ACP에 없는 `turn/steer` 기반 진행 중 정정, Codex 생명주기 식별자, 사용자 입력 요청, 원본 이벤트를 확장 또는 보조 경로로 보존한다.
3. 이미 완성된 `SourceSelection → CoControl → Review → TrustedState` 제품 계약이 의미 손실 없이 유지되는지 확인한다.
4. 통과한 경우에만 직접 어댑터와 ACP 어댑터의 삭제 가능한 코드, 업그레이드 비용, 확장 유지비를 비교해 전환 여부를 결정한다.
5. 전환을 선택했다면 이전 `CodexRawClient` 테스트를 이전 동작 일치 테스트로 한시 유지하고, 실행 엔진 JSON 이력은 제품 감사 기록과 분리된 진단 캐시로 재평가한다.

### 검증 B — 선택적 이식성 비교

검증 A 후에도 다중 엔진이 실제 제품 요구라면 동일한 다섯 시나리오만 비교한다: 세션 생성·재개, 상세 스트리밍, 중단, 권한, 재시작. 첫 비교 후보는 같은 ACP 클라이언트에 붙일 수 있는 `opencode acp`이며, Pi가 꼭 필요할 때만 AI SDK Harness 또는 Pi RPC 어댑터를 별도 검증한다.

이 순서가 중요한 이유는 “언젠가 여러 엔진”이라는 가능성만으로 또 하나의 자체 범용 `AgentRuntimeKernel`을 만드는 일을 피하기 위해서다. 표준 프로토콜로 실제 두 엔진이 붙을 때만 이식성이 입증된다.

## 채택하지 않을 것

| 대상 | 이유 |
| --- | --- |
| OpenClaw Codex 하위 트리만 복사해 AY-PLE용으로 축소 | 기능은 가장 풍부하지만 세션·게이트웨이·플러그인 API 결합과 코드 표면이 커서 상위 프로젝트 추종 비용이 높다. 전체 OpenClaw를 채택하지 않는다면 참고 구현으로 쓰는 편이 낫다. |
| `cola-io/codex-acp`를 새 기준으로 채택 | [v0.4.2 소스](https://github.com/cola-io/codex-acp/tree/6688252733210c286479d4c29aef57018a460baa)는 Rust Codex 핵심 라이브러리를 Git 의존성으로 내장하는 과거 경로이며 App Server 클라이언트가 아니다. 새 ACP TypeScript 어댑터보다 결합·업데이트 위험이 크다. |
| Open WebUI 포크를 실행 엔진 해법으로 취급 | Pipe 뒤 백엔드가 여전히 필요하고 AY-PLE의 근거·검토 작업공간을 제공하지 않는다. 브랜딩 제한도 있다. |
| Vercel Harness를 검증 없이 새 핵심 계층으로 채택 | 명시적으로 실험적이며 Codex 어댑터가 App Server·승인 요구를 충족하지 않는다. |
| ACP와 별도로 여섯 가지 이벤트 범용 프로토콜을 계속 확대 | 도구, 권한, 추론, 검토가 추가될수록 표준 ACP와 같은 프로토콜을 다시 만들게 된다. 제품 계층에는 범용 이벤트보다 AY-PLE 제품 기능을 노출해야 한다. |

## 최종 추천

현재 1주차 Runtime Harness는 “Codex를 실제로 구동하고 중단과 이력의 위험을 발견했다”는 점에서 가치가 있었다. 다음 단계는 범용 실행 기반을 더 단단하게 만들거나 ACP로 즉시 교체하는 것이 아니라 **Codex가 직접 제공하는 상호작용을 AY-PLE의 CoControl로 제품화하는 것**이다.

**현재 결정:** Codex App Server를 4주 제품의 주 실행 기반으로 직접 사용한다. `AgentRuntimeKernel`은 단일 실행 진단 모듈로 한정한다. 제품에서는 같은 Codex `thread`를 이어 쓰는 작업 맥락, Codex 이벤트 관측, 진행 중 정정·중단, 작업 중 요청, AY-PLE 상태로의 변환을 구현한다. AY-PLE는 CoControl 정책, 근거 변환, Review와 UserConfirmation의 감사 기록, TrustedState를 소유한다.

ACP와 `acp-ui`는 캠프 이후 이식성 검증 후보로 남긴다. 제품 UI는 현재 Review Workspace와 ChatSidecar를 유지하며, Open WebUI는 보조 채팅 또는 운영 화면이 필요할 때만 별도로 검토한다.

## 주요 원문 목록

모든 외부 판단은 아래 원문 또는 고정한 소스에서 확인했다.

### OpenAI Codex

- [App Server protocol README, commit `1f0566d`](https://github.com/openai/codex/blob/1f0566d3f59298d1bb88820a0d35294f1eeb07ea/codex-rs/app-server/README.md)
- [App Server Client README](https://github.com/openai/codex/blob/1f0566d3f59298d1bb88820a0d35294f1eeb07ea/codex-rs/app-server-client/README.md)
- [TypeScript SDK README](https://github.com/openai/codex/blob/1f0566d3f59298d1bb88820a0d35294f1eeb07ea/sdk/typescript/README.md)
- [Python SDK README and API reference](https://github.com/openai/codex/tree/1f0566d3f59298d1bb88820a0d35294f1eeb07ea/sdk/python)
- [Python SDK App Server client](https://github.com/openai/codex/blob/1f0566d3f59298d1bb88820a0d35294f1eeb07ea/sdk/python/src/openai_codex/client.py)
- [Codex Apache-2.0 license](https://github.com/openai/codex/blob/1f0566d3f59298d1bb88820a0d35294f1eeb07ea/LICENSE)

### ACP

- [Codex ACP README, commit `8aff492`](https://github.com/agentclientprotocol/codex-acp/blob/8aff492d4b033ff2c02ad3b9d591994d57617463/README.md)
- [Codex ACP package metadata](https://github.com/agentclientprotocol/codex-acp/blob/8aff492d4b033ff2c02ad3b9d591994d57617463/package.json)
- [ACP TypeScript SDK README, v1.2.1 source](https://github.com/agentclientprotocol/typescript-sdk/blob/26da1ae7ab66fae0f5e77272dee3e5d562d24aee/README.md)
- [OpenCode ACP service](https://github.com/anomalyco/opencode/blob/d0ba5389248e05546849b9f69b7bc417aa5fd5d7/packages/opencode/src/acp/service.ts)

### AI SDK Harness

- [Harness README, commit `1146118`](https://github.com/vercel/ai/blob/1146118a134946b1c33fc4dee17ed5446582f531/packages/harness/README.md)
- [HarnessAgent session documentation](https://github.com/vercel/ai/blob/1146118a134946b1c33fc4dee17ed5446582f531/content/docs/03-ai-sdk-harnesses/02-harness-agent.mdx)
- [Codex Harness implementation](https://github.com/vercel/ai/blob/1146118a134946b1c33fc4dee17ed5446582f531/packages/harness-codex/src/codex-harness.ts)
- [Pi Harness README](https://github.com/vercel/ai/blob/1146118a134946b1c33fc4dee17ed5446582f531/packages/harness-pi/README.md)

### Pi

- [Pi v0.80.6 release](https://github.com/earendil-works/pi/releases/tag/v0.80.6)
- [Coding Agent SDK](https://github.com/earendil-works/pi/blob/v0.80.6/packages/coding-agent/docs/sdk.md#L3-L155)
- [RPC protocol](https://github.com/earendil-works/pi/blob/v0.80.6/packages/coding-agent/docs/rpc.md#L1-L76)
- [Session tree format](https://github.com/earendil-works/pi/blob/v0.80.6/packages/coding-agent/docs/sessions.md#L1-L145)
- [Security and sandbox scope](https://github.com/earendil-works/pi/blob/v0.80.6/packages/coding-agent/docs/security.md#L3-L37)
- [OpenAI Codex provider implementation](https://github.com/earendil-works/pi/blob/v0.80.6/packages/ai/src/providers/openai-codex.ts#L7-L17)
- [Pi MIT license](https://github.com/earendil-works/pi/blob/v0.80.6/LICENSE)

### OpenCode와 다른 대체 실행 엔진

- [OpenCode SDK server launcher](https://github.com/anomalyco/opencode/blob/d0ba5389248e05546849b9f69b7bc417aa5fd5d7/packages/sdk/js/src/server.ts)
- [OpenCode session HTTP API](https://github.com/anomalyco/opencode/blob/d0ba5389248e05546849b9f69b7bc417aa5fd5d7/packages/opencode/src/server/routes/instance/httpapi/groups/session.ts)
- [OpenCode permission HTTP API](https://github.com/anomalyco/opencode/blob/d0ba5389248e05546849b9f69b7bc417aa5fd5d7/packages/opencode/src/server/routes/instance/httpapi/groups/permission.ts)
- [OpenCode SQLite persistence](https://github.com/anomalyco/opencode/blob/d0ba5389248e05546849b9f69b7bc417aa5fd5d7/packages/core/src/database/database.ts#L22-L54)
- [OpenAI Agents JS sessions](https://github.com/openai/openai-agents-js/blob/04807e33347b2b92bdde7685d83d84f1bc144c6d/docs/src/content/docs/guides/sessions.mdx)
- [OpenAI Agents JS human-in-the-loop](https://github.com/openai/openai-agents-js/blob/04807e33347b2b92bdde7685d83d84f1bc144c6d/docs/src/content/docs/guides/human-in-the-loop.mdx)
- [LangGraph core README](https://github.com/langchain-ai/langgraphjs/blob/ada0b67696d2dadb59c2f274f45c585aa4fef0e4/libs/langgraph-core/README.md)

### UI와 대형 참고 구현

- [ACP UI, commit `cd9c3cb`](https://github.com/formulahendry/acp-ui/tree/cd9c3cb464a4b321bff652101953a64c07473e31)
- [Kanna README and React client](https://github.com/jakemor/kanna/tree/9873d72523102a968eefbeee604da1a94a7a6203)
- [Kanna Codex App Server bridge](https://github.com/jakemor/kanna/blob/9873d72523102a968eefbeee604da1a94a7a6203/src/server/codex-app-server.ts)
- [Kanna modified license](https://github.com/jakemor/kanna/blob/9873d72523102a968eefbeee604da1a94a7a6203/LICENSE)
- [OpenClaw Codex extension README](https://github.com/openclaw/openclaw/blob/3bec587d742f675c3fd219646b0ba3c2c0eaaccb/extensions/codex/README.md)
- [OpenClaw MIT license](https://github.com/openclaw/openclaw/blob/3bec587d742f675c3fd219646b0ba3c2c0eaaccb/LICENSE)
- [Open WebUI Pipe documentation](https://docs.openwebui.com/features/plugin/functions/pipe/)
- [Open WebUI license](https://github.com/open-webui/open-webui/blob/main/LICENSE)

## 불확실성과 후속 확인

아래 항목은 4주 안에 ACP를 도입하기 위한 선행 작업이 아니라, 캠프 이후 ACP 채택을 다시 검토할 때 확인할 사항이다.

| 불확실성 | 현재 근거 | 필요한 확인 |
| --- | --- | --- |
| ACP Codex 재시작 후 세션 재개 안정성 | API는 구현돼 있으나 상위 프로젝트 E2E가 불안정한 테스트라는 이유로 건너뜀 | 실제 AY-PLE 홈·작업공간에서 프로세스 재시작 통합 테스트 |
| ACP와 Codex 버전 차이 | 패키지가 `@openai/codex ^0.144.0`을 번들하고 프로토콜이 빠르게 변하는 시기 | 정확한 버전 고정, 시작·스키마 호환성 스모크 테스트 |
| 중단 종료 의미 | `turn` 중단과 경쟁 조건 처리는 구현됨 | 중단 직후·완료 직후·연결 손실 시 UI 상태 표 |
| AY-PLE 실행 권한과 제품 Review UX의 공존 | 프로토콜 개념은 분리돼 있음 | 두 `request` 형식의 대기열, 안내 문구, 감사 기록 스키마 시제품 |
| ACP UI의 제품 적합성 | [세션 저장소](https://github.com/formulahendry/acp-ui/blob/cd9c3cb464a4b321bff652101953a64c07473e31/src/stores/session.ts)와 [ACP 브리지](https://github.com/formulahendry/acp-ui/blob/cd9c3cb464a4b321bff652101953a64c07473e31/src/lib/acp-bridge.ts)에 `create`·`load`·`replay`·`approval`·`cancel`은 있지만 ACP 세션 탐색·삭제는 없음 | 새 Codex ACP 명령으로 구동해 승인·세션 UX를 짧게 확인하고, AY-PLE 제품 UI 채택 여부는 별도 판단 |
| OpenCode ACP 기능 일치 | ACP 서버가 목록·불러오기·재개·중단 등을 구현 | 같은 ACP 동작 일치 시나리오를 Codex와 나란히 실행 |

이 불확실성들은 범용 실행 기반을 계속 확대하거나 ACP를 즉시 채택해야 한다는 근거가 아니다. 캠프 이후 외부 구현을 채택할 때 완성된 AY-PLE CoControl 시나리오를 작고 명시적인 의미 일치 테스트로 사용해야 한다는 근거다.
