# 004 — 첫 public preview의 성공 여정을 고정한다

## Wayfinder ticket

- Type: grilling
- State: resolved
- Blocked by: None

## Question

공식 product homepage인 Landing에서 public `npx` command, preflight·verified Runtime·local Browser open, ChatGPT browser OAuth, app-owned SemesterWorkspace scaffold·기본 설정과 `Semester Ready`까지 어떤 단일 first-run journey를 release acceptance로 보장할 것인가? 같은 command의 `ready-relaunch`, supported macOS·Node/npm·Browser·network·Codex account prerequisite, Landing의 제품 가치·repository·Docs·trust 연결과 이번 preview에서 명시적으로 제외할 post-Ready capability를 어디까지 잠글 것인가?

## Answer

다음으로 확정했다.

### 확정한 범위

- First public preview의 release-blocking golden path는 `Landing → npx → preflight·Runtime 준비 → ChatGPT browser OAuth → 새 SemesterWorkspace scaffold → 기본 설정 → Semester Ready`로 끝낸다.
- `SemesterWorkspace`는 임의의 기존 폴더가 아니라, 사용자가 학년·학기와 위치를 선택하면 AY-PLE이 생성하고 정규화해 관리하는 학기 공간이다.
- App code가 scaffold, `WorkspaceManifest`, schema version, validation과 deterministic migration 규칙을 소유한다. Setup Skill은 canonical schema를 정의하지 않고 app-owned 작업을 호출·조율하거나 후속 migration을 돕는다.
- 학년 1~4와 1·2학기는 setup UI의 기본 선택지다. 계절학기·초과학기를 막는 schema 절대 제약이 아니다.
- 디렉터리 schema는 `WorkspaceManifest`, inbox, courses, app-owned state와 같은 안정적인 seam만 최소로 정의한다. Course 정체성·관계는 `WorkspaceManifest`가 authoritative하고 폴더명은 human-readable projection이다.
- 기존 자료 폴더는 `SemesterWorkspace`가 아니라 후보 `ImportSource`다. 후속 반입 여정에서 Agent/Skill이 분석과 mapping·migration plan을 제안하고 사용자가 검토·승인한 뒤 app-owned scaffold 내부에 반입한다.
- `/Users/swh/Desktop/code/2nd-1st-semester`는 후속 학업 capability와 import/migration을 발굴하는 실제 사용 evidence이며 onboarding fixture가 아니다.
- 자료 archive/import, 실제 학업 action과 confirmed state 복원은 `Semester Ready` 이후의 독립된 제품 여정으로 분리한다. 이 Ticket의 golden path는 그 capability를 public preview 성공 조건으로 두지 않는다.
- `Semester Ready`는 UI에서 `학기 공간 준비 완료`로 표현하는 setup 완료 checkpoint다. Runtime 연결과 OAuth Account Readiness가 성공하고, scaffold·`WorkspaceManifest`가 생성되며, schema version·validation을 통과하고, 학년·학기·위치·기본값과 active workspace 등록이 저장되고, 미완료 setup·recovery 상태가 없을 때 도달한다.
- `Semester Ready`는 Course, RawMaterial, live model turn이나 학업 action을 요구하지 않으며 AY가 학기를 이해했다는 뜻도 아니다. 완료 화면의 다음 CTA는 후속 여정인 `첫 자료 가져오기`다.
- 첫 preview의 지원 lane은 Apple Silicon Mac의 macOS 13.5 이상, Node `>=22.12 <23`, npm 10.x와 최신 Chrome/Chromium이다. npm registry, GitHub Releases, Codex OAuth와 provider endpoint에 연결 가능한 network를 prerequisite로 둔다.
- Node 24, Safari, Intel Mac과 다른 OS는 별도 clean smoke 전까지 지원을 약속하지 않는다. 감지 시 검증하지 않은 환경임을 알리고 이 release의 green evidence로 계산하지 않는다.
- First preview의 public 인증은 AY-PLE `appDataRoot`에 격리한 ChatGPT browser OAuth 하나다. API key, access token, device-code login과 전역 `~/.codex` credential import는 지원하지 않는다.
- OAuth 성공은 matching login completion의 success 뒤 fresh `account/read`가 ChatGPT account와 `requiresOpenaiAuth: false`를 반환할 때만 인정한다. credential 파일 존재만으로 성공을 합성하지 않는다.
- OAuth 취소·Browser 종료·실패는 workspace scaffold 전의 actionable `로그인 필요` 상태로 돌아가며 같은 UI에서 재시도한다. 만료된 session도 재인증으로 수렴하고, 오류를 이유로 다른 auth 방식으로 자동 fallback하지 않는다.
- `Semester Ready`는 live model turn을 요구하지 않으므로 완료 화면은 `Codex 연결됨`만 표시한다. Landing은 Codex를 사용할 수 있는 기존 ChatGPT account가 필요하다고 알리되, account read만으로 별도의 product entitlement나 실제 model 사용 가능성을 검증했다고 주장하지 않는다.
- First-run golden path와 별도로 `ready-relaunch`를 필수 release gate로 둔다. `Semester Ready`에서 정상 종료한 뒤 같은 public `npx` 명령을 다시 실행하면 exact Runtime cache와 격리 OAuth session을 재사용하고 workspace registry의 active `SemesterWorkspace`를 다시 찾아 `WorkspaceManifest` validation 후 setup wizard 없이 workbench를 연다.
- `ready-relaunch`는 scaffold나 기본값을 중복 생성·재작성하지 않는다. Setup 중 중단되면 마지막 안전 단계에서 재개하고, 불완전 scaffold는 Ready로 합성하지 않고 recovery 상태로 보내며, 충돌 경로나 사용자 파일을 자동 덮어쓰기·삭제하지 않는다.
- Landing은 setup 안내문이 아니라 AY-PLE의 public product homepage이자 repository·Docs·배포 흐름의 공식 entrypoint다. Hero에서 `한 학기를 함께 관리하는 AY`라는 제품 가치를 먼저 전달하고 바로 아래에 복사 가능한 public `npx` 명령을 둔다.
- Landing은 Hero, `npx` entrypoint, 제품 경험 설명·demo, 작동 방식, 지원 환경, Docs·GitHub repository·license/trust 진입으로 제한한다. [Remotion](https://www.remotion.dev/)은 개별 시각 요소나 section을 복제하는 reference가 아니라 product homepage를 repository와 public 실행 흐름의 entrypoint로 운영하는 방식의 benchmark다.
- 실제 실행은 `Landing → npx → local AY-PLE Browser UI → OAuth/setup wizard`로 분리한다. Prerequisite와 preview limitation은 숨기지 않되 Hero를 거대한 경고 surface로 만들지 않고 install command 주변의 짧은 안내와 별도 compatibility·trust surface에 배치한다.
- Landing은 장기 제품 비전과 현재 preview capability를 구분한다. 현재 가능한 `npx`·verified Runtime·ChatGPT 연결·새 SemesterWorkspace scaffold·`ready-relaunch`만 release claim으로 삼고, 자료 archive/import, Course 구성과 자료 기반 학업 action은 `Coming next`로 표시한다.
- 기존 폴더를 workspace로 직접 열기, 실제 자료 import·과제·시험 처리, LMS·Calendar·cloud sync, `.app`·`.dmg`와 supported lane 밖 환경을 첫 preview capability에서 제외한다. 현재 First Assignment vertical은 새 scaffold에서 도달할 수 없으므로 landing에서 public capability처럼 제시하지 않는다.

### 근거

- 현재 dogfood는 repository, 사전 materialize한 Runtime, 외부 CLI login, fixture workspace와 수동 Browser open을 요구하므로 public preview journey가 아니다. 현재 구현의 `auth.json` 존재 검사도 usable session을 증명하지 않는다.
- Current Runtime은 Account Readiness read만 public contract로 제공하며 official Python SDK의 browser login start·matching completion wait·cancel·logout capability는 아직 AY-PLE Runtime·Server·Browser product contract로 연결되지 않았다.
- 현재 alternate workspace 선택은 process-memory state이고 restart 뒤 canonical startup root로 돌아가므로 app data의 durable workspace registry가 필요하다.
- Node 22와 24는 2026-07-22 기준 LTS이고 macOS arm64 13.5 이상은 Node의 Tier 1 platform이다. 첫 release는 현재 green인 Node 22 lane 하나만 약속한다: [Node.js Releases](https://nodejs.org/en/about/previous-releases), [Node.js supported platforms](https://github.com/nodejs/node/blob/main/BUILDING.md#platform-list).
- Codex 공식 인증 문서는 local Codex의 ChatGPT browser sign-in, cached credential reuse·automatic refresh, logout과 device-code fallback을 설명한다. First preview는 supported local Browser lane에 맞춰 browser sign-in만 제품화한다: [Codex Authentication](https://learn.chatgpt.com/docs/auth.md).
- [Remotion homepage](https://www.remotion.dev/)는 product-value Hero 바로 뒤에 복사 가능한 `npx` command를 두고 Docs·GitHub·license surface로 연결한다. AY-PLE은 이 정보 hierarchy와 public entrypoint 역할만 benchmark로 삼고 visual section을 복제하지 않는다.
