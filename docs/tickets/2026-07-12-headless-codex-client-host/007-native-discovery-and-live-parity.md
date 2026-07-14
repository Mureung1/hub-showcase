# 007 — native Skills discovery와 live Host parity를 증명한다

## Agent triage

- State: wontfix
- Surface: local-ticket
- Next actor: none

## Parent Spec

`docs/specs/2026-07-12-headless-codex-client-host.md`

## Superseded

이 ticket의 모든 capability를 한곳에 둔 Host discovery/live 계약은 [ADR 0010](../../adr/0010-separate-codex-app-server-connection-from-conversation-runtime.md)과 활성 [Codex-native Client Redesign map](../../wayfinding/codex-native-client-redesign/map.md)이 대체했다. 사용하지 않는 method는 자동 포팅하지 않고 이름을 부여한 source 기반 tracer가 채택하며 아래 인수 조건은 당시 계획 근거로만 남긴다.

## What It Delivers

Host caller가 bound `workspaceRoot`의 native `skills/list` 결과를 product-safe summary로 조회하고 빈 결과와 discovery failure를 구분할 수 있다. Child process `cwd`, `thread/start.cwd`와 `skills/list.cwds`가 모두 exact workspace를 사용하며 Host는 filesystem scan, `SKILL.md` parser나 별도 instruction engine을 만들지 않는다.

같은 계약을 package-owned pinned Codex binary로 선택 실행하는 Host 전용 live parity command가 제공된다. 기존 인증 상태를 preflight한 환경에서 한 generation의 두 thread, 같은 thread의 순차 turn, streaming/terminal correlation과 sentinel Skill discovery를 실제 App Server로 확인한다.

## Spec Traceability

- User stories: 1, 2, 3, 5
- Implementation contract: `Product runtime layout`, `In-scope Host operations`의 native Skills, `Failure Behaviour`의 Skills discovery error, `Testing Decisions`의 Native context·live parity

## Slice-Specific Constraints

- `skills/list`는 bound `workspaceRoot` 하나만 `cwds`에 보내고 caller가 per-call cwd를 바꿀 수 없게 한다.
- Public Skill summary의 exact 최소 allowlist는 `name`, `description`, `enabled`다. `cwd`, `path`, `scope`, `shortDescription`, `interface`, `dependencies`, raw `errors`와 이후 generated field는 기본 제외하며 absolute internal roots와 debug payload를 노출하지 않는다.
- `instructionSources`는 fixture/transport-level evidence와 live `thread/start` response에서 확인한다. Sentinel workspace `AGENTS.md`가 native instruction source에 포함되는지 verifier가 검사하되, spec에 없는 public Host field나 browser DTO로 추가하지 않는다.
- Live verifier는 public Host path를 실행하는 package-internal composition에서만 `thread/start`의 `instructionSources`를 관측한다. 실행 중 memory에서 allowlisted assertion만 수행하며 package root export, server/browser composition, 파일과 Runtime Diagnostic History에 raw response를 노출하거나 저장하지 않는다. 정확한 probe type 이름은 고정하지 않는다.
- Native `AGENTS.md`와 Skill discovery 의미를 fake에서 재구현하지 않는다. Fake는 request/response와 cwd 전달만 결정적으로 증명한다.
- Valid `skills/list` App Server error와 read-only request timeout은 빈 success와 구분되는 operation-scoped error로 끝나며 Host connection을 닫지 않는다. Success response가 generated contract를 만족하지 않으면 discovery error로 낮추지 않고 ref나 summary를 만들기 전에 non-recoverable `protocol_error`로 connection을 닫는다.
- Live command는 login/OAuth를 시작하지 않고 existing auth availability만 preflight한다. Token과 raw protocol 내용을 출력하지 않는다.
- Live verifier의 argument/root validation, timeout, A/B/A2 correlation, Skill 판정과 cleanup은 deterministic fake child로 기본 test suite에서 실행한다. 실제 pinned Codex 실행만 명시적 opt-in이다.
- Live gate는 model 응답 문구의 exact match, 실제 approval 유발과 process crash를 요구하지 않는다.
- Memories, inherited-host discovery policy, plugin·MCP 관리와 별도 instruction engine은 범위 밖이다.

## Acceptance Criteria

- [ ] Public Host operation이 bound workspace에 대해 `skills/list`를 호출하고 `name`, `description`, `enabled`만 포함한 sanitized Skill summary를 반환한다.
- [ ] Fixture journal이 child, `thread/start`와 `skills/list`의 모든 cwd가 exact `workspaceRoot`임을 증명한다.
- [ ] Sentinel workspace의 scripted native result가 Host-owned filesystem scan이나 parser 없이 product-safe summary로 변환된다.
- [ ] Valid App Server discovery error와 read-only timeout이 빈 결과와 구분되는 typed error가 되고 Host snapshot은 같은 generation의 `ready`를 유지한다.
- [ ] Malformed `skills/list` success response는 partial summary나 ordinary discovery error를 만들지 않고 non-recoverable `protocol_error`로 connection을 닫는다.
- [ ] Recursive public result audit가 allowlist 밖의 generated Skill field, filesystem path와 raw discovery error payload가 없음을 검증한다.
- [ ] Host source와 public exports에 `AGENTS.md`/`SKILL.md` parser 또는 별도 discovery registry가 없다.
- [ ] Live verifier 자체가 deterministic fake child를 사용하는 기본 자동화에서 root/timeout parsing, A/B/A2 event correlation, sentinel Skill success/failure와 Host/child cleanup을 검증한다.
- [ ] Opt-in live command가 package-owned pinned binary와 명시적인 세 root를 사용하고 auth가 없으면 login을 시작하지 않은 채 안전하게 중단한다.
- [ ] Live command가 한 generation에서 Thread A/B와 A1 terminal 뒤 A2를 실행하고 streaming/terminal refs, `thread/start`의 sentinel `AGENTS.md` `instructionSources` evidence 및 sentinel Skill discovery를 확인한다.
- [ ] Internal evidence composition audit가 package root와 server/browser export에 verifier seam이 없고 raw `instructionSources` response를 파일·diagnostic history에 저장하지 않음을 확인한다.
- [ ] Live 실행 조건, 비결정적 제외 범위와 안전한 root/auth 준비 방법을 관련 package README가 소유한다.
- [ ] `skills/list`가 실제 Host path에 연결된 단계로 sparse method decision과 generated inventory를 갱신한다.

## Verification

- Targeted test or command: `npm run test -w @ay-ple/runtime-codex`로 fake-backed verifier를 기본 검증하고, 실제 pinned Codex Host parity command는 별도 opt-in으로 실행한다.
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/inspector`
- Manual or live smoke: 기존 인증을 사용할 수 있을 때만 documented Host parity command를 명시적으로 실행한다. 실행하지 못하면 fake contract 결과와 미실행 이유를 closeout에 남긴다.

## Blocked By

- `docs/tickets/2026-07-12-headless-codex-client-host/004-long-lived-correlated-work.md` — 한 process에서 thread·turn·activity를 정확히 연결한다

## Starting Points

- Ticket 004의 bound workspace thread/turn flow
- Generated `SkillsListParams`, `SkillsListResponse`와 Skill summary/error types
- `packages/runtime-codex/src/smoke.ts`와 package scripts의 opt-in smoke 선례
- `packages/runtime-codex/README.md`의 auth·pin·runtime-home 실행 규칙
- `docs/architecture/codex-runtime-isolation.md`의 Native context 경계
