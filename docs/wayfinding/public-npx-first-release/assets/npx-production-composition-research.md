# npx production composition 공식 근거 조사

> 조사일: 2026-07-22
>
> 대상: [Ticket 006 — npx production composition](../tickets/006-npx-production-composition.md)
>
> 근거 정책: npm, Node.js, Express, Vite, Apple, Google/Chromium의 공식 문서와 소스만 사용했다.

## 조사 범위와 판정 기준

이 문서는 `Landing → npx → local AY-PLE browser UI`를 실제 배포 가능한 하나의 production composition으로 만드는 데 필요한 근거만 다룬다. 다음 경계는 유지한다.

| 범위 | 이 문서의 책임 |
| --- | --- |
| public package | npm이 설치하고 실행할 수 있는 tarball, `bin`, 포함 파일, consumer-side lifecycle |
| launcher | 지원 환경 확인, root 분리, 단일 인스턴스 조정, Server/Runtime 감독, browser open, 종료 처리 |
| local web app | 한 Express listener에서 built SPA와 `/api/product/*`를 same-origin으로 제공 |
| Runtime | 이미 결정된 Codex Python Runtime을 production launcher에 연결하는 seam까지만 다룸 |
| 제외 | public trust copy는 Ticket 005, Runtime archive·version pin·hash·download/cache protocol은 Ticket 007, release gate와 smoke matrix는 Ticket 015가 소유한다. Package 이름·bin·공개 명령과 production composition은 Ticket 006의 결정 대상이다. |

아래에서 **공식 사실**은 출처가 직접 보장하는 동작이고, **설계 추론**은 그 사실을 AY-PLE의 제약에 적용한 결론이다.

## 결론

Ticket 006의 production shape는 다음처럼 잡을 수 있다.

1. 하나의 공개 distribution package가 하나의 public `bin`을 제공한다.
2. tarball에는 미리 빌드된 Node launcher, Express Server, Vite SPA, Ticket 006의 package metadata와 Ticket 005가 확정한 legal/trust 파일만 들어간다. 소비자 Mac에서 repository build, `tsc`, Vite build를 다시 하지 않는다.
3. launcher는 `packageRoot`, `appDataRoot`, `workspaceRoot`를 분리하고, Ticket 007이 제공하는 Runtime resolver를 통해 Python Runtime을 준비한다.
4. launcher가 foreground supervisor가 되어 `127.0.0.1`의 OS-assigned port 하나에서 API와 built SPA를 제공한다. Workspace 전 OAuth를 위해 Runtime process는 verified artifact 뒤 lazy하게 시작할 수 있지만, 시작된 process는 항상 이 supervisor 아래에서 한 개만 살아 있다.
5. Bare listener를 먼저 bind해 실제 origin을 계산한 뒤 Origin-dependent router와 static host를 붙이고, product host readiness 이후 지원 browser를 연다. Duplicate invocation이면 검증된 기존 instance를 재사용한다.
6. `SIGINT`/`SIGTERM` 또는 startup failure에서는 ingress, Runtime process tree, instance coordination 순서로 bounded cleanup을 수행하고 conventional exit status를 정한 뒤 event loop를 drain한다.

이 shape는 `.app`/`.dmg`, repository checkout, system Python, Vite dev/preview server에 의존하지 않는다. 단, Runtime payload를 어디서 받아 어떤 무결성 규칙으로 보존하는지는 이 문서의 결론이 아니라 Ticket 007의 입력이다.

## 현재 저장소에서 확인한 사실

다음은 외부 문서의 일반론이 아니라 2026-07-22 현재 local code evidence다.

| 현재 구현 사실 | 근거 | Ticket 006의 의미 |
| --- | --- | --- |
| root와 Server, Chat Shell, Runtime workspace가 모두 `private: true`이며 public `bin`이 없다. | [root package.json](../../../../package.json), [Server package.json](../../../../apps/server/package.json), [Chat Shell package.json](../../../../apps/chat-shell/package.json), [Runtime package.json](../../../../packages/codex-chat-runtime/package.json) | deployable distribution package와 bin은 아직 추가해야 한다. |
| Chat Shell은 `tsc -b && vite build`로 build되고 별도의 `vite preview` script를 가진다. | [Chat Shell package.json](../../../../apps/chat-shell/package.json) | build output은 재사용할 수 있지만 preview server는 production composition이 아니다. |
| Server는 이미 `127.0.0.1` default, 실제 assigned port 반환, `/api/product` router와 token-guarded private `/api/product-mcp`, idempotent `close()`, listener와 Runtime의 동시 cleanup seam을 갖는다. 아직 built SPA static/fallback route는 없다. | [Server implementation](../../../../apps/server/src/server.ts), [Assignment MCP host](../../../../apps/server/src/assignment-mcp-host.ts) | 새 server를 병렬로 만들기보다 현재 application factory를 launcher가 조립하고 static serving을 깊게 하는 편이 좁다. |
| 현재 Server factory는 Origin-dependent Runtime/router composition을 listener bind 전에 만들기 때문에 port `0`의 actual origin을 미리 주입할 수 없다. | [Server implementation](../../../../apps/server/src/server.ts), [Codex Chat configuration](../../../../apps/server/src/codex-chat-config.ts) | Production host는 bind와 composition을 분리하는 two-phase refactor가 필요하며 port probe 후 rebind하면 안 된다. |
| Runtime은 Python bridge를 detached process group으로 시작하고, idempotent `close()`에서 `SIGTERM → bounded wait → SIGKILL` 후 process group 소멸까지 확인한다. | [Runtime implementation](../../../../packages/codex-chat-runtime/src/runtime.ts) | launcher는 별도 kill protocol을 복제하지 않고 기존 Runtime `close()`를 감독해야 한다. |
| `product-dogfood.mts`는 세 root를 명시하지만 sample workspace를 profile에 복사하는 repository-owned dogfood fixture다. | [dogfood script](../../../../scripts/product-dogfood.mts) | production bin의 직접 기반이 아니라 composition seam의 참고 구현이다. |
| `packageRoot`, `appDataRoot`, `workspaceRoot` 분리와 `process.cwd()` fallback 금지는 이미 채택된 결정이다. | [ADR 0006](../../../adr/0006-separate-package-app-data-and-semester-workspace-roots.md) | Ticket 006은 이 결정을 배포 launcher에서도 보존해야 한다. |

## 1. 공개 npm package와 executable

### 공식 사실

| 사실 | 근거 |
| --- | --- |
| `package.json#bin`은 command 이름을 package 내부 파일에 연결한다. npm은 설치 시 해당 파일을 executable 경로에 link하며, Node CLI 파일은 `#!/usr/bin/env node`로 시작해야 한다. | [npm package.json — bin](https://docs.npmjs.com/cli/v10/configuring-npm/package-json/#bin) |
| `files`는 publish tarball의 allowlist 역할을 한다. 생략 시 기본값은 `*`이고, `package.json`, README, LICENSE, `main`, `bin` 등은 항상 포함된다. | [npm package.json — files](https://docs.npmjs.com/cli/v10/configuring-npm/package-json/#files) |
| `private: true`인 package는 publish할 수 없다. `os`와 `cpu`는 설치 가능한 platform/architecture를 제한할 수 있다. | [npm package.json — private, os, cpu](https://docs.npmjs.com/cli/v10/configuring-npm/package-json/) |
| `engines.node`와 `engines.npm`은 `engine-strict`가 켜져 있지 않으면 advisory다. `engine-strict`도 `--force`로 우회할 수 있다. | [npm package.json — engines](https://docs.npmjs.com/cli/v10/configuring-npm/package-json/#engines), [npm config — engine-strict](https://docs.npmjs.com/cli/v10/using-npm/config/#engine-strict) |
| npm은 registry에 publish할 package의 dependency로 local `file:` path를 사용하지 말라고 안내한다. npm은 `bundleDependencies`로 일부 dependency를 tarball에 포함할 수도 있다. | [npm package.json — local paths, bundleDependencies](https://docs.npmjs.com/cli/v10/configuring-npm/package-json/) |
| `package-lock.json`은 publish되지 않는다. 반면 `npm-shrinkwrap.json`은 publish할 수 있고, npm은 registry로 배포하는 application·daemon·CLI tool에 이를 권장한다. | [npm package-lock.json](https://docs.npmjs.com/cli/v10/configuring-npm/package-lock-json/), [npm-shrinkwrap.json](https://docs.npmjs.com/cli/v10/configuring-npm/npm-shrinkwrap-json/) |
| `npm pack --dry-run --json`으로 실제 tarball에 들어갈 파일 목록과 package 정보를 publish 전에 검사할 수 있다. | [npm pack](https://docs.npmjs.com/cli/v10/commands/npm-pack/) |

### AY-PLE 설계 추론

- public package는 **하나의 bin만 가진 deployable distribution unit**으로 만드는 편이 가장 얕은 public surface다. package 이름과 bin 이름이 npm의 executable 추론 규칙에 자연스럽게 맞으면 Landing 명령에 별도의 `--package` plumbing이 필요 없다.
- 현재 monorepo의 workspace-local package 관계를 `file:` dependency로 그대로 publish하면 안 된다. publish build가 Server와 launcher의 production JS 및 SPA asset을 distribution package 내부의 명시된 경로에 조립하거나, 공개 registry dependency로 전환해야 한다. 첫 preview에는 내부 package graph 전체를 공개하는 것보다 전자가 좁다.
- `files`는 긍정 allowlist로 두고, `npm pack --dry-run --json` 결과를 gate로 삼아 source, fixture, local `.env`, dogfood script가 우연히 들어가지 않는지 검사해야 한다.
- AY-PLE package metadata에는 publish 의도를 명확히 하는 선택으로 `private: false`를 두고, `bin`, `files`, `engines`, `os: ["darwin"]`, `cpu: ["arm64"]`를 명시하는 편이 타당하다. npm의 공식 보장은 `private: true`가 publish를 차단한다는 것이며 `false` 명시 자체가 npm의 필수값은 아니다. Metadata는 설치 전후의 filter일 뿐이므로 launcher가 지원 lane을 다시 검사해야 한다.
- 재현 가능한 production dependency tree가 필요하면 `npm-shrinkwrap.json`을 배포하거나 필요한 dependency를 bundle하는 두 선택지가 있다. 둘의 tarball 크기·license notice·native dependency 영향은 실제 package spike에서 결정해야 한다. 어느 쪽이든 local workspace symlink에 기대서는 안 된다.

## 2. `npx` resolution, prompt, cache

### 공식 사실

`npx`는 현재 `npm exec`를 사용한다. 요청 package가 local project에 없으면 npm cache에 설치해 executable `PATH`에 추가하며, 설치 전에 prompt를 낸다. `--yes` 또는 `--no`로 prompt를 제어할 수 있고, 비대화형/CI 환경에서는 자동으로 yes로 간주한다. `--package=<spec>`는 지정 package를 executable `PATH`에 추가한다. [`npm exec` 공식 문서](https://docs.npmjs.com/cli/v10/commands/npm-exec/)

package를 명시하지 않고 positional package spec만 쓸 때 npm은 다음 규칙으로 executable을 추론한다.

- `bin`이 하나이거나 모든 `bin` entry가 같은 command의 alias면 그 command를 쓴다.
- 여러 `bin` 중 unscoped package name과 일치하는 command가 있으면 그것을 쓴다.
- 그렇지 않으면 실행할 command를 결정하지 못해 종료한다.

또한 `npx`의 option은 positional argument보다 앞에 와야 한다. package spec에 version/tag가 없고 같은 package가 local project에 있으면 local version을 사용할 수 있으며, specifier가 있으면 이름과 version이 정확히 일치할 때만 local dependency를 사용한다. [`npm exec` — executable resolution과 npx 차이](https://docs.npmjs.com/cli/v10/commands/npm-exec/)

npm cache는 성능과 offline 재사용을 위한 cache일 뿐, 영속 데이터 저장소로 신뢰할 수 없다. npm은 cached data가 언제나 남아 있을 것을 보장하지 않는다. POSIX 기본 cache 경로는 `~/.npm`이다. [`npm cache`](https://docs.npmjs.com/cli/v10/commands/npm-cache/), [`npm folders`](https://docs.npmjs.com/cli/v10/configuring-npm/folders/)

npm CLI 10.9.8의 `libnpmexec` 구현은 requested package spec 문자열 목록의 hash로 npx install directory를 정한다. Tag spec은 registry manifest의 resolved destination을 다시 비교해 필요하면 같은 tag-spec directory를 reify하고, exact version spec은 cache tree의 exact package id와 비교한다. [`npm CLI v10.9.8 libnpmexec source`](https://github.com/npm/cli/blob/v10.9.8/workspaces/libnpmexec/lib/index.js)

### AY-PLE 설계 추론

- 가장 단순한 public invocation은 `npx [npx-options] <package>@<tag-or-version>` 형태다. 명시적 spec은 caller repository에 우연히 설치된 같은 이름의 mismatched version이 public preview를 shadow할 가능성을 줄인다. Resolving version과 정확히 일치하는 local dependency까지 배제하지는 않는다.
- 장시간 package asset을 읽는 local host에는 moving tag를 공식 command로 쓰지 않는 편이 안전하다. 같은 literal tag용 npx install directory가 새 release로 reify될 수 있기 때문이다. Ticket 006 Answer는 Landing과 smoke 모두 immutable exact version spec을 사용하도록 결정했다.
- Landing에서 `--yes`를 넣으면 install prompt가 사라져 first run은 짧아지지만, 사용자가 원격 코드를 실행한다는 확인 단계도 사라진다. 이것은 Ticket 006의 command UX 선택이며 Ticket 005의 trust truth를 위반하면 안 된다. 넣는다면 문법상 package spec 앞에 둬야 한다.
- bin이 하나이고 package 이름으로 추론 가능하게 만들면 `--package`가 필요 없다. package와 command 이름을 다르게 하거나 여러 bin을 공개해야 할 때만 `npx --yes --package=<package>@<version> <bin>`처럼 명시한다.
- npm cache 안의 package 설치 위치는 매 실행에서 읽을 수 있는 `packageRoot`일 뿐이다. workspace, OAuth state, Runtime install state, instance lock을 그 아래에 쓰면 npm cache eviction과 package version 교체에 의해 사라질 수 있다.

## 3. publish/install lifecycle

### 공식 사실

npm은 `npm install`에서 `preinstall → install → postinstall → prepublish → preprepare → prepare → postprepare` 순서의 lifecycle을 실행한다. `npm pack`은 `prepack → prepare → postpack`, `npm publish`는 여기에 `prepublishOnly`, `publish`, `postpublish`가 추가된다. npm은 target architecture에서 compilation이 꼭 필요한 경우가 아니라면 `install`/`preinstall` script를 거의 사용하지 말라고 권고한다. [`npm scripts — life cycle operation order`](https://docs.npmjs.com/cli/v10/using-npm/scripts/#life-cycle-operation-order), [`npm scripts — best practices`](https://docs.npmjs.com/cli/v10/using-npm/scripts/#best-practices)

### AY-PLE 설계 추론

- tracked TypeScript와 React는 publisher/CI에서 빌드하고 tarball에는 실행 가능한 결과물을 넣어야 한다. public preview 사용자의 Mac에서 `prepare`, `postinstall`, Vite, TypeScript compiler가 성공해야만 실행되는 package는 첫 preview의 신뢰성과 cold-start를 악화시킨다.
- `prepack`은 publisher-side build/verification entry로 쓸 수 있지만, tarball 자체는 lifecycle 없이 실행 가능해야 한다. 특히 Ticket 007의 Runtime download를 `postinstall`에 숨기지 말고 explicit launcher phase로 노출해야 실패 진단, retry, version/integrity 검증을 제품이 소유할 수 있다.
- CI/release gate는 clean checkout에서 build한 뒤 `npm pack --dry-run --json`, 실제 tarball install, public bin smoke를 수행해야 한다. 이 마지막 범위의 canonical matrix는 Ticket 015가 소유한다.

## 4. 지원 환경은 launcher가 직접 강제해야 한다

### 공식 사실

Node는 `process.version`/`process.versions.node`, `process.platform`, `process.arch`로 실행 중인 Node version, compile target OS, CPU architecture를 제공한다. [`Node.js process`](https://nodejs.org/download/release/latest-v22.x/docs/api/process.html)

`os.release()`는 운영체제의 kernel release를 반환한다. macOS에서 사용자에게 보이는 ProductVersion과 동일한 계약이 아니다. [`Node.js os.release`](https://nodejs.org/download/release/latest-v22.x/docs/api/os.html#osrelease)

macOS의 공식 local manual인 [`sw_vers(1)`](#macos-local-man-pages)은 `/usr/bin/sw_vers -productVersion`이 macOS ProductVersion을 출력한다고 명시한다.

### AY-PLE 설계 추론

지원 lane이 macOS arm64 13.5+, Node `>=22.12 <23`, npm 10.x라면 launcher는 최소한 다음을 startup mutation 전에 검사하고, 실패 시 발견값·지원값·해결 명령을 함께 출력해야 한다.

| 검사 | 신뢰할 source | 비고 |
| --- | --- | --- |
| Node | `process.versions.node` | `engines`가 advisory이므로 재검사 |
| OS | `process.platform === 'darwin'` | package `os`와 이중 방어 |
| architecture | `process.arch === 'arm64'` | Rosetta/x64 Node는 지원 lane 밖으로 판정 |
| macOS ProductVersion | `/usr/bin/sw_vers -productVersion` | `os.release()`를 쓰지 않음 |
| npm | 아래 미해결 선택 참조 | `engines.npm`만으로는 강제되지 않음 |
| supported browser | 아래 browser section 참조 | browser를 열기 전에 진단할 수 있으면 우선 |

npm version을 authoritative하게 읽는 방식은 spike로 잠가야 한다. `npm_config_user_agent`는 사용자 설정 가능하고, 단순히 `npm --version`을 실행하면 현재 `PATH`가 가리키는 npm이 실제 npx를 기동한 npm과 같은지 검증해야 한다. package `engines.npm`만 쓰는 것은 충분하지 않다.

## 5. 세 root와 asset resolution

### 공식 사실

Node ESM의 `import.meta.url`은 현재 module의 절대 `file:` URL이므로 module-relative asset 경로를 계산할 수 있다. [`Node.js ESM — import.meta.url`](https://nodejs.org/download/release/latest-v22.x/docs/api/esm.html#importmetaurl)

Apple은 app이 직접 관리하는 지속 데이터는 사용자의 `Library/Application Support` 아래 app-specific directory에 두고, 재생성 가능한 cache와 일시 파일은 각각 Caches와 temporary directory에 구분하라고 안내한다. [`macOS File System Programming Guide — Library directory`](https://developer.apple.com/library/archive/documentation/FileManagement/Conceptual/FileSystemProgrammingGuide/MacOSXDirectories/MacOSXDirectories.html), [`Locating items in standard directories`](https://developer.apple.com/library/archive/documentation/FileManagement/Conceptual/FileSystemProgrammingGuide/AccessingFilesandDirectories/AccessingFilesandDirectories.html)

Node의 `os.tmpdir()`는 OS temporary directory를 반환한다. temporary directory는 app의 영속 상태 경로가 아니다. [`Node.js os.tmpdir`](https://nodejs.org/download/release/latest-v22.x/docs/api/os.html#ostmpdir)

### AY-PLE 설계 추론

| root | production 의미 | 허용되는 대표 내용 |
| --- | --- | --- |
| `packageRoot` | 현재 npm tarball의 read-only 실행 자산 | launcher JS, Server JS, built SPA, metadata |
| `appDataRoot` | AY-PLE이 소유하는 version-independent local state | setup 상태, app-managed Codex home/state, instance coordination, Ticket 007이 정한 Runtime state |
| `workspaceRoot` | 사용자가 선택하고 AY-PLE schema가 소유하는 SemesterWorkspace | manifest, inbox, courses, workspace state |

- `packageRoot`는 `process.cwd()`가 아니라 executable module의 `import.meta.url`에서 계산해야 한다. npx를 어느 directory에서 실행하든 SPA와 Server asset을 같은 방식으로 찾을 수 있어야 한다.
- `appDataRoot`의 기본값은 `~/Library/Application Support/<stable-product-id>` 계열이어야 한다. 표시명(`AY-PLE`)과 reverse-domain identifier 중 무엇을 canonical directory name으로 쓸지는 한 번 정하면 바꾸기 어려우므로 Ticket 006에서 명시적으로 잠가야 한다.
- npm cache와 OS temp는 `appDataRoot` 대체물이 아니다. Runtime archive cache를 Application Support 아래 둘지 `~/Library/Caches` 아래 둘지, 그리고 eviction/recovery 규칙은 Ticket 007이 결정한다.
- `workspaceRoot`는 app install/update와 독립해야 하며 package version이 바뀌어도 implicit migration하면 안 된다. workspace schema/migration ownership은 setup tickets의 기존 결정에 따른다.

## 6. built SPA와 API의 same-origin production server

### 공식 사실

Vite의 production build 기본 output은 `dist`이고, `vite preview`는 local preview용이며 production server로 설계되지 않았다. [`Vite static deploy`](https://vite.dev/guide/static-deploy.html), [`Vite build options — outDir`](https://vite.dev/config/build-options.html#build-outdir)

Express는 `express.static()`으로 정적 asset을 제공한다. 정적 directory를 relative path로 넘기면 Node를 시작한 directory에 따라 해석되므로 Express 공식 문서도 absolute path 사용이 더 안전하다고 안내한다. [`Express static files`](https://expressjs.com/en/starter/static-files.html)

Express 5의 catch-all route는 named wildcard를 사용해야 하며, root까지 포함하려면 `/{*splat}` 형태를 쓴다. `app.listen` callback은 Express 5에서 `EADDRINUSE` 같은 listen error를 callback argument로 받을 수 있다. [`Express 5 migration guide`](https://expressjs.com/en/guide/migrating-5.html)

웹 origin은 scheme, host, port의 tuple로 정의된다. [`RFC 6454 — The Web Origin Concept`](https://www.rfc-editor.org/rfc/rfc6454)

### AY-PLE 설계 추론

- production에는 Vite dev server나 `vite preview`를 띄우지 않는다. Express app 하나가 먼저 `/api/product/*`를 등록하고, 그 뒤 package-relative absolute path의 Vite assets와 SPA navigation fallback을 제공해야 한다.
- API와 UI가 같은 Express listener를 사용하면 정확히 같은 scheme/host/port가 되어 CORS configuration이 필요 없는 local product surface가 된다. static navigation에는 API용 origin check를 무조건 적용하지 않고, state-changing API guard는 Fetch가 실제로 보내는 `Origin`의 method/mode 차이를 고려해야 한다. [`Fetch Standard — Origin header`](https://fetch.spec.whatwg.org/#http-new-header-syntax)
- Vite `base`와 emitted asset URL은 이 server root에서 직접 열 수 있게 build해야 한다. 향후 subpath 배포가 필요하지 않은 첫 preview라면 `/` base가 가장 단순하다.
- legacy/demo route와 raw Runtime protocol을 production static/API tree에 다시 노출하지 않는다. public listener는 product-only contract여야 한다.

## 7. loopback, port, readiness, browser open

### 공식 사실

Node `net.Server.listen()`에서 host를 생략하면 unspecified IPv6 address 또는 IPv4 `0.0.0.0`에 bind할 수 있다. port를 `0`으로 주면 OS가 사용 가능한 임의 port를 할당하고, listen 이후 `server.address().port`에서 실제 값을 읽을 수 있다. [`Node.js net.Server.listen`](https://nodejs.org/download/release/latest-v22.x/docs/api/net.html#serverlisten)

macOS의 공식 local manual인 [`open(1)`](#macos-local-man-pages)은 `/usr/bin/open`이 URL을 LaunchServices로 열며 `-a`로 application, `-b`로 bundle identifier를 선택한다고 명시한다. `-W`를 쓰지 않으면 열린 application의 종료를 기다리는 동작을 요청하지 않는다.

Google의 공식 관리 문서는 Google Chrome의 macOS bundle identifier를 `com.google.Chrome`으로 사용하며, Chromium 공식 source는 Chromium bundle identifier를 `org.chromium.Chromium`으로 정의한다. [`Google Chrome Enterprise — macOS bundle ID`](https://support.google.com/chrome/a/answer/7591084), [`Chromium branding source`](https://chromium.googlesource.com/chromium/src/%2B/master/chrome/updater/branding.gni)

### AY-PLE 설계 추론

- 반드시 `127.0.0.1`을 명시해 외부 interface에 노출하지 않는다. `localhost`는 resolver에 따라 IPv4/IPv6 표현이 달라질 수 있으므로 product origin도 `http://127.0.0.1:<actualPort>`로 한 가지로 고정한다.
- 기본 port는 `0`으로 요청하고 listen 완료 후 실제 port로 origin을 만든다. 이는 사용자의 기존 service와 충돌하는 fixed port 문제를 없애지만, duplicate AY-PLE instance 문제까지 해결하지는 않는다.
- browser는 verified Runtime artifact와 product host readiness가 확인된 뒤 연다. Runtime process 자체는 workspace 전 OAuth 요청까지 lazy할 수 있다. `/usr/bin/open -b <supported-bundle-id> <origin>`은 shell interpolation 없이 `execFile` 계열로 실행하고, browser process를 product lifetime의 child로 감독하지 않는다.
- 지원 browser 선택은 `Google Chrome → Chromium` 순서의 explicit policy가 타당하다. `/usr/bin/open` 실패 시 server를 남겨둘지, URL을 출력하는 recoverable 상태로 둘지, 전체 startup을 rollback할지는 Ticket 006에서 UX와 함께 잠가야 한다. 기본 browser에 맡기면 Safari 등 지원 lane 밖 browser가 열릴 수 있다.
- browser 설치 여부를 UI를 열지 않고 확인하는 공식·안정 CLI contract는 이번 조사에서 찾지 못했다. app discovery 방식은 macOS 대상 spike가 필요하며, 적어도 실제 open 실패가 모든 이미 시작된 resource를 정리하도록 만들어야 한다.

Ticket 006 Answer는 이 조사 단계의 gap을 first-preview 지원 위치의 exact app bundle candidate, `/usr/bin/plutil`의 `Info.plist` field extraction, 검증한 exact path를 `/usr/bin/open -a`에 넘기는 좁은 contract로 닫았다. 이는 LaunchServices 전체 discovery를 일반화한 공식 capability가 아니라 clean-machine smoke로 검증해야 하는 AY-PLE design choice다. [`plutil(1)`](#macos-local-man-pages)

## 8. duplicate invocation과 instance coordination

### 설계 추론

OS-assigned port는 여러 AY-PLE process가 동시에 뜨는 것을 허용한다. 그러나 둘이 같은 `appDataRoot`의 OAuth/runtime/setup state를 함께 변경하면 손상 또는 사용자 혼란이 생길 수 있으므로 **`appDataRoot` 단위 single active instance**가 필요하다.

권장 protocol은 다음 의미를 가져야 한다.

1. state mutation 전 instance ownership을 원자적으로 획득한다.
2. owner는 listen/readiness 이후 PID, package/runtime version, origin, instance nonce를 기록한다.
3. 두 번째 invocation은 descriptor만 믿지 않고 same-product health와 nonce를 검증한다.
4. 유효하면 기존 origin을 browser에서 열고 0으로 종료한다.
5. owner가 죽은 stale state라면 보수적으로 회수한 뒤 새 instance를 시작한다.
6. 정상 shutdown에서는 listener와 Runtime을 닫은 뒤 ownership을 마지막에 해제한다.

fixed port만 singleton으로 쓰면 다른 process의 port 점유와 AY-PLE instance를 구별할 수 없고 `appDataRoot` namespace도 반영하지 못한다. 반대로 PID file만 쓰면 PID reuse와 crash-stale 문제가 남는다. lock primitive, descriptor format, stale recovery, nonce health endpoint는 macOS에서 crash/동시 실행 E2E를 거쳐 잠가야 하는 Ticket 006의 핵심 미해결 구현 선택이다.

## 9. signal, child process, bounded cleanup

### 공식 사실

POSIX에서 Node는 기본적으로 `SIGINT`와 `SIGTERM`을 받으면 종료한다. 그러나 listener를 등록하면 기본 동작이 제거되므로 signal handler가 있다고 해서 Node가 자동 종료하지 않는다. `exit` event에서는 synchronous 작업만 할 수 있고 async cleanup은 완료되지 않는다. [`Node.js process — signal events와 exit`](https://nodejs.org/download/release/latest-v22.x/docs/api/process.html#signal-events)

Node child process에서 `close` event는 process 종료와 stdio 종료가 모두 끝난 뒤 발생한다. `error`와 `exit`는 함께 발생할 수 있어 completion callback을 한 번만 실행하도록 보호해야 한다. `child.kill()`은 signal 전송 성공 여부만 뜻하며 대상 process가 실제로 종료되었다는 보장은 아니다. POSIX에서 `detached: true` child는 새 process group/session의 leader가 될 수 있다. [`Node.js child_process`](https://nodejs.org/download/release/latest-v22.x/docs/api/child_process.html)

`server.close()`는 새 connection 수락을 중단하고 idle connection을 닫지만 active connection은 완료될 때까지 남을 수 있다. 필요하면 `closeAllConnections()`로 강제 종료할 수 있으며, 새 connection race를 줄이기 위해 `server.close()` 뒤에 호출해야 한다. [`Node.js HTTP server close`](https://nodejs.org/download/release/latest-v22.x/docs/api/http.html#serverclosecallback), [`server.closeAllConnections`](https://nodejs.org/download/release/latest-v22.x/docs/api/http.html#servercloseallconnections)

Express의 graceful shutdown 안내도 `SIGTERM` 수신 시 새 request를 중단하고 진행 중 request와 resource cleanup을 마친 뒤 종료하는 순서를 권고한다. [`Express health checks and graceful shutdown`](https://expressjs.com/en/advanced/healthcheck-graceful-shutdown.html)

### AY-PLE 설계 추론

launcher는 command를 실행하고 바로 끝나는 bootstrapper가 아니라 foreground supervisor여야 한다. 권장 lifecycle은 다음과 같다.

```text
preflight
  → roots + instance ownership
  → Runtime resolver (Ticket 007)
  → bare HTTP listener bind on 127.0.0.1:0
  → exact origin 계산 + Runtime/router/static composition
  → product readiness
  → browser open
  → 필요할 때 supervised Runtime lazy start
  → wait for signal/fatal child exit
  → stop ingress
  → close Runtime process tree and stdio
  → release instance ownership
  → conventional exitCode + event-loop drain
```

- `SIGINT`와 `SIGTERM`, fatal Runtime exit, startup exception은 하나의 idempotent shutdown promise로 합류해야 한다.
- shutdown은 먼저 `server.close()`로 ingress를 막고, 짧은 grace 안에 끝나지 않는 browser stream/API connection은 bounded force-close한다. 이후 기존 Runtime의 process-group `SIGTERM → grace → SIGKILL` contract를 호출하고 `close`까지 확인한다.
- Runtime child를 `unref()`하면 launcher가 lifetime owner라는 계약이 깨진다. 단순 `kill()` 반환이나 `exit` event만으로 cleanup 완료로 간주하지 않는다.
- signal listener를 설치한 이상 cleanup 완료/실패 뒤 exit code를 명시해야 한다. `process.on('exit')`에서 async cleanup을 시작하면 늦다.
- browser를 여는 짧은 `/usr/bin/open` process에는 shell을 사용하지 않고, Chrome 자체를 child process로 붙잡거나 종료시키지 않는다.
- 두 번째 signal, `SIGHUP`, shutdown grace 길이, Runtime startup 중 cancel semantics는 아직 숫자와 정책을 정해야 한다. 이 값들은 crash/interrupt smoke에서 검증해야 한다.

## 10. Ticket 006 Answer에서 잠가야 했던 결정

| 결정 | 현재 고신뢰 기본안 | 남은 검증 |
| --- | --- | --- |
| distribution 단위 | 하나의 public package + 하나의 bin + prebuilt composition | bundle 방식과 package 크기 |
| dependency 재현성 | public registry deps + `npm-shrinkwrap.json`, 또는 explicit bundle | license/native dependency 영향 |
| consumer lifecycle | build/compiler/postinstall 없이 실행 | clean tarball smoke |
| supported lane enforcement | package metadata + launcher runtime preflight | npm version source, error copy |
| package asset root | `import.meta.url` 기반 | packed install smoke |
| app data 기본 경로 | `~/Library/Application Support/<stable-product-id>` | canonical product id |
| local origin | `http://127.0.0.1:<OS-assigned-port>` | origin guard/readiness wiring |
| production web server | Express 하나가 API와 built SPA 제공 | SPA fallback/API exclusion tests |
| browser | readiness 후 supported bundle을 explicit open | no-browser discovery/failure UX |
| duplicate invocation | `appDataRoot`-scoped owner + verified descriptor/nonce | atomic lock와 stale recovery spike |
| shutdown | foreground supervisor + idempotent bounded cleanup | grace, second signal, `SIGHUP` |
| Runtime delivery | Ticket 007 resolver 결과를 소비 | archive/version/hash/cache는 007에서 결정 |

## 11. 조사 단계에서 Answer로 넘긴 선택

다음은 근거 부족이 아니라 research asset만으로 고를 수 없어 Ticket 006 Answer의 제품·구현 결정으로 넘긴 항목이다. 현재 확정값은 이 목록이 아니라 [Ticket 006 Answer](../tickets/006-npx-production-composition.md)를 따른다.

- public package name/bin name과 Landing의 `--yes`, tag/version 표기
- dependency를 bundle할지 `npm-shrinkwrap.json`으로 설치할지
- stable `appDataRoot` identifier
- 실제 npx를 기동한 npm 10.x를 authoritative하게 식별하는 방법
- 지원 browser의 non-mutating discovery와 open 실패 UX
- single-instance lock primitive, descriptor/health contract, stale recovery
- shutdown grace, second signal, `SIGHUP` 정책

Ticket 007이 별도로 결정해야 할 항목은 Runtime archive layout, download endpoint, exact version pin, integrity/signature/hash, Runtime cache location과 eviction, offline/retry 정책이다. Ticket 006은 그 결과를 받는 resolver/launch contract만 필요로 한다.

## npm registry point-in-time 관찰

2026-07-22에 official npm registry를 사용하는 local npm 10.9.8에서 `npm view ay-ple name version --json`을 실행했을 때 `E404`가 반환됐다. 이는 조사 시점에 해당 unscoped package가 조회되지 않았다는 관찰일 뿐 name ownership이나 publication 시점 availability를 예약하지 않는다. Ticket 006이 publication 직전 재검사와 fail-closed name decision을 요구하는 이유다.

## macOS local man pages

Apple이 macOS에 제공하는 local manual을 2026-07-22에 다음 명령으로 확인했다.

```sh
man sw_vers
man open
man plutil
```

- `sw_vers(1)`: `-productVersion`으로 macOS ProductVersion을 출력한다.
- `open(1)`: LaunchServices를 통해 file/URL을 열고, `-a`는 application, `-b`는 bundle identifier를 선택하며, `-W`는 열린 application이 종료할 때까지 기다리는 option이다.
- `plutil(1)`: `-extract <keypath> raw -expect string`으로 property list의 string field를 machine-readable stdout으로 추출하며 실패하면 non-zero로 종료한다. Raw extraction은 macOS 12부터 제공되므로 supported macOS 13.5+ lane에 포함된다.
