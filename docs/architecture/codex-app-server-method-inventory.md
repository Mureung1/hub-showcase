# Codex App Server 전체 raw method 목록

분류: 활성

성숙도: 구현됨

> 이 문서는 generated artifact다. 직접 수정하지 않고 `npm run generate:codex-methods -w @ay-ple/runtime-codex`로 다시 생성한다.

Pinned generated schema가 전체 raw method 목록을 소유하고, [codex-method-decisions.json](../../packages/runtime-codex/codex-method-decisions.json)은 AY-PLE가 검토한 method의 연결 단계와 채택 판단만 덧붙이는 sparse overlay다. JSON에 없는 method도 `schema-only`·`unreviewed` 기본값으로 이 문서에 나타난다.

`stable`은 기본 generated schema에 존재하고 `experimental`은 `generate-ts --experimental`에서만 추가되는 method다. `연결 단계`는 제품용 Codex Client 경로에서 명시적으로 구현한 가장 먼 단계를 뜻하며, generic notification transport나 developer-only Runtime Harness가 method를 우연히 통과시키는 것은 승격 근거로 보지 않는다.

| 항목 | 값 |
| --- | --- |
| Codex 패키지 | `@openai/codex@0.144.0` |
| Stable method 수 | 170 |
| Experimental-only method 수 | 36 |
| 전체 method 수 | 206 |

| 연결 단계 | 의미 |
| --- | --- |
| `schema-only` | Pinned schema에서만 확인했으며 제품용 wrapper가 없다. |
| `raw-wrapper` | `packages/runtime-codex`의 generated-schema-backed wrapper가 있다. |
| `client-host` | Headless Codex Client Host Interface에 연결됐다. |
| `web-adapter` | Browser-safe adapter로 노출됐다. |
| `product-ui` | 제품 React shell에서 사용할 수 있다. |

| 채택 | 의미 |
| --- | --- |
| `unreviewed` | AY-PLE 채택 여부를 아직 판단하지 않았다. |
| `baseline` | Codex Client Baseline에 포함한다. |
| `later` | 유효하지만 baseline 이후에 다룬다. |
| `case-driven` | 구체적인 제품 use case가 생길 때 검토한다. |
| `excluded` | AY-PLE에서 사용하지 않기로 결정했다. |

## Client 요청

| Method 식별자 | 성숙도 | 연결 단계 | 채택 | 비고 |
| --- | --- | --- | --- | --- |
| `account/login/cancel` | stable | schema-only | baseline |  |
| `account/login/start` | stable | schema-only | baseline | ChatGPT managed browser login |
| `account/logout` | stable | schema-only | baseline |  |
| `account/rateLimitResetCredit/consume` | stable | schema-only | unreviewed |  |
| `account/rateLimits/read` | stable | schema-only | baseline |  |
| `account/read` | stable | schema-only | baseline |  |
| `account/sendAddCreditsNudgeEmail` | stable | schema-only | unreviewed |  |
| `account/usage/read` | stable | schema-only | later |  |
| `account/workspaceMessages/read` | stable | schema-only | unreviewed |  |
| `app/list` | stable | schema-only | unreviewed |  |
| `command/exec` | stable | schema-only | unreviewed |  |
| `command/exec/resize` | stable | schema-only | unreviewed |  |
| `command/exec/terminate` | stable | schema-only | unreviewed |  |
| `command/exec/write` | stable | schema-only | unreviewed |  |
| `config/batchWrite` | stable | schema-only | unreviewed |  |
| `config/mcpServer/reload` | stable | schema-only | unreviewed |  |
| `config/read` | stable | schema-only | later | Model 설정 소유 범위를 정한 뒤 연결 |
| `config/value/write` | stable | schema-only | later | Model 설정 소유 범위를 정한 뒤 연결 |
| `configRequirements/read` | stable | schema-only | unreviewed |  |
| `experimentalFeature/enablement/set` | stable | schema-only | unreviewed |  |
| `experimentalFeature/list` | stable | schema-only | unreviewed |  |
| `externalAgentConfig/detect` | stable | schema-only | unreviewed |  |
| `externalAgentConfig/import` | stable | schema-only | unreviewed |  |
| `externalAgentConfig/import/readHistories` | stable | schema-only | unreviewed |  |
| `feedback/upload` | stable | schema-only | unreviewed |  |
| `fs/copy` | stable | schema-only | unreviewed |  |
| `fs/createDirectory` | stable | schema-only | unreviewed |  |
| `fs/getMetadata` | stable | schema-only | unreviewed |  |
| `fs/readDirectory` | stable | schema-only | unreviewed |  |
| `fs/readFile` | stable | schema-only | unreviewed |  |
| `fs/remove` | stable | schema-only | unreviewed |  |
| `fs/unwatch` | stable | schema-only | unreviewed |  |
| `fs/watch` | stable | schema-only | unreviewed |  |
| `fs/writeFile` | stable | schema-only | unreviewed |  |
| `fuzzyFileSearch` | stable | schema-only | unreviewed |  |
| `getAuthStatus` | stable | raw-wrapper | later | 현재 Harness 호환 wrapper |
| `getConversationSummary` | stable | schema-only | unreviewed |  |
| `gitDiffToRemote` | stable | schema-only | unreviewed |  |
| `hooks/list` | stable | schema-only | unreviewed |  |
| `initialize` | stable | raw-wrapper | baseline | App Server 연결 handshake |
| `marketplace/add` | stable | schema-only | unreviewed |  |
| `marketplace/remove` | stable | schema-only | unreviewed |  |
| `marketplace/upgrade` | stable | schema-only | unreviewed |  |
| `mcpServer/oauth/login` | stable | schema-only | unreviewed |  |
| `mcpServer/resource/read` | stable | schema-only | unreviewed |  |
| `mcpServer/tool/call` | stable | schema-only | unreviewed |  |
| `mcpServerStatus/list` | stable | schema-only | unreviewed |  |
| `model/list` | stable | schema-only | baseline | Baseline에서는 현재 model 표시 |
| `modelProvider/capabilities/read` | stable | schema-only | unreviewed |  |
| `permissionProfile/list` | stable | schema-only | unreviewed |  |
| `plugin/install` | stable | schema-only | unreviewed |  |
| `plugin/installed` | stable | schema-only | unreviewed |  |
| `plugin/list` | stable | schema-only | unreviewed |  |
| `plugin/read` | stable | schema-only | unreviewed |  |
| `plugin/share/checkout` | stable | schema-only | unreviewed |  |
| `plugin/share/delete` | stable | schema-only | unreviewed |  |
| `plugin/share/list` | stable | schema-only | unreviewed |  |
| `plugin/share/save` | stable | schema-only | unreviewed |  |
| `plugin/share/updateTargets` | stable | schema-only | unreviewed |  |
| `plugin/skill/read` | stable | schema-only | unreviewed |  |
| `plugin/uninstall` | stable | schema-only | unreviewed |  |
| `review/start` | stable | schema-only | case-driven |  |
| `skills/config/write` | stable | schema-only | unreviewed |  |
| `skills/extraRoots/set` | stable | schema-only | unreviewed |  |
| `skills/list` | stable | schema-only | baseline | 활성 workspace의 native Skills discovery |
| `thread/approveGuardianDeniedAction` | stable | schema-only | unreviewed |  |
| `thread/archive` | stable | schema-only | baseline |  |
| `thread/compact/start` | stable | schema-only | case-driven | 제품 수준 context UX 평가 뒤 검토 |
| `thread/delete` | stable | schema-only | later |  |
| `thread/fork` | stable | schema-only | later |  |
| `thread/goal/clear` | stable | schema-only | case-driven |  |
| `thread/goal/get` | stable | schema-only | case-driven |  |
| `thread/goal/set` | stable | schema-only | case-driven |  |
| `thread/inject_items` | stable | schema-only | case-driven |  |
| `thread/list` | stable | raw-wrapper | baseline | 활성 workspace cwd로 대화 목록 필터링 |
| `thread/loaded/list` | stable | raw-wrapper | later |  |
| `thread/metadata/update` | stable | schema-only | unreviewed |  |
| `thread/name/set` | stable | schema-only | baseline |  |
| `thread/read` | stable | raw-wrapper | baseline | Turn을 포함한 transcript 복원 |
| `thread/resume` | stable | schema-only | baseline | 기존 대화 복원과 multi-turn 재개 |
| `thread/rollback` | stable | schema-only | excluded | App Server에서 deprecated된 method |
| `thread/shellCommand` | stable | schema-only | unreviewed |  |
| `thread/start` | stable | raw-wrapper | baseline | 활성 workspace에서 새 대화 시작 |
| `thread/unarchive` | stable | schema-only | unreviewed |  |
| `thread/unsubscribe` | stable | schema-only | baseline | Client Host subscription 수명 |
| `turn/interrupt` | stable | raw-wrapper | baseline |  |
| `turn/start` | stable | raw-wrapper | baseline | 같은 thread의 multi-turn 요청 |
| `turn/steer` | stable | raw-wrapper | later | Active-turn 정정 UX 검증 뒤 연결 |
| `windowsSandbox/readiness` | stable | schema-only | unreviewed |  |
| `windowsSandbox/setupStart` | stable | schema-only | unreviewed |  |
| `collaborationMode/list` | experimental | schema-only | later |  |
| `environment/add` | experimental | schema-only | unreviewed |  |
| `environment/info` | experimental | schema-only | unreviewed |  |
| `fuzzyFileSearch/sessionStart` | experimental | schema-only | unreviewed |  |
| `fuzzyFileSearch/sessionStop` | experimental | schema-only | unreviewed |  |
| `fuzzyFileSearch/sessionUpdate` | experimental | schema-only | unreviewed |  |
| `memory/reset` | experimental | schema-only | unreviewed |  |
| `mock/experimentalMethod` | experimental | schema-only | unreviewed |  |
| `process/kill` | experimental | schema-only | unreviewed |  |
| `process/resizePty` | experimental | schema-only | unreviewed |  |
| `process/spawn` | experimental | schema-only | unreviewed |  |
| `process/writeStdin` | experimental | schema-only | unreviewed |  |
| `remoteControl/client/list` | experimental | schema-only | unreviewed |  |
| `remoteControl/client/revoke` | experimental | schema-only | unreviewed |  |
| `remoteControl/disable` | experimental | schema-only | unreviewed |  |
| `remoteControl/enable` | experimental | schema-only | unreviewed |  |
| `remoteControl/pairing/start` | experimental | schema-only | unreviewed |  |
| `remoteControl/pairing/status` | experimental | schema-only | unreviewed |  |
| `remoteControl/status/read` | experimental | schema-only | unreviewed |  |
| `thread/backgroundTerminals/clean` | experimental | schema-only | unreviewed |  |
| `thread/backgroundTerminals/list` | experimental | schema-only | case-driven |  |
| `thread/backgroundTerminals/terminate` | experimental | schema-only | unreviewed |  |
| `thread/decrement_elicitation` | experimental | schema-only | unreviewed |  |
| `thread/increment_elicitation` | experimental | schema-only | unreviewed |  |
| `thread/items/list` | experimental | schema-only | later | Experimental pagination 관찰 대상 |
| `thread/memoryMode/set` | experimental | schema-only | unreviewed |  |
| `thread/realtime/appendAudio` | experimental | schema-only | unreviewed |  |
| `thread/realtime/appendSpeech` | experimental | schema-only | unreviewed |  |
| `thread/realtime/appendText` | experimental | schema-only | unreviewed |  |
| `thread/realtime/listVoices` | experimental | schema-only | unreviewed |  |
| `thread/realtime/start` | experimental | schema-only | case-driven |  |
| `thread/realtime/stop` | experimental | schema-only | unreviewed |  |
| `thread/search` | experimental | schema-only | unreviewed |  |
| `thread/settings/update` | experimental | schema-only | unreviewed |  |
| `thread/turns/list` | experimental | schema-only | later | Experimental pagination 관찰 대상 |

## Server 요청

| Method 식별자 | 성숙도 | 연결 단계 | 채택 | 비고 |
| --- | --- | --- | --- | --- |
| `account/chatgptAuthTokens/refresh` | stable | schema-only | unreviewed |  |
| `applyPatchApproval` | stable | schema-only | unreviewed |  |
| `attestation/generate` | stable | schema-only | unreviewed |  |
| `execCommandApproval` | stable | schema-only | unreviewed |  |
| `item/commandExecution/requestApproval` | stable | schema-only | baseline |  |
| `item/fileChange/requestApproval` | stable | schema-only | baseline |  |
| `item/permissions/requestApproval` | stable | schema-only | baseline |  |
| `item/tool/call` | stable | schema-only | case-driven |  |
| `item/tool/requestUserInput` | stable | schema-only | baseline |  |
| `mcpServer/elicitation/request` | stable | schema-only | case-driven |  |
| `currentTime/read` | experimental | schema-only | unreviewed |  |

## Server 알림

| Method 식별자 | 성숙도 | 연결 단계 | 채택 | 비고 |
| --- | --- | --- | --- | --- |
| `account/login/completed` | stable | schema-only | baseline |  |
| `account/rateLimits/updated` | stable | schema-only | baseline |  |
| `account/updated` | stable | schema-only | baseline |  |
| `app/list/updated` | stable | schema-only | unreviewed |  |
| `command/exec/outputDelta` | stable | schema-only | unreviewed |  |
| `configWarning` | stable | schema-only | baseline |  |
| `deprecationNotice` | stable | schema-only | unreviewed |  |
| `error` | stable | schema-only | baseline |  |
| `externalAgentConfig/import/completed` | stable | schema-only | unreviewed |  |
| `externalAgentConfig/import/progress` | stable | schema-only | unreviewed |  |
| `fs/changed` | stable | schema-only | unreviewed |  |
| `fuzzyFileSearch/sessionCompleted` | stable | schema-only | unreviewed |  |
| `fuzzyFileSearch/sessionUpdated` | stable | schema-only | unreviewed |  |
| `guardianWarning` | stable | schema-only | unreviewed |  |
| `hook/completed` | stable | schema-only | unreviewed |  |
| `hook/started` | stable | schema-only | unreviewed |  |
| `item/agentMessage/delta` | stable | schema-only | baseline |  |
| `item/autoApprovalReview/completed` | stable | schema-only | unreviewed |  |
| `item/autoApprovalReview/started` | stable | schema-only | unreviewed |  |
| `item/commandExecution/outputDelta` | stable | schema-only | baseline | Command activity 요약 |
| `item/commandExecution/terminalInteraction` | stable | schema-only | unreviewed |  |
| `item/completed` | stable | schema-only | baseline |  |
| `item/fileChange/outputDelta` | stable | schema-only | baseline | File change activity 요약 |
| `item/fileChange/patchUpdated` | stable | schema-only | baseline | File change activity 요약 |
| `item/mcpToolCall/progress` | stable | schema-only | baseline | Tool activity 요약 |
| `item/plan/delta` | stable | schema-only | baseline | 주요 activity card |
| `item/reasoning/summaryPartAdded` | stable | schema-only | unreviewed |  |
| `item/reasoning/summaryTextDelta` | stable | schema-only | unreviewed |  |
| `item/reasoning/textDelta` | stable | schema-only | unreviewed |  |
| `item/started` | stable | schema-only | baseline |  |
| `mcpServer/oauthLogin/completed` | stable | schema-only | unreviewed |  |
| `mcpServer/startupStatus/updated` | stable | schema-only | unreviewed |  |
| `model/rerouted` | stable | schema-only | unreviewed |  |
| `model/safetyBuffering/updated` | stable | schema-only | unreviewed |  |
| `model/verification` | stable | schema-only | unreviewed |  |
| `process/exited` | stable | schema-only | unreviewed |  |
| `process/outputDelta` | stable | schema-only | unreviewed |  |
| `rawResponseItem/completed` | stable | schema-only | unreviewed |  |
| `remoteControl/status/changed` | stable | schema-only | unreviewed |  |
| `serverRequest/resolved` | stable | schema-only | baseline |  |
| `skills/changed` | stable | schema-only | unreviewed |  |
| `thread/archived` | stable | schema-only | baseline |  |
| `thread/closed` | stable | schema-only | baseline |  |
| `thread/compacted` | stable | schema-only | unreviewed |  |
| `thread/deleted` | stable | schema-only | unreviewed |  |
| `thread/goal/cleared` | stable | schema-only | unreviewed |  |
| `thread/goal/updated` | stable | schema-only | unreviewed |  |
| `thread/name/updated` | stable | schema-only | baseline |  |
| `thread/realtime/closed` | stable | schema-only | unreviewed |  |
| `thread/realtime/error` | stable | schema-only | unreviewed |  |
| `thread/realtime/itemAdded` | stable | schema-only | unreviewed |  |
| `thread/realtime/outputAudio/delta` | stable | schema-only | unreviewed |  |
| `thread/realtime/sdp` | stable | schema-only | unreviewed |  |
| `thread/realtime/started` | stable | schema-only | unreviewed |  |
| `thread/realtime/transcript/delta` | stable | schema-only | unreviewed |  |
| `thread/realtime/transcript/done` | stable | schema-only | unreviewed |  |
| `thread/settings/updated` | stable | schema-only | baseline | 현재 model과 thread 설정 표시 |
| `thread/started` | stable | schema-only | baseline |  |
| `thread/status/changed` | stable | schema-only | baseline |  |
| `thread/tokenUsage/updated` | stable | schema-only | baseline | Context window와 token usage 표시 |
| `thread/unarchived` | stable | schema-only | unreviewed |  |
| `turn/completed` | stable | schema-only | baseline |  |
| `turn/diff/updated` | stable | schema-only | unreviewed |  |
| `turn/moderationMetadata` | stable | schema-only | unreviewed |  |
| `turn/plan/updated` | stable | schema-only | baseline | 주요 activity card |
| `turn/started` | stable | schema-only | baseline |  |
| `warning` | stable | schema-only | baseline |  |
| `windows/worldWritableWarning` | stable | schema-only | unreviewed |  |
| `windowsSandbox/setupCompleted` | stable | schema-only | unreviewed |  |

## Client 알림

| Method 식별자 | 성숙도 | 연결 단계 | 채택 | 비고 |
| --- | --- | --- | --- | --- |
| `initialized` | stable | raw-wrapper | baseline |  |
