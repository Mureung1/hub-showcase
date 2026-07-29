# 현재 AY-PLE 실행 그래프와 환경 provenance

작성일: 2026-07-29

상태: [현재 실행 그래프와 우연한 의존성을 고정한다](../tickets/001-current-execution-graph.md)의 point-in-time research evidence

## 판정

현재 dev·dogfood AY-PLE은 하나의 hermetic 실행 환경이 아니다. 다음 네 층을 합성한다.

| 층 | 현재 owner | 판정 |
| --- | --- | --- |
| App host | root `npm`, `tsx`, `concurrently`, Vite, Server, Interaction MCP build | npm lock은 JavaScript package version을 고정하지만 Node·npm executable 자체는 고정하지 않는다. 현재 host Node는 Hermes 설치본이다. |
| Verified Runtime | bundled CPython, bridge, bridge-private Python packages, native Codex, bundled `rg` | Tracked manifest와 complete-tree verifier가 source·version·byte roster를 fail-closed로 고정한다. |
| AY work environment | native Codex가 Product Turn의 command에 계산해 주는 `cwd`, environment, sandbox와 기본 login shell | Fixed parent environment 위에서 `/bin/zsh -lc`가 `/etc/zprofile`의 `path_helper`를 실행한다. 그 결과 verified `rg`가 Homebrew `rg`에 가려지고 `python`과 `python3`도 서로 다른 interpreter가 된다. 독립적으로 이름 붙은 product-owned profile은 없다. |
| Host/user state | macOS `/usr/bin`·`/bin`, Homebrew, `~/.codex`, host Node installation | 명시적·암묵적으로 노출되지만 version·content는 AY-PLE manifest가 검증하지 않는다. |

따라서 “Codex engine은 재현 가능하다”는 현재 보장은 맞지만, “AY가 마주하는 interpreter·CLI·library workbench가 재현 가능하다”는 보장은 아직 없다. 더구나 조사 시점의 실제 materialized Runtime은 bundled Python 내부에서 관찰된 bytecode를 포함한 tree drift 때문에 complete-tree 검증을 통과하지 못한다. 현재 `npm run dev`는 Runtime admission에서 fail-closed하며 bridge·native App Server·AY Product Turn에 도달하지 않는다. Drift를 만든 주체와 정확한 생성 경로는 이번 증거만으로 확정하지 않는다.

## Admitted process graph

```text
사용자 shell
└─ host npm
   └─ host Node + root tsx → scripts/product-canonical.mts
      └─ concurrently
         ├─ host npm → @ay-ple/chat-shell dev
         │  └─ host Node + Vite (127.0.0.1:4173)
         └─ host npm → @ay-ple/server dev
            └─ host Node + tsx watch
               ├─ Express listener (127.0.0.1:3000)
               │  └─ private Interaction Broker route
               ├─ complete-tree Runtime verification
               ├─ one-shot native-context sidecar
               │  └─ verified native Codex app-server
               │     └─ config/read + skills/list
               └─ verified bundled CPython bridge (detached, cwd=SemesterWorkspace)
                  └─ bridge-private official Python SDK
                     └─ verified native Codex app-server (cwd=SemesterWorkspace)
                        ├─ Product thread / Product Turn
                        │  └─ default unified exec under native sandbox
                        │     └─ /bin/zsh -lc
                        │        └─ /etc/zprofile → path_helper → effective command PATH
                        └─ required project MCP process
                           └─ repo-built dist/stdio.js shebang
                              └─ host Node selected directly from fixed parent PATH
                                 └─ authenticated HTTP → Interaction Broker
```

### 1. Root launcher와 App host

- Root [`npm run dev`](../../../../package.json#L9)은 [`tsx scripts/product-canonical.mts`](../../../../package.json#L10)를 실행한다. Root manifest에는 `engines`, `packageManager`, Volta pin이 없고 repository에도 `.nvmrc`, `.node-version`, `.tool-versions`가 없다.
- Canonical launcher는 package parent의 `../.ay-ple`을 app data 기본값으로 정하고, `--workspace`는 absolute path만 받는다([argument resolution](../../../../scripts/product-canonical.mts#L17-L45)).
- Development bootstrap은 prepared SemesterWorkspace를 먼저 검증한 뒤 Server와 Chat Shell을 `concurrently`로 띄운다([process composition](../../../../scripts/product-development-bootstrap.mts#L59-L115)).
- Server child만 `AY_PLE_PRODUCT_MODE`, package/app-data/workspace root와 selection source를 받는다([product environment](../../../../scripts/product-development-bootstrap.mts#L87-L105)). Chat Shell은 Vite `4173`에서 뜨고 `/api`를 Server `3000`으로 proxy한다([Vite config](../../../../apps/chat-shell/vite.config.ts#L4-L13)).
- 두 child는 모두 root command를 시작한 host Node toolchain을 사용한다. 현재 `process.execPath`는 `/Users/swh/.hermes/node/bin/node`이며 Runtime이 이 directory를 AY의 `PATH`에도 넣는다([Runtime PATH construction](../../../../packages/codex-chat-runtime/src/runtime.ts#L1699-L1737)).

### 2. Root ownership과 Runtime startup

Server는 package, external app data, global Codex home, controlled Runtime home·temp와 optional SemesterWorkspace를 canonicalize하고 서로 겹치지 않게 한다([root contract](../../../../apps/server/src/product-roots.ts#L31-L120)).

현재 dogfood root는 다음과 같다.

| Root | 현재 값 | Owner |
| --- | --- | --- |
| `packageRoot` | `/Users/swh/Desktop/code/ai-agent-challenge/hub` | application package |
| `appDataRoot` | `/Users/swh/Desktop/code/ai-agent-challenge/.ay-ple` | application operating data |
| `runtimeRoot` | `<appDataRoot>/runtime/production-runtime-darwin-arm64` | verified Runtime |
| `runtimeHome` | `<appDataRoot>/state/runtime/home` | controlled Runtime state |
| `TMPDIR` | `<appDataRoot>/temp` | controlled Runtime state |
| `CODEX_HOME`·`CODEX_SQLITE_HOME` | `/Users/swh/.codex` | global Codex account·config·session state |
| Runtime `cwd` | `/Users/swh/Desktop/code/ai-agent-challenge/workspace/year-2-semester-1` | user-owned SemesterWorkspace |

Startup은 shared listener와 Broker generation을 먼저 만들고 세 Interaction credential을 `childEnvironment`로 준비한 뒤 Runtime을 시작한다([ordering](../../../../apps/server/src/prepared-workspace-startup.ts#L194-L239), [credential handoff](../../../../apps/server/src/server-development.ts#L138-L161)). Server composition은 spawn 직전에 `verifyCodexChatRuntimeBundle()`을 호출하고, `createCodexChatRuntime()`도 다시 complete-tree verification을 수행한다([Server spawn](../../../../apps/server/src/server-development.ts#L152-L161), [Runtime factory](../../../../packages/codex-chat-runtime/src/index.ts#L68-L88)).

### 3. Bundled Python bridge와 native Codex

Runtime supervisor는 verified absolute Python을 다음 형태로 spawn한다.

```text
<bundle>/python/bin/python3.10 -B <bundle>/bridge/worker.py
  --workspace <canonical SemesterWorkspace>
  --site-packages <bundle>/site-packages
  --client-name=ay-ple
  --client-title=AY-PLE
  --client-version=0.0.0
  --codex-bin <bundle>/site-packages/codex_cli_bin/bin/codex
```

Python child는 SemesterWorkspace를 `cwd`로 쓰고 detached process-group leader가 된다([spawn arguments와 options](../../../../packages/codex-chat-runtime/src/runtime.ts#L289-L342)). Worker는 bridge source root와 explicit bridge-private `site-packages`만 `sys.path` 앞에 넣는다([worker](../../../../packages/codex-chat-runtime/python/bridge/worker.py#L10-L17)). Bridge CLI는 같은 workspace와 `os.environ.copy()`를 official SDK config로 넘긴다([bridge composition](../../../../packages/codex-chat-runtime/python/bridge/ay_ple_codex_bridge/cli.py#L93-L139)).

SDK는 verified absolute native binary에 `app-server --listen stdio://`를 붙이고 같은 `cwd`·environment로 `subprocess.Popen()`한다([SDK launch](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/client.py#L238-L269)). Product thread는 `auto_review + workspace_write`로 시작하고, Product Turn도 write profile이면 같은 policy를 명시한다([thread start](../../../../packages/codex-chat-runtime/python/bridge/ay_ple_codex_bridge/runtime.py#L474-L513), [Product Turn](../../../../packages/codex-chat-runtime/python/bridge/ay_ple_codex_bridge/runtime.py#L666-L711)). 현재 전달되는 sandbox 값은 `networkAccess=false`, 빈 `writableRoots`, `excludeSlashTmp=false`, `excludeTmpdirEnvVar=false`다. 즉 SemesterWorkspace가 기본 write root이고 `/tmp`와 controlled `TMPDIR`도 제외하지 않지만 Runtime root를 별도 writable root로 주지는 않는다.

여기까지는 native App Server의 parent environment다. Pinned Codex `0.144.4` source와 실제 probe를 대조하면 `allow_login_shell` 기본값은 `true`이고 현재 global/project config는 이를 끄지 않는다. Unified exec의 `login`이 생략된 일반 모델 tool call은 account shell인 `/bin/zsh`를 `-lc`로 실행한다. 따라서 아래에서 분리해 기록한 **effective command environment**는 이 parent environment와 같지 않다.

Bridge-private `site-packages`는 Python process의 `sys.path` 조작일 뿐 `PYTHONPATH`가 아니다. 따라서 AY가 terminal에서 `python`을 실행할 때는 bridge의 `openai_codex`, `pydantic`을 import할 수 없다.

### 4. Interaction MCP

Prepared workspace는 다음 정적 project declaration을 가진다.

```toml
[mcp_servers.ay_ple_interaction]
command = "../../hub/packages/interaction-mcp/dist/stdio.js"
env_vars = [
  "AY_PLE_INTERACTION_BROKER_URL",
  "AY_PLE_INTERACTION_BROKER_TOKEN",
  "AY_PLE_INTERACTION_RUNTIME_BINDING"
]
enabled_tools = ["propose_state_patch"]
required = true
```

Server는 effective declaration의 exact relative command, empty args/static env, forwarded environment names, enabled/required/tool allowlist를 검사한다([validation](../../../../apps/server/src/prepared-workspace-startup.ts#L361-L397)). 실제 Adapter가 Broker와 authenticated handshake 및 held lifecycle channel을 연 뒤에만 workspace startup이 active가 된다.

그러나 executable provenance는 verified Runtime과 다르다.

| 항목 | 관찰 |
| --- | --- |
| Entrypoint | ignored build artifact `packages/interaction-mcp/dist/stdio.js` |
| 현재 mode·size | `-rwxr-xr-x`, 19,292 bytes |
| 현재 SHA-256 | `6f358a899f15e2f7838812a5d25d2f89cf8b3e64d45c2836625379ae4c32a451` |
| Interpreter selection | `#!/usr/bin/env node`([source](../../../../packages/interaction-mcp/src/stdio.ts#L1)); login shell을 거치지 않는 MCP child의 fixed parent PATH에서 host Node 선택 |
| Build guarantee | `tsc && chmod 755`([package manifest](../../../../packages/interaction-mcp/package.json#L17-L22)); test가 built process와 Broker protocol, package-root verifier가 shebang·executable mode를 확인 |
| Startup guarantee | exact declaration과 live Broker handshake를 확인 |
| 없는 보장 | Runtime manifest와 같은 dist byte hash·source-to-dist attestation, product-owned Node pin |

즉 Interaction MCP는 repo source가 소유하지만 실행 interpreter는 현재 Hermes Node이고, artifact byte는 Runtime complete-tree verifier의 범위 밖이다.

## Exact executable·library inventory

### App host

| 항목 | 실제 해석·version | Provenance와 보장 |
| --- | --- | --- |
| Node | `/Users/swh/.hermes/node/bin/node`, `v22.22.3`, arm64 | Host의 Hermes installation. `process.execPath`로 관찰되지만 repo pin·verification 없음 |
| npm | `/Users/swh/.hermes/node/bin/npm`, `10.9.8` | 같은 Hermes Node tree. repo pin 없음 |
| root `tsx` | `4.23.0` | `package-lock.json`과 root `node_modules`; host Node에서 실행 |
| `concurrently` | `9.2.3` | `package-lock.json`과 root `node_modules` |
| Vite | `8.1.3` | `package-lock.json`과 root `node_modules`; host Node에서 실행 |
| TypeScript | `6.0.3` | `package-lock.json`과 root `node_modules` |

### Runtime parent의 fixed PATH

아래 표는 bridge와 native App Server가 상속하는 fixed parent environment에서 command를 직접 resolve한 결과다. 기본 모델 tool call이 login shell을 지난 뒤 보는 결과가 아니다.

| 항목 | Fixed parent environment의 해석·version | Provenance |
| --- | --- | --- |
| Python | `<runtime>/bundle/python/bin/python`, CPython `3.10.18` build `20250818` | Canonical manifest·complete tree 검증 대상 |
| pip | 같은 Python tree의 `pip 24.3.1` | Standalone Python payload에 포함; AY-facing dependency roster로 별도 선언되지 않음 |
| native Codex | PATH에서는 `codex`가 해석되지 않음. Bridge는 absolute binary를 사용하며 `codex-cli 0.144.4` | Canonical manifest·complete tree 검증 대상 |
| `rg` | `<runtime>/bundle/site-packages/codex_cli_bin/codex-path/rg`, `15.1.0` | Codex wheel과 complete tree 검증 대상 |
| Node/npm/npx/corepack | Hermes Node tree, `v22.22.3` / npm `10.9.8` | `path.dirname(process.execPath)`에서 ambient하게 노출 |
| `tsx` | 해석되지 않음 | SemesterWorkspace에서 root `node_modules/.bin`은 PATH가 아님 |
| Git | `/usr/bin/git`, `2.50.1 (Apple Git-155)` | Absolute Git root probe와 fixed parent PATH가 macOS binary를 사용; version 검증 없음 |
| shell | `/bin/sh`, Bash `3.2.57`; `/bin/bash` `3.2.57`; `/bin/zsh` `5.9` | macOS system payload; version 검증 없음 |
| OS utility | `/usr/bin/jq` `1.7.1-apple`, `file`, `strings`, `textutil`, `mdls`, `qlmanage`, `sqlite3` `3.51.0`, `curl`, `unzip`, `zip`, `tar` | macOS system payload; presence·version 검증 없음 |
| Developer tool | `/usr/bin/xcrun`, `clang 21.0.0`, Swift `6.3.3` | 이 Mac의 Command Line Tools; 설치 여부·version 검증 없음 |
| 관찰되지 않은 CLI | `uv`, `pdftotext`, `pdfinfo`, `pdftoppm`, `pandoc`, `tesseract`, `ffmpeg`, `libreoffice`, `soffice` | Fixed PATH에서 해석되지 않음 |

### 기본 unified exec의 effective command environment

현재 pinned Codex의 기본 unified exec는 `/bin/zsh -lc <command>`를 사용한다. macOS `/etc/zprofile`은 login shell에서 `/usr/libexec/path_helper`를 실행하므로 fixed PATH를 다음과 같은 순서로 다시 구성한다.

```text
/usr/local/bin
/System/Cryptexes/App/usr/bin
/usr/bin
/bin
/usr/sbin
/sbin
…
/opt/homebrew/bin
…
<Runtime이 구성한 codex-path, bundled Python, Hermes Node path>
```

동일한 controlled environment와 SemesterWorkspace `cwd`에서 `/bin/zsh -lc`를 반복 실행한 실제 resolution은 다음과 같다.

| command | Effective resolution | Fixed parent 대비 변화 |
| --- | --- | --- |
| `node` | `/Users/swh/.hermes/node/bin/node` | 이 host에는 앞선 PATH entry의 다른 `node`가 없어 동일 |
| `python` | `<runtime>/bundle/python/bin/python` | 동일 |
| `python3` | `/usr/bin/python3` | bundled Python보다 macOS system Python이 앞섬 |
| `pip` | `<runtime>/bundle/python/bin/pip` | 동일 |
| `rg` | `/opt/homebrew/bin/rg` | verified Runtime의 `rg`가 shadow됨 |
| `tesseract` | `/opt/homebrew/bin/tesseract` | fixed parent PATH에서는 없었으나 Homebrew를 통해 출현 |
| `ffmpeg` | `/opt/homebrew/bin/ffmpeg` | fixed parent PATH에서는 없었으나 Homebrew를 통해 출현 |
| `uv` | `/opt/homebrew/bin/uv` | fixed parent PATH에서는 없었으나 Homebrew를 통해 출현 |
| `pdftotext`, `pdfinfo`, `pdftoppm` | 해석되지 않음 | login shell 이후에도 없음 |

Unified exec는 여기에 `LANG=C.UTF-8`, `LC_ALL=C.UTF-8`, `CODEX_THREAD_ID`, `CODEX_CI=1`, `NO_COLOR`, `TERM=dumb`와 pager 관련 변수를 추가한다. 따라서 fixed parent PATH는 native engine과 MCP child의 provenance를 설명하지만, AY의 기본 workbench executable provenance를 고정하지 않는다. 특히 모델이 `python`을 고르면 bundled CPython을, `python3`를 고르면 system Python을 만나므로 “AY에게 Python 3.10.18이 제공된다”는 단일 문장도 현재는 충분히 정확하지 않다.

Bundled AY-facing Python의 installed distribution은 `pip==24.3.1`, `setuptools==80.9.0`뿐이었다. `pydantic`, `openai_codex`, `pypdf`, `PyPDF2`, `fitz`, `pdfplumber`, `docx`, `pptx`, `openpyxl`, `PIL`, `pandas`, `numpy`, `bs4`, `lxml`은 모두 import되지 않았다.

반대로 bridge-private site-packages는 canonical manifest가 다음 distribution을 고정한다.

| Distribution | Version |
| --- | --- |
| `openai-codex` | `0.0.0.dev0` |
| `openai-codex-cli-bin` | `0.144.4` |
| `pydantic` | `2.13.4` |
| `pydantic-core` | `2.46.4` |
| `annotated-types` | `0.7.0` |
| `typing-extensions` | `4.15.0` |
| `typing-inspection` | `0.4.2` |

SemesterWorkspace의 Node resolver도 `typescript`, `tsx`, `playwright`, `pdf-parse`, `pdfjs-dist`를 찾지 못했다. App host의 root `node_modules`는 AY work environment에 자동 노출되지 않는다.

## Fixed environment probe

### Runtime이 구성하는 base environment

[`createChildEnvironment()`](../../../../packages/codex-chat-runtime/src/runtime.ts#L1699-L1737)는 caller environment를 상속하지 않고 아래 allowlist를 새로 만든다.

```text
AY_PLE_INTERACTION_BROKER_URL=<loopback private route>
AY_PLE_INTERACTION_BROKER_TOKEN=<generation secret>
AY_PLE_INTERACTION_RUNTIME_BINDING=<generation binding>
CODEX_HOME=/Users/swh/.codex
CODEX_SQLITE_HOME=/Users/swh/.codex
HOME=/Users/swh/Desktop/code/ai-agent-challenge/.ay-ple/state/runtime/home
LANG=en_US.UTF-8
LC_ALL=en_US.UTF-8
PATH=<codex-path>:<bundled-python-bin>:<dirname(process.execPath)>:/usr/bin:/bin:/usr/sbin:/sbin
PYTHONDONTWRITEBYTECODE=1
PYTHONNOUSERSITE=1
PYTHONUTF8=1
PYTHONUNBUFFERED=1
TMPDIR=/Users/swh/Desktop/code/ai-agent-challenge/.ay-ple/temp
```

Caller-supplied child values는 최대 16개·64 KiB이고 `HOME`, Codex homes, `PATH`, locale, temp, Python·dynamic-loader 계열을 덮을 수 없다([normalization](../../../../packages/codex-chat-runtime/src/runtime.ts#L1740-L1781)). Current actual-child test는 ambient provider secret·`PATH`·`PYTHONPATH`를 심은 뒤 위 exact environment만 native child에 도달하는지 확인한다([test](../../../../packages/codex-chat-runtime/src/runtime.actual.test.ts#L1641-L1735)).

이 조사에서는 다음 순서로 반복 probe했다.

1. Tracked [`production-runtime-darwin-arm64.json`](../../../../packages/codex-chat-runtime/manifests/production-runtime-darwin-arm64.json)에서 absolute executable path를 계산한다.
2. 위 `createChildEnvironment()`와 같은 object를 만들되 Broker secret value만 `<redacted>` sentinel로 바꾼다.
3. `cwd`를 canonical SemesterWorkspace로 고정한 `spawnSync(..., { env })`에서 `command -v`, version, Python `sys.path`·distribution·module presence와 Node `require.resolve()`를 실행한다.
4. Native binary를 같은 base environment에서 `app-server --listen stdio://`로 직접 시작해 `initialize → initialized → command/exec(["/usr/bin/env"], readOnly)`를 호출한다.
5. Pinned Codex의 unified exec/login-shell 결정과 account/global/project config를 확인하고, 같은 controlled environment·workspace에서 `/bin/zsh -lc`를 실행해 post-login `PATH`, command resolution과 injected variable을 별도로 기록한다.

Bundled Python probe는 `PYTHONDONTWRITEBYTECODE=1`, `PYTHONNOUSERSITE=1`, `PYTHONUTF8=1`, `PYTHONUNBUFFERED=1`을 모두 포함했다. Probe 뒤 Runtime tree를 쓰거나 정리하지 않았다.

### Native server가 계산한 pre-login command environment

Direct `command/exec` 결과는 base environment에 다음 변화를 보였다.

- `CODEX_SANDBOX=seatbelt`, `CODEX_SANDBOX_NETWORK_DISABLED=1`이 추가됐다.
- `PATH` 앞에 global `CODEX_HOME` 아래의 per-command `codex-arg0*` directory가 추가되고 bundled `codex-path`가 한 번 더 들어갔다.
- bundled Python이 macOS에서 `__CF_USER_TEXT_ENCODING`을 process environment에 추가했다.
- global `/Users/swh/.codex/config.toml`의 `[shell_environment_policy.set]` 세 값이 추가됐다. 즉 global Codex config는 AY command environment의 실질적인 input이다.
- 세 Interaction Broker environment value도 command environment에 그대로 남았다.

마지막 항목은 현재 process wiring상 credential이 MCP Adapter에만 전달되는 것이 아니라 AY가 실행한 command에서도 읽을 수 있음을 뜻한다. Direct `command/exec`은 Product Turn 자체는 아니지만 pinned native App Server의 server-computed pre-login environment path를 관찰한 결과다. Product Turn command에서 이 secret visibility를 별도로 막는 AY-PLE code나 test는 찾지 못했다.

기본 모델 tool call은 여기서 다시 `/bin/zsh -lc`를 거친다. 따라서 이 probe만으로 실제 AY workbench를 설명하면 fixed PATH를 과대평가한다. 앞 절의 effective resolution 표가 post-login 결과이며, Interaction MCP는 이 login-shell 경로가 아니라 native App Server parent에서 직접 spawn되는 별도 child다.

## 현재 materialized Runtime의 fail-closed 상태

Tracked canonical manifest는 bundle을 다음으로 고정한다.

| Field | Expected |
| --- | ---: |
| regular file count | 2,539 |
| regular file bytes | 366,692,701 |
| symlink count | 9 |
| roster SHA-256 | `f3a86d2f03c05073301554f436d58e24de4948e3fc887f4aa99ee80ce76ac6db` |

2026-07-29 약 16:27 KST에 조사 probe의 첫 Runtime operation으로 `verifyProductionBundle(runtimeRoot)`을 호출했다. 이 호출은 bundled executable을 실행하기 전에 다음 actual tree로 즉시 실패했다.

| Field | Actual |
| --- | ---: |
| regular file count | 2,800 |
| regular file bytes | 370,575,446 |
| symlink count | 9 |
| roster SHA-256 | `f872f0f2ac0c162d3aef47dd2c953fbc39d7c9d11e26b7d4d62591f1de65742f` |

이 verifier 호출 전에 이번 조사 session이 실행한 것은 host `node`·`npm`, `ls`, `stat`, `find`, `du`, `/usr/bin/git`, system shell·Swift version probe뿐이다. 실패한 verifier 뒤 manifest-directed bundled Python probe를 처음 실행했으며, 그때는 위 네 Python isolation variable을 모두 설정했다.

Tree에는 현재 `.pyc` 275개, 약 4,057,213 bytes가 있고 mtime 범위는 `2026-07-29 15:23:18–15:23:31 KST`다. Manifest 대비 file delta는 261개이므로 모든 `.pyc`가 새 path라고 단정할 수는 없지만, drift의 주된 형태가 bundled Python bytecode임은 filesystem observation과 일치한다. 이 조사는 해당 파일을 삭제·수정하지 않았다.

Verifier는 extra file 하나도 거절하도록 구현·test되어 있다([complete tree collection](../../../../packages/codex-chat-runtime/src/production-bundle.ts#L370-L455), [verification](../../../../packages/codex-chat-runtime/src/production-bundle.ts#L570-L645), [extra-file regression](../../../../packages/codex-chat-runtime/src/production-bundle.unit.test.ts#L405-L457)). 따라서 이 상태에서의 startup 거절은 verifier defect가 아니라 현재 계약대로의 동작이다. 동시에 verified tree 안에 writable interpreter와 `pip`을 fixed parent PATH와 default `python` resolution으로 직접 노출하는 구조가 정상 작업이나 진단 중 self-mutation을 일으킬 수 있다는 lifecycle gap을 실제로 드러낸다.

## Current guarantees

| 보장 | 근거 |
| --- | --- |
| Runtime source·Python·native Codex·patch identity | Exact source commit `8c68d4c87dc54d38861f5114e920c3de2efa5876`, Codex `0.144.4`, CPython `3.10.18`, ordered patch digest를 verifier가 상수와 대조한다([manifest contract](../../../../packages/codex-chat-runtime/src/production-bundle.ts#L20-L51), [validation](../../../../packages/codex-chat-runtime/src/production-bundle.ts#L212-L310)). |
| Runtime byte closure | Spawn 전 canonical/local manifest byte equality와 complete file·mode·symlink roster를 확인하며 system Python·ambient `codex`로 fallback하지 않는다. |
| Exact workspace | Runtime `cwd`는 canonical, non-symlink, exact Git root여야 한다([workspace validation](../../../../packages/codex-chat-runtime/src/runtime.ts#L1499-L1585)). |
| Root separation | Workspace, controlled HOME/temp와 global Codex home가 겹치면 거절한다([Runtime validation](../../../../packages/codex-chat-runtime/src/runtime.ts#L1587-L1661)). |
| Base process environment | Bridge와 native App Server parent는 ambient API key·provider URL·`PATH`·`PYTHONPATH`를 상속하지 않고 bounded allowlist를 재구성한다. 단, 기본 AY command의 login shell이 만드는 최종 PATH까지 고정한다는 보장은 아니다. |
| Bridge package isolation | Official SDK·Pydantic은 bridge `sys.path`에만 주입되고 AY shell Python과 섞이지 않는다. |
| Runtime lifecycle | Node supervisor가 bridge/native process group을 bounded `SIGTERM → SIGKILL`로 정리하고 terminal loss를 product error로 투영한다. |
| Interaction readiness | Static MCP declaration과 actual Adapter→Broker handshake·lifecycle을 모두 통과해야 active workspace가 된다. |

## Gaps와 silent host inputs

| Gap | 현재 영향 |
| --- | --- |
| App host Node/npm pin 없음 | Root launcher, Server, Vite, Interaction MCP와 AY의 `node`가 이 Mac의 Hermes `v22.22.3`에 우연히 수렴한다. 다른 launch host에서는 달라질 수 있다. |
| Default login shell의 PATH 재작성 | Fixed parent PATH와 달리 Homebrew·macOS path가 verified tool보다 앞선다. `rg`가 shadow되고 `python`/`python3`이 갈라지며, host에 있던 `tesseract`·`ffmpeg`·`uv`가 우연히 출현한다. |
| AY work-environment manifest 없음 | Python package, Node module, OS CLI의 supported roster·version·availability를 App이 진술하거나 검증하지 않는다. |
| Verified engine tree와 writable workbench의 동일 directory | AY에게 노출된 Python/pip 실행이 bytecode나 install로 immutable Runtime tree를 바꾸면 다음 startup이 fail-closed한다. |
| Global Codex config 재사용 | Account뿐 아니라 `shell_environment_policy`, MCP·plugin/config 변화가 AY command environment와 effective context를 바꾼다. |
| Broker credential의 broad visibility | MCP용 URL·token·binding이 persistent native process와 native command environment에도 보인다. |
| macOS·Homebrew toolchain ambient dependency | Git, shell, text/document helpers, SQLite, jq, Command Line Tools와 login-shell Homebrew command의 presence·version은 target Mac과 user profile에 따라 달라진다. |
| Node executable과 Node modules의 ownership 불일치 | `node`·`npm`은 보이지만 SemesterWorkspace에서는 App host dependencies가 resolve되지 않는다. 모델 prior상 “Node가 있으니 익숙한 package도 있을 것”이라는 기대와 어긋난다. |
| Interaction MCP artifact attestation 없음 | Live handshake는 동작을 증명하지만 현재 ignored `dist`가 어떤 reviewed source byte에서 왔는지는 startup이 증명하지 않는다. |
| Work-environment smoke 부재 | Current tests는 Runtime integrity, base env, process cleanup과 MCP handshake를 강하게 검증하지만 login shell 이후 대표 AY-facing `command -v`·Python import·Node resolve roster를 production root에서 검증하지 않는다. |
| App host와 one-shot context sidecar의 PATH 차이 | Persistent Runtime에는 host Node와 Broker env가 있지만 native-context sidecar PATH에는 Node directory·Broker env가 없다([sidecar env](../../../../packages/codex-chat-runtime/src/native-context-probe.ts#L828-L893)). Config read 성공이 Product Turn workbench readiness를 증명하지 않는다. |

## 후속 ticket에 넘길 사실

이 조사로 다음 질문은 더 이상 “PDF library를 하나 설치할까?”가 아니다.

1. Verified engine-private tree와 mutable 또는 replaceable AY-facing work environment를 같은 directory로 둘 수 있는가?
2. Host Node와 macOS·Homebrew command를 supported input으로 인정할지, product-owned artifact로 옮길지, 명시적 fallback으로 둘지 결정해야 한다. 그 전에 login shell을 유지할지와 PATH precedence의 owner도 명시해야 한다.
3. Global `CODEX_HOME`의 account authority는 재사용하더라도 `shell_environment_policy`와 project-independent user config가 AY workbench를 바꾸는 범위를 별도로 정해야 한다.
4. Interaction MCP가 필요한 secret과 interpreter를 general AY command environment에 노출하지 않는 ownership seam이 필요하다.
5. 최종 환경 profile은 package wishlist가 아니라 install/materialize/update, immutability, smoke·observability까지 함께 정의해야 한다.
