# 001 — 현재 실행 그래프와 우연한 의존성을 고정한다

## Wayfinder ticket

- Type: research
- State: resolved
- Blocked by: None

## Question

현재 dev·dogfood AY-PLE를 `npm run dev`로 시작해 한 Product Turn에서 AY가 command를 실행할 때까지 실제 process·executable·environment graph는 무엇이며, 각 binary·library·root 중 AY-PLE이 의도적으로 pin·verify하는 것과 host에서 우연히 들어오는 것은 무엇인가?

## Expected evidence

- root launcher·Vite·Server → bundled Python bridge → native Codex App Server → spawned AY command와 Interaction MCP의 process·cwd·environment 흐름
- Node, npm, tsx, Python, pip, native Codex, shell, Git, `rg`와 대표 OS command의 exact resolution·version·provenance 표
- Bridge-private Python packages와 AY shell Python import path, SemesterWorkspace에서의 Node module resolution 차이
- `HOME`, `CODEX_HOME`, `CODEX_SQLITE_HOME`, `TMPDIR`, `PATH`, protected variable와 writable root의 owner
- actual child와 같은 environment를 사용하는 반복 가능한 probe, current tests가 보장하는 것과 보장하지 않는 것
- repo-built Interaction MCP entrypoint의 Node provenance·artifact verification·startup 책임
- ambient dependency, silent fallback, host-specific behavior와 문서·코드 불일치 목록

## Answer

상세한 process graph, executable·library inventory, root·environment owner와 검증 공백은 [현재 AY-PLE 실행 그래프와 환경 provenance](../assets/001-current-execution-graph.md)에 기록했다.

핵심 판정은 다음과 같다.

- Native Codex·bundled CPython·bridge·bridge-private package·bundled `rg`로 구성된 transport Runtime은 manifest와 complete-tree verifier가 exact하게 고정하고 startup 전에 fail-closed한다.
- App host의 Node·npm은 repository가 pin하지 않는다. 현재 root launcher, Server, Vite와 Interaction MCP는 `/Users/swh/.hermes/node/bin/node`에 의존하며, Interaction MCP의 ignored `dist` artifact도 Runtime manifest 밖에 있다.
- Runtime이 native App Server에 주는 fixed parent environment와 AY가 기본 command에서 보는 effective work environment는 다르다. Pinned Codex의 기본 `/bin/zsh -lc`가 macOS `path_helper`를 거치면서 system·Homebrew path를 앞세운다.
- 그 결과 현재 effective workbench에서는 verified `rg`가 Homebrew `rg`에 가려지고, `python`은 bundled CPython 3.10.18이지만 `python3`는 system CPython 3.9.6이다. `tesseract`·`ffmpeg`·`uv`도 host에서 우연히 나타나지만 `pdftotext` 계열은 없다.
- Bundled AY-facing Python에는 일반 작업 package가 사실상 없고, bridge-private `openai_codex`·`pydantic`은 AY shell에서 import할 수 없다. SemesterWorkspace의 Node resolver도 App host의 root dependency를 자동으로 보지 않는다.
- Global `CODEX_HOME`, macOS command, login-shell policy와 Homebrew가 silent input이다. Current tests는 Runtime integrity와 fixed parent environment를 강하게 검증하지만 post-login executable identity나 AY-facing package roster는 검증하지 않는다.
- 조사 시점의 materialized Runtime은 주로 Python bytecode 형태의 complete-tree drift가 있어 현재 startup은 bridge spawn 전에 거절된다. 생성 주체는 확인되지 않았으며 이 ticket에서는 Runtime을 정리하거나 다시 materialize하지 않았다.

따라서 현재 구조는 **exact transport Runtime 위에 host-dependent AY workbench가 합성된 상태**다. 다음 설계는 engine-private Runtime과 AY-facing work environment의 ownership seam을 먼저 정하고, 그 뒤에 구체적인 dependency profile과 materialization lifecycle을 다뤄야 한다.
