# LocalTwin 개발환경

## 1. 현재 상태

LocalTwin은 제품 기능 구현 전 단계다. 현재 저장소에는 실행 가능한 web/api scaffold, 문서 하네스와 검증 환경만 구성한다.

```text
포함:
React application shell
FastAPI health endpoint
format / lint / typecheck / test / build
Git hooks와 로컬 검증

제외:
상권 분석 prototype
실제 공공데이터 연동
MapLibre 지도 화면
Gaussian Splatting viewer
```

`intro-page/`는 활성 애플리케이션이 아닌 이전 로컬 자산이며 Git 추적과 개발 대상에서 제외한다.

## 2. Toolchain

| 영역 | 도구 | 기준 |
| --- | --- | --- |
| JavaScript runtime | Node.js | `24.11.x` |
| JavaScript package manager | pnpm | `11.7.x` |
| Web | React, Vite, TypeScript | `apps/web/package.json`과 `pnpm-lock.yaml` 기준 |
| Python | CPython | `3.13.9` |
| Python package manager | uv | `apps/api/uv.lock` 기준 |
| API | FastAPI, Uvicorn, Pydantic Settings | `apps/api/pyproject.toml` 기준 |
| Git | Git for Windows | repository hook path 사용 |

개발자는 manifest의 범위가 아니라 lockfile에 기록된 정확한 버전으로 환경을 재현한다.

## 3. Directory Structure

```text
LocalTwin/
  apps/
    web/
      src/
        App.tsx
        styles/
          tokens.css
          global.css
        test/
      package.json
      vite.config.ts
    api/
      src/localtwin_api/
        config.py
        main.py
      tests/
      pyproject.toml
      uv.lock
  data/
    raw/
    processed/
    fixtures/
    scenes/
  docs/
    development/
    design/
    features/
    data/
    evaluation/
    module-notes/
    wiki/
  scripts/
  .harness/
  .githooks/
  .github/workflows/
  package.json
  pnpm-lock.yaml
  pnpm-workspace.yaml
```

새 기능 디렉터리는 실제 기능을 시작할 때 만든다. 빈 architecture layer를 미리 늘리지 않는다.

권장 확장:

```text
apps/web/src/features/<feature>/
apps/web/src/shared/

apps/api/src/localtwin_api/api/
apps/api/src/localtwin_api/domain/
apps/api/src/localtwin_api/services/
apps/api/src/localtwin_api/repositories/
```

## 4. 설치

```powershell
pnpm install --frozen-lockfile
uv sync --directory apps/api --frozen
git config core.hooksPath .githooks
```

확인:

```powershell
node --version
pnpm --version
uv run --directory apps/api python --version
git config --get core.hooksPath
```

## 5. 실행

web과 api 동시 실행:

```powershell
pnpm dev
```

개별 실행:

```powershell
pnpm dev:web
pnpm dev:api
```

기본 주소:

```text
web: http://127.0.0.1:5173
api: http://127.0.0.1:8000
health: http://127.0.0.1:8000/health
OpenAPI: http://127.0.0.1:8000/docs
```

## 6. 검증

전체:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check.ps1
```

영역별:

```powershell
pnpm format:check
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

`scripts/check.ps1`는 문서 검사 후 위 application 검증을 실행한다.

## 7. 설치된 Library

### Web runtime

| Library | 역할 |
| --- | --- |
| `react`, `react-dom` | UI runtime |
| `maplibre-gl` | 2.5D 지도 PoC renderer |
| `react-map-gl` | React와 MapLibre integration |
| `lucide-react` | 공통 icon |

### Web development

| Library | 역할 |
| --- | --- |
| `vite`, `@vitejs/plugin-react` | dev server와 production build |
| `typescript` | static type check |
| `oxlint` | TypeScript/React lint |
| `prettier` | source formatting |
| `vitest` | unit/component test runner |
| `@testing-library/react` | component behavior test |
| `@testing-library/jest-dom` | DOM assertion |
| `jsdom` | browser-like test environment |

### API runtime

| Library | 역할 |
| --- | --- |
| `fastapi` | HTTP API |
| `uvicorn` | ASGI development server |
| `pydantic-settings` | environment configuration |

### API development

| Library | 역할 |
| --- | --- |
| `pytest` | API test runner |
| `httpx2` | Starlette/FastAPI TestClient transport |
| `ruff` | Python lint와 format check |

## 8. Phase 2 도입 예정 Library

다음 library는 관련 기능의 task packet과 검증 기준이 생길 때 추가한다.

| 영역 | 후보 | 추가 시점 |
| --- | --- | --- |
| DB/migration | SQLAlchemy, Alembic, PostgreSQL driver | DB-001에서 Supabase schema·migration·seed와 함께 도입. 현재는 미설치 |
| 공간 계산 | Shapely, pyproj | footprint/좌표계 PoC 시작 시 |
| chart | Recharts 또는 Apache ECharts | chart 요구사항과 dataset 크기 확정 후 |
| browser E2E | Playwright | 첫 사용자 workflow 구현 시 |
| 3DGS | Spark 2.1 + Three.js, Nerfstudio 1.1.5 | 실제 capture 품질·익명화 검증 전 |
| LLM | provider SDK 미정 | Template report 검증 후 |

한 번만 사용할 가능성이 있는 library는 미리 설치하지 않는다.

### 8.1 DB 실행 원칙

- 제품 runtime DB는 Supabase PostgreSQL 한 곳이다.
- canonical SQLite는 Phase 1 데이터의 import 원본과 회귀 검증 기준이다.
- Docker PostgreSQL은 필요한 경우에만 쓰는 선택적 migration 테스트 환경이며 별도 제품 DB가 아니다.
- dependency와 설정은 DB-001 구현 commit에서 함께 추가하며 문서 결정만으로 설치 완료로 표시하지 않는다.

## 9. Environment Variable

기준 파일:

```text
.env.example
```

규칙:

```text
실제 secret은 .env 또는 GitHub Secret에만 저장한다.
.env는 commit하지 않는다.
PUBLIC_DATA_SERVICE_KEY를 log나 문서에 출력하지 않는다.
SEOUL_OPEN_DATA_KEY를 log나 문서에 출력하지 않는다.
VITE_ prefix 값은 browser에 노출된다고 간주한다.
browser에서 사용할 수 없는 secret에 VITE_ prefix를 붙이지 않는다.
```

Product DB:

```text
DATABASE_URL=postgresql+<driver>://<user>:<password>@<host>:5432/<database>
```

Scene API containment:

```text
SCENE_API_ENABLED=false
```

기본값 `false`에서는 모든 `/api/v1/scenes/*` 요청이 `404`이고 OpenAPI schema에도 Scene route가 나타나지 않는다. 로컬 GPU 검증처럼 승인된 개발 환경에서만 `SCENE_API_ENABLED=true`를 명시한다. 이 설정은 공개 환경의 즉시 차단 장치이며 사용자 인증과 객체 단위 인가를 대신하지 않는다.

`DATABASE_URL`과 Supabase secret은 server 환경에만 두며 문서·브라우저 bundle·Git에 실제 값을 기록하지 않는다.

Scene worker:

| 변수 | 기본값 | 역할 |
| --- | --- | --- |
| `SCENE_WORKER_MODE` | `host` | `host`의 `ns-*` 도구 또는 `docker` runner 선택 |
| `SCENE_DOCKER_IMAGE` | `ghcr.io/nerfstudio-project/nerfstudio:1.1.5` | 재현 가능한 Nerfstudio image pin |

CUDA worker 준비:

```powershell
docker pull ghcr.io/nerfstudio-project/nerfstudio:1.1.5
$env:SCENE_WORKER_MODE="docker"
pnpm dev
```

`SCENE_API_ENABLED=true`인 개발 환경의 `/api/v1/scenes/toolchain`에서 `ready=true`, image, GPU 이름과 VRAM을 확인한 뒤 upload를 시작한다.

remote GPU server에서 local-only 검증할 때는 [GPU Scene Validation](../operations/gpu-scene-validation.md)을 따른다. P100처럼 compute capability가 낮은 장비는 VRAM이 충분해도 최신 gsplat kernel을 실행하지 못할 수 있으므로, 검증된 compatibility set과 실제 kernel import 결과를 함께 확인한다.

## 10. Dependency 변경

```powershell
pnpm --filter @localtwin/web add <package>
pnpm --filter @localtwin/web add -D <package>

uv add --directory apps/api <package>
uv add --directory apps/api --dev <package>
```

dependency 변경 커밋에는 manifest와 lockfile을 함께 포함하고 해당 영역의 최소 검증을 실행한다.

## 11. 관련 문서

- [개발 컨벤션](./conventions.md)
- [개발 전 결정 Gate](./pre-development-decisions.md)
- [검증 가이드](./validation.md)
- [Git 작업 규칙](./git-workflow.md)
- [LocalTwin Dev Harness](./harness.md)
- [LocalTwin 디자인 시스템](../design/design-system.md)
