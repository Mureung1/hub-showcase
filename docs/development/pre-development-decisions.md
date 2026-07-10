# LocalTwin 개발 전 결정 Gate

## 1. 목적

이 문서는 본격적인 제품 개발 전에 무엇이 확정됐고, 무엇을 어떤 증거로 결정해야 하는지 관리한다. 검증하지 않은 선택을 확정 사항처럼 기록하지 않는다.

상태:

```text
Locked: 현재 개발 기준으로 확정
Gate: 해당 작업을 시작하기 전에 결정 필요
Deferred: v0.1 범위 밖이거나 지금 결정할 필요 없음
```

## 2. 현재 확정 사항

| 영역 | 결정 | 근거 문서 |
| --- | --- | --- |
| 제품 범위 | 상권 분석 P0, 3D 현장 탐색 P1 | [v0.1 범위](../module-notes/localtwin-v0.1-scope.md) |
| 저장소 | `apps/web` + `apps/api` monorepo | [개발환경](./environment.md) |
| Web | React + Vite + TypeScript | [개발환경](./environment.md) |
| API | FastAPI + Pydantic Settings | [개발환경](./environment.md) |
| package manager | Web은 pnpm, API는 uv | [개발환경](./environment.md) |
| 지도 PoC | MapLibre GL JS + react-map-gl | [지도 스펙](../features/market-map-experience.md) |
| 개발 통합 branch | `develop` | [Git 작업 규칙](./git-workflow.md) |
| 검증 진입점 | `scripts/check.ps1` | [검증 가이드](./validation.md) |
| 데이터 경계 | raw, processed, fixtures, scenes 분리 | [개발 컨벤션](./conventions.md) |
| API 기본 규칙 | `/api/v1`, snake_case, UTC, WGS84 | [개발 컨벤션](./conventions.md) |
| secret | `.env`/GitHub Secret, browser secret 금지 | [개발환경](./environment.md) |

## 3. 제품 개발 시작 Gate

### G1. 대상 상권과 업종

결정할 내용:

```text
후보 상권 2~3곳
v0.1 대상 상권 1곳
카페 또는 음식점 중 첫 분석 업종
분석 중심점과 100m / 300m / 500m 반경 의미
```

필요한 증거:

```text
점포, 인허가, 유동인구 데이터 확보 가능성
데이터 갱신 주기와 license
촬영 가능성은 3D 대상지를 함께 선정할 때만 평가
```

완료 산출물:

```text
docs/data/data-source-mapping.md 갱신
docs/development/checklist.md 갱신
선정 이유를 decision note로 기록
```

### G2. 공공데이터 source와 사용 조건

확인할 내용:

```text
실제 endpoint 또는 공식 file URL
API key 발급 절차
quota, pagination, update cycle
license와 공개 fixture 허용 범위
raw field와 canonical field mapping
```

Gate 통과 전에는 화면용 임의 data schema를 확정하지 않는다.

### G3. Canonical Schema

첫 importer와 API endpoint 구현 전에 다음을 확정한다.

```text
Market
Store
PermitBusiness
FlowObservation
LocationScore
Report
```

각 model은 identifier, 좌표계, time grain, source, nullable field와 validation rule을 포함해야 한다. fixture는 확정된 canonical schema를 그대로 사용한다.

### G4. Database와 migration

기본 방향은 SQLite다. 첫 persistent schema 작업 전에 아래를 비교해 선택한다.

```text
SQLAlchemy + Alembic을 도입할 만큼 migration과 query abstraction이 필요한가?
표준 sqlite3로도 v0.1 query와 test를 단순하게 유지할 수 있는가?
원본/정제 file과 DB가 각각 무엇을 소유하는가?
```

결정 후 schema, migration, seed와 backup 정책을 문서화한다. 지금은 SQLAlchemy와 Alembic을 설치하지 않는다.

### G5. 2.5D Map PoC

MapLibre 최종 채택 전에 대상 상권의 작은 sample로 확인한다.

```text
building footprint와 height data 확보
extrusion rendering과 camera interaction
점포 marker와 유동인구 layer 동시 표시
desktop/mobile 성능과 WebGL2 지원
높이 data가 없을 때 2D fallback
```

PoC 결과로 MapLibre 유지 또는 2D fallback을 결정한다. deck.gl은 MapLibre만으로 충족되지 않는 대량 animation 요구가 확인될 때만 다시 검토한다.

### G6. 핵심 metric 정의

구현 전에 계산식과 표시 의미를 분리해 정의한다.

```text
동일 업종 경쟁 강도
개업/폐업 흐름
평균 영업기간
신생기업 생존율
시간대/요일별 유동
지역별/업종별 매출 순위
입지 점수
```

각 metric은 source, period, unit, denominator, exclusion과 minimum sample을 명시해야 한다. 상관관계를 창업 성공 예측처럼 표현하지 않는다.

## 4. 3D 보조기능 시작 Gate

3D 기능은 P0 상권 분석의 기반이 만들어진 후 시작한다.

### G7. 촬영과 privacy

```text
촬영 허가와 공개 범위
원본 영상 보관 위치와 삭제 주기
얼굴/차량번호 처리 기준
사람 bbox의 blur, mask, frame exclude 기준
cleaned frame 공개 가능 여부
```

원본 촬영물과 scene asset은 Git에 commit하지 않는다.

### G8. Gaussian Splatting pipeline

```text
학습/변환 도구와 실행 환경
web viewer와 scene format
asset 크기와 loading budget
사람 눈높이 camera와 이동 제한
walkable/excluded zone metadata
사람 mesh와 splat의 depth/occlusion 가능성
지원하지 못할 때의 static fallback
```

viewer library는 sample scene의 load, interaction과 rendering 검증 후 선택한다.

### G9. 혼잡도 표현

공공데이터 또는 수동 관찰값을 실제 개인의 위치처럼 표현하지 않는다.

```text
통계값을 사람 object 수로 변환하는 규칙
시간대별 sample 크기와 오차 표시
지도 layer와 3D 현장 상세보기의 서로 다른 표현 목적
legend와 data source 표기
```

## 5. 운영 Gate

### G10. 배포 환경

첫 공유 가능한 vertical slice 전에 결정한다.

```text
web hosting
API hosting
SQLite volume 또는 managed database
development / preview / production environment
CORS origin
secret 관리
logging과 최소 monitoring
backup과 rollback
```

### G11. GitHub 보호 규칙

현재 local hook은 `--no-verify`로 우회할 수 있다. 팀 작업 또는 자동 병합 전에 GitHub에서 확인한다.

```text
develop과 main branch protection
PR review 요구 여부
force push와 branch deletion 제한
auto-merge workflow 사용 여부와 병합 조건 확인
```

현재 `.github/workflows/auto-merge.yml`은 로컬 검증 결과를 알 수 없다. branch protection 없이 사용하면 검증 전 merge 위험이 있으므로 운영 설정 확인 전에는 안전하다고 간주하지 않는다.

## 6. Deferred

다음은 v0.1에서 미리 결정하지 않는다.

```text
전국 단위 infrastructure
실시간 CCTV와 streaming
AR client
상용 매출 예측
도시 전체 3D reconstruction
범용 plugin architecture
microservice 분리
```

## 7. Gate 운영 방법

1. 새 task packet에 관련 Gate를 연결한다.
2. 공식 source, sample response 또는 PoC 결과를 확인한다.
3. 결정과 기각한 대안을 관련 문서에 기록한다.
4. checklist 상태를 갱신한다.
5. 필요한 dependency와 code만 그 다음 commit에서 추가한다.

Gate를 통과하지 못하면 fixture 기반의 작은 실험까지만 허용하고 제품 결정으로 확대하지 않는다.

## 8. 관련 문서

- [개발환경](./environment.md)
- [개발 컨벤션](./conventions.md)
- [전체 개발 체크리스트](./checklist.md)
- [데이터 소스 매핑](../data/data-source-mapping.md)
- [2.5D 상권 지도와 유동인구 Layer](../features/market-map-experience.md)
- [Gaussian Splatting 현장 상세보기](../features/3d-congestion-explorer.md)
