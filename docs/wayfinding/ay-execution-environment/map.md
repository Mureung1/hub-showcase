# AY-PLE 앱·AY 실행 환경

## Wayfinder state

- State: active
- Surface: local-wayfinder-map
- Next actor: /wayfinder

## Destination

현재 dev·dogfood AY-PLE에서 App host, Codex transport Runtime과 AY가 실제 작업에 사용하는 interpreter·CLI 환경을 의도적이고 재현 가능한 구조로 만드는 implementation-ready spec을 작성할 수 있는 상태에 도달한다. Packaged Desktop App의 설치·업데이트 제약은 설계 입력으로 포함하지만 signing·notarization·public distribution 구현은 이번 목적지에 포함하지 않는다.

## Notes

- 이 effort는 특정 PDF 기능이나 document parser capability를 설계하는 일이 아니다. 모델이 실제 작업 중 익숙한 command·library를 자연스럽게 선택할 수 있도록 하는 **AY work environment**의 품질과 소유권을 다룬다.
- 조사 대상은 네 층이다: root `npm`/`tsx`·Vite·Server와 product-owned Interaction MCP를 띄우는 App host, exact Codex·Python bridge를 소유하는 verified Runtime, native Codex가 AY command에 전달하는 work environment, macOS·전역 `CODEX_HOME`을 포함한 host/user environment.
- 현재 root ownership은 [ADR 0006](../../adr/0006-separate-package-app-data-and-semester-workspace-roots.md), macOS local companion 경계는 [ADR 0009](../../adr/0009-use-a-macos-first-local-web-app-product-path.md), official SDK·Node supervision은 [ADR 0011](../../adr/0011-reuse-official-codex-python-sdk-for-chat-shell.md)이 소유한다.
- Runtime root·process environment·state 격리의 current owner는 [Codex Runtime 격리](../../architecture/codex-runtime-isolation.md), exact artifact·bridge·verification 동작의 owner는 [`@ay-ple/codex-chat-runtime` README](../../../packages/codex-chat-runtime/README.md)와 current code/tests다.
- Exact pin의 source와 materialized Runtime을 current behavior의 primary oracle로 사용한다. 최신 official Codex 문서는 upstream target·public semantics를 확인하는 자료이며 pinned `0.144.4` 동작을 자동 증명하지 않는다.
- `CODEX_HOME`의 global account·config·session authority와 AY-PLE-controlled `HOME`·Runtime payload를 섞지 않는다. Rich work environment를 이유로 사용자 전역 Python, Homebrew, npm global package나 `CODEX_HOME` plugin을 자동 변경하지 않는다.
- App product capability catalog, Skill bundle lifecycle과 AY work environment dependency profile은 같은 개념이 아니다. Work environment의 dependency는 특정 ActionInvocation과 1:1 대응하지 않아도 되며 모델의 높은 tool prior와 여러 학기 작업에서의 범용성을 포함 기준으로 검토한다.
- Codex 개발 Agent가 `hub/`를 구현·테스트하는 toolchain과 AY가 `SemesterWorkspace`에서 학생 자료를 다루는 work environment를 구분한다. 둘의 package가 우연히 같은 host `node_modules`나 interpreter를 보는 상태를 목표로 삼지 않는다.
- Environment를 풍부하게 만드는 결정은 bundle 크기, cold materialization, native wheel·binary portability, parser attack surface, license·NOTICE와 update cadence를 함께 부담한다. 단순 package wishlist가 아니라 운영 가능한 profile을 결과로 만든다.
- Wayfinder는 decision·research·prototype만 소유한다. Production code, manifest mutation, 실제 dependency install, App packaging과 implementation ticket은 resulting spec 이후 `/to-tickets` 또는 `/implement`가 소유한다.
- 한 Wayfinder session에는 frontier ticket 하나만 claim하고 resolve한다. Map은 low-resolution index로 유지하고 상세 근거는 ticket Answer와 linked asset이 소유한다.

## Decisions so far

없음.

## Not yet specified

- 실제 환경 inventory와 upstream·framework 비교가 끝나기 전에는 Python·Node·native CLI의 exact package roster와 directory layout을 고정하지 않는다.

## Out of scope

- 이번 Wayfinder session에서 production Runtime, manifest, installer, workspace 또는 사용자 전역 환경을 변경하는 일
- PDF/HWP/HWPX/DOCX/PPTX용 product-facing parser API, MCP, App preview나 Semantic Review schema를 직접 설계하는 일
- built-in Skill refresh·merge·version lifecycle과 기존 SemesterWorkspace migration
- `.app`·`.dmg`, Developer ID signing·notarization, Mac App Store, public npm·GitHub Release publication과 auto-updater 구현
- Windows·Linux·Intel Mac 지원, container·VM·별도 OS user 수준 격리와 cloud multi-user runtime
- 두 번째 Agent engine을 전제로 한 generic runtime abstraction

## Resulting spec

아직 없음.
