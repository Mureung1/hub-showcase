# LocalTwin 개발 컨벤션

## 1. 적용 원칙

이 문서는 LocalTwin의 코드, API, 데이터, 테스트와 Git 작업 규칙을 정의한다.

```text
기존 패턴을 먼저 따른다.
한 작업에서 필요한 범위만 변경한다.
자동 검사로 확인할 수 있는 규칙은 formatter, linter, test와 hook에 맡긴다.
규칙 예외가 필요하면 task packet에 이유와 검증 방법을 남긴다.
```

## 2. 공통 규칙

- 파일은 UTF-8과 LF를 사용한다.
- 들여쓰기는 TypeScript, JSON, YAML에서 2칸, Python에서 4칸을 사용한다.
- 줄 끝 공백과 불필요한 빈 줄을 남기지 않는다.
- secret, token, 원본 촬영물과 개인정보를 source, log, 문서에 기록하지 않는다.
- 새 dependency는 실제 작업에서 필요할 때만 추가한다.
- 관련 없는 formatting이나 refactoring을 기능 변경에 섞지 않는다.

기준 파일:

```text
.editorconfig
.prettierrc.json
product/apps/web/tsconfig.app.json
product/apps/api/pyproject.toml
```

## 3. Web 컨벤션

### Naming

| 대상 | 규칙 | 예시 |
| --- | --- | --- |
| React component와 파일 | `PascalCase` | `MarketMap.tsx` |
| hook | `use` + `PascalCase` | `useMarketStores.ts` |
| 함수와 변수 | `camelCase` | `calculateRadiusSummary` |
| 상수 | `UPPER_SNAKE_CASE` | `DEFAULT_RADIUS_METERS` |
| test | 대상 파일과 같은 이름 + `.test` | `MarketMap.test.tsx` |

### Structure

기능이 처음 구현될 때 다음 구조를 만든다.

```text
product/apps/web/src/features/<feature>/
  components/
  hooks/
  api/
  model/
  <Feature>.test.tsx
```

여러 기능에서 실제로 재사용되는 코드만 `product/apps/web/src/shared/`로 이동한다. 한 번만 쓰는 코드를 공통 abstraction으로 미리 만들지 않는다.

### TypeScript와 React

- TypeScript strict mode를 사용한다.
- `any`는 사용하지 않는다. 외부 입력은 `unknown`으로 받고 검증 후 좁힌다.
- component는 화면 표현과 interaction에 집중한다.
- API 호출과 응답 변환을 component 내부에 직접 누적하지 않는다.
- server state library는 실제 caching 요구가 생기기 전까지 추가하지 않는다.
- 색상, spacing, typography와 elevation은 `product/apps/web/src/styles/tokens.css`를 기준으로 한다.
- icon이 있는 일반 동작은 `lucide-react`를 사용한다.
- interactive element는 keyboard focus와 accessible name을 제공한다.

Formatting과 정적 검사는 Prettier, TypeScript와 Oxlint 결과를 기준으로 한다.

## 4. API 컨벤션

### Naming과 structure

| 대상 | 규칙 | 예시 |
| --- | --- | --- |
| Python module, 함수, 변수 | `snake_case` | `market_summary.py` |
| class와 Pydantic model | `PascalCase` | `MarketSummary` |
| 상수 | `UPPER_SNAKE_CASE` | `DEFAULT_RADIUS_METERS` |
| test | `test_*.py` | `test_health.py` |

기능이 처음 구현될 때 역할에 따라 다음 디렉터리를 추가한다.

```text
product/apps/api/src/localtwin_api/
  api/
  domain/
  services/
  repositories/
```

route handler는 HTTP 입력과 출력 조정에 집중한다. 계산 규칙과 데이터 변환은 재사용하거나 독립적으로 검증할 필요가 생길 때 service 또는 domain으로 분리한다.

### Python

- public 함수와 method에 type hint를 작성한다.
- Ruff의 lint와 format 결과를 기준으로 한다.
- line length는 100자로 제한한다.
- 비동기 I/O가 필요한 경로만 `async`로 작성한다.
- 예상 가능한 domain 오류와 programming error를 무분별하게 하나의 `except`로 합치지 않는다.

## 5. API Contract

```text
health endpoint: /health
제품 endpoint prefix: /api/v1
JSON field: snake_case
시간: ISO 8601 UTC
좌표계: WGS84, EPSG:4326
GeoJSON coordinate order: [longitude, latitude]
```

- 외부 API의 raw field 이름은 importer 경계에서 canonical field로 변환한다.
- 응답에 측정값을 제공할 때 가능한 경우 `source`, `period`, `unit`, `method`를 함께 보존한다.
- error response 형식은 첫 제품 endpoint task에서 실제 요구사항과 함께 확정한다.
- breaking API change는 version 변경 또는 migration decision 없이 적용하지 않는다.

## 6. Data 컨벤션

| 경로 | 용도 | Git 정책 |
| --- | --- | --- |
| `product/data/raw/` | 원본 공공데이터 | 내용 추적 금지 |
| `product/data/processed/` | 정규화/집계 결과 | 내용 추적 금지 |
| `product/data/fixtures/` | 작고 비식별화된 test/sample | 추적 허용 |
| `product/data/scenes/` | 촬영물과 3D asset | 내용 추적 금지 |

- raw data를 직접 수정하지 않는다.
- fixture는 canonical schema를 따라야 하며 화면 전용 임의 구조를 만들지 않는다.
- 좌표, 기간, 단위와 출처를 잃지 않는다.
- 직접 관찰값과 공공데이터를 같은 source처럼 표시하지 않는다.
- 원본 촬영물, 얼굴, 차량번호와 secret은 저장소에 commit하지 않는다.

## 7. Test 컨벤션

```text
기능 구현:
해당 기능의 unit/component/integration test 또는 의미 있는 smoke check를 같은 작업에 포함한다.

버그 수정:
가능하면 실패를 재현하는 regression case를 먼저 만들고 동일 case의 통과를 확인한다.

문서 변경:
문서 index와 local link 검사를 실행한다.
```

- test는 구현 세부사항보다 사용자가 관찰할 behavior와 contract를 확인한다.
- 외부 API에 의존하는 test는 작은 fixture나 adapter boundary를 사용한다.
- 실제 API key와 네트워크 상태에 따라 결과가 달라지는 test를 기본 로컬 검증에 넣지 않는다.

## 8. Dependency 컨벤션

```powershell
pnpm --dir product --filter @localtwin/web add <package>
pnpm --dir product --filter @localtwin/web add -D <package>
uv add --directory product/apps/api <package>
uv add --directory product/apps/api --dev <package>
```

- npm과 pip를 lockfile 관리에 혼용하지 않는다.
- dependency 변경 시 manifest와 lockfile을 같은 commit에 포함한다.
- package를 추가한 이유와 대안 검토 결과를 task packet 또는 관련 문서에 남긴다.
- dependency 추가 후 해당 영역의 lint, test와 build를 확인한다.

## 9. Git 컨벤션

- `main`은 release 기준, `develop`은 개발 통합 기준으로 사용한다.
- 작업 branch는 `feat/`, `fix/`, `docs/`, `chore/` 중 목적에 맞는 prefix를 사용한다.
- 일반 PR은 `develop`을 대상으로 하고, `main`에는 release PR만 보낸다.
- commit subject와 `why`, `verify` 본문은 영어로 작성한다.
- 한 기능, 한 버그, 한 문서 작업 단위로 commit한다.
- `--no-verify`로 hook을 우회하지 않는다.

상세 형식은 [Git 작업 규칙](./git-workflow.md)을 따른다.

## 10. 완료 조건

작업을 완료로 표시하기 전에 확인한다.

```text
task packet의 scope 안에서만 변경했는가?
관련 test 또는 check가 통과했는가?
README, feature spec, checklist 또는 decision 문서 갱신이 필요한가?
실행한 검증과 known limitation을 run report에 기록했는가?
commit이 한 가지 목적을 설명하는가?
```

## 11. 관련 문서

- [개발환경](./environment.md)
- [개발 전 결정 Gate](./pre-development-decisions.md)
- [Git 작업 규칙](./git-workflow.md)
- [검증 가이드](./validation.md)
- [LocalTwin Dev Harness](./harness.md)
