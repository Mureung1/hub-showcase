@GitHub
당신은 이 프로젝트와 이해관계가 없는 독립적인 Principal Engineer이자 Product Architect입니다.

저를 안심시키거나 현재 계획을 정당화하려 하지 말고, 이 프로젝트가 잘못된 문제를 풀거나 이미 해결된 문제를 재발명하고 있는지 냉정하게 검토해 주세요.

## 검토 대상

다음 GitHub commit을 기준으로 저장소를 읽어 주세요.

https://github.com/swh3467/hub/tree/b838bdc3d76ac1b2a9074107af908a6bb664a37d

우선순위가 높은 문서는 다음과 같습니다.

1. `docs/product/ay-ple-product-brief.md`
2. `docs/product/ay-ple-overview.md`
3. `docs/wayfinding/codex-chat-application-foundation/map.md`
4. `docs/wayfinding/codex-chat-application-foundation/tickets/001-foundation-capability-envelope.md`
5. `docs/wayfinding/codex-chat-application-foundation/assets/current-chat-overlap-audit.md`
6. `docs/wayfinding/codex-chat-application-foundation/assets/account-config-adoption-surface.md`
7. `docs/architecture/codex-chat-implementation-map.md`
8. `docs/adr/0006-separate-package-app-data-and-semester-workspace-roots.md`
9. `docs/adr/0009-use-a-macos-first-local-web-app-product-path.md`
10. `docs/adr/0011-reuse-official-codex-python-sdk-for-chat-shell.md`
11. `docs/adr/0012-adopt-codex-chat-only-and-remove-legacy-runtime-surfaces.md`

GitHub 접근이 불가능하면 추측해서 답하지 말고, 필요한 파일을 업로드해 달라고 요청해 주세요.

## 프로젝트 상황

AY-PLE는 장기적으로 왼쪽 자료 pane, 중앙 IDE·Workbench, 오른쪽 Chat companion으로 구성되는 학업용 애플리케이션을 지향합니다.

그러나 AY-PLE 고유 학업 기능은 아직 거의 구현되지 않았습니다. 현재 구현은 다음 정도입니다.

- Exact pinned Codex App Server와 official Python SDK 사용
- Node↔Python bridge
- Express의 네 Chat route
- 단일 process-global conversation/turn lease
- Browser tab-memory transcript
- 임시 2-pane Chat Shell

우리는 제품 기능을 올리기 전에 안정적인 “일반 Codex Chat application foundation”을 만들려 했습니다. 그 과정에서 account readiness, workspace, multi-conversation, reload/restart, reconnect, multi-client, pending interaction, approvals, local companion lifecycle과 security를 Wayfinder로 조사하고 있습니다.

최근 방향을 build-first에서 adopt-first로 바꿨습니다.

`App Server → official SDK → first-party client → mature OSS/platform donor → confirmed residual만 새로 설계`

002는 current custom overlap을 조사했고, 003은 account/config를 조사했습니다. 003에서는 native account lifecycle 대부분을 direct reuse할 수 있지만 post-login convergence와 effective config assertion 같은 일부 gap이 확인됐습니다.

그런데 저는 여전히 다음 의심을 갖고 있습니다.

> 우리가 뭔가 더 근본적인 선택지를 놓친 채, “일반 Chat foundation을 직접 만들어야 한다”는 전제 안에서 불필요한 복잡성을 정교하게 관리하고 있는 것은 아닌가?

## 가장 중요한 질문

다음 두 질문을 분리해서 검토해 주세요.

1. 현재 Wayfinder가 각 문제를 adopt-first로 조사하는 방식은 합리적인가?
2. 그보다 앞서, AY-PLE가 독립적인 일반 Chat application foundation을 만드는 것 자체가 잘못된 제품·architecture 선택일 가능성은 없는가?

두 번째 질문을 더 중요하게 다뤄 주세요.

## 반드시 검토할 대안

다음 대안을 최소한 비교하되, 더 나은 framing이 있으면 새로 제안해 주세요.

1. 현재 Wayfinder를 계속 진행하고 최소 residual만 구현
2. Codex App Server에 아주 얇은 Browser projection만 추가
3. Codex App·CLI·IDE extension의 skill/plugin/MCP 등을 AY-PLE 진입점으로 사용
4. Open WebUI, OpenCode 또는 다른 성숙한 OSS client를 채택·fork·확장
5. 독립적인 일반 Chat app은 만들지 않고 AY-PLE의 3-pane product shell부터 만든 뒤 Chat은 최소 companion으로 삽입
6. 현재 custom runtime/Server를 유지하되 일반 Chat 기능 확장을 중단하고 AY-PLE domain 기능으로 바로 이동

각 대안에 대해 다음을 비교해 주세요.

- 실제로 재사용되는 기존 기능
- 우리가 새로 소유해야 하는 코드와 lifecycle
- AY-PLE 고유 가치에 도달하기까지의 거리
- upstream 변화 추종 비용
- security·auth·workspace·reconnect 복잡성
- 향후 3-pane 제품 UX와의 적합성
- 버리거나 유지할 현재 코드
- 가장 위험한 숨은 전제

## 기존 결정을 그대로 믿지 마세요

ADR 0006·0009·0011·0012는 현재 채택된 제약이지만 절대적인 전제로 취급하지 마세요.

어떤 ADR이 불필요한 복잡성의 근원이라면 다음을 명시해 주세요.

- 어떤 결정을 reopen해야 하는가
- 기존 결정이 당시에는 왜 합리적이었는가
- 지금 어떤 새로운 evidence 때문에 다시 봐야 하는가
- 대체 결정은 무엇인가

반대로 ADR을 유지해야 한다면 그 이유도 설명해 주세요.

## 특히 의심해 볼 부분

- “제품 기능 전에 완전한 일반 Chat 앱이 필요하다”는 순서
- Multi-conversation, two-client, reconnect, approval 전체가 지금 필요한지
- macOS local web companion이라는 surface가 complexity를 만드는지
- App-managed `CODEX_HOME`과 workspace 격리가 정말 custom architecture를 요구하는지
- Official SDK의 missing seam을 모두 우리가 메워야 한다고 보는 태도
- 기존 Runtime hardening을 sunk cost 때문에 보존하고 있지는 않은지
- 003 같은 작은 residual을 발견할 때마다 새 application 책임으로 승격하고 있지는 않은지
- 실제 필요한 것은 Chat “application”이 아니라 AY-PLE action을 실행하는 얇은 Codex companion인지
- Wayfinder가 fog를 줄이기보다 조사 backlog 자체를 정교하게 만드는 도구가 되고 있지는 않은지

## 요구하는 답변 형식

### 1. Blunt verdict

한 문장으로 가장 솔직한 진단을 내려 주세요.

다음 중 하나 또는 더 나은 표현을 선택하세요.

- 현재 방향을 계속한다
- Wayfinder를 크게 축소한다
- Chat foundation을 제품 Shell에 종속된 얇은 companion으로 재정의한다
- 기존 Codex/OSS surface 위로 이동한다
- 독립 Chat foundation을 중단한다

### 2. 놓치고 있는 핵심 insight

우리가 아직 명시적으로 인식하지 못한 가장 중요한 framing mistake나 simplification을 1–3개 제시해 주세요.

### 3. Complexity audit

다음 열을 가진 표로 정리해 주세요.

| Problem surface | Existing owner | AY-PLE가 정말 소유해야 하는 residual | 현재 계획의 과잉 여부 | Recommendation |
| --- | --- | --- | --- | --- |

Account, config roots, workspace, conversation catalog, transcript, reconnect, multi-client, approvals, local process lifecycle, Browser authorization, Chat UI를 포함해 주세요.

### 4. Architecture options

현실적인 2–4개 option을 비교하고 하나를 추천해 주세요. 추천 이유뿐 아니라 다른 option을 버리는 이유도 명시해 주세요.

### 5. Wayfinder ticket disposition

현재 남은 ticket을 다음으로 분류해 주세요.

- 계속 조사
- 다른 ticket과 합침
- 009 adoption gate까지 보류
- 제품 layer 이후로 defer
- 제거
- 새로운 상위 질문으로 대체

대상은 004–009, 013–015, 017, 020, 021입니다.

각 ticket의 파일을 실제로 읽고 판단해 주세요.

### 6. 최소 다음 행동

코드를 구현하는 계획이 아니라, 방향을 확정하기 위한 다음 1–3개 decision 또는 experiment만 제시해 주세요.

각 항목에는 다음을 포함하세요.

- 답하려는 질문
- 가장 작은 evidence
- stop condition
- 결과에 따라 어떤 계획을 삭제하거나 유지할지

### 7. What not to build

현재 단계에서 만들지 말아야 할 것들을 명확하게 적어 주세요.

### 8. Confidence와 missing evidence

판단의 confidence를 표시하고, 결론을 뒤집을 수 있는 missing evidence를 적어 주세요.

## 검토 원칙

- 기존 ticket이 존재한다는 이유로 그 질문이 필요하다고 가정하지 마세요.
- 이미 투자한 코드량을 보존 이유로 사용하지 마세요.
- Codex semantics는 exact pinned source와 official source를 우선하세요.
- OSS는 Codex semantics의 authority가 아니라 product/UX/lifecycle donor로 평가하세요.
- 최신 Codex 제품 surface에 대한 주장은 official OpenAI 자료로 검증하고 링크를 제공하세요.
- OSS에 대한 주장은 exact source·version·license를 인용하세요.
- 사실, inference, recommendation을 명확히 구분하세요.
- Generic provider abstraction이나 미래의 가상 요구를 제안하지 마세요.
- 구현 세부 설계보다 “어떤 surface를 소유할 것인가”를 먼저 판단하세요.
- 필요하다면 제 전제와 현재 Wayfinder destination 자체를 직접 반박하세요.
