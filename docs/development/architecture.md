# LocalTwin 시스템 아키텍처

문서 상태: current
최종 갱신: 2026-07-13

이 문서는 LocalTwin의 Front, Back, Data와 외부 서비스가 어떻게 연결되는지 설명하는 아키텍처 원본이다. 구현된 현재 구조와 4주 개발 후 목표 구조를 구분한다.

## 1. 설계 원칙

- 브라우저는 공공데이터 인증키를 직접 사용하지 않는다.
- 원본 데이터, 정규화 데이터와 화면용 응답을 분리한다.
- 상권 분석은 P0, 3D 현장 탐색은 P1로 둔다.
- API는 단일 FastAPI를 유지하고, Phase 2 제품 runtime DB는 Supabase PostgreSQL을 사용한다.
- Phase 1 canonical SQLite는 폐기하지 않고 반복 가능한 import 원본과 결과 검증 기준으로 유지한다.
- 분석 결과에는 source, period, unit과 method 근거를 함께 제공한다.

## 2. 현재 구현 구조

```mermaid
flowchart LR
  user["사용자"]

  subgraph front["Front"]
    web["React + Vite + TypeScript"]
    map["MapLibre LocalTwin 지도"]
    fallback["Canonical deploy snapshot"]
  end

  subgraph back["Back"]
    api["FastAPI\nmarket · score · scene API"]
    marketRepo["Canonical market repository"]
    collector["서울 Open API 수집기"]
    sceneWorker["Nerfstudio host / Docker worker\nprocess · train · export"]
  end

  subgraph data["Data"]
    raw["product/data/raw\nJSON + manifest"]
    db[("canonical SQLite")]
    osm["OpenStreetMap / Overpass"]
    mapdata["상권별 LocalTwin GeoJSON"]
    seoul["서울 열린데이터광장"]
    sceneJobs["product/data/scenes/jobs\ninput · job.json · PLY"]
  end

  user --> web
  web --> map
  db --> fallback --> web
  osm --> mapdata --> map
  collector --> seoul
  collector --> raw
  web -->|"upload · poll"| api
  web -->|"market query"| api
  raw --> db
  api --> marketRepo --> db
  api --> sceneWorker
  sceneWorker --> sceneJobs
  sceneJobs -->|"Spark viewer"| web
```

현재 확인된 상태:

| 영역  | 구현 상태                                                             | 제한                                            |
| ----- | --------------------------------------------------------------------- | ----------------------------------------------- |
| Front | 자체 지도, API adapter와 canonical fallback으로 상권·업종·Layer를 조작하는 React 웹 | 반경은 아직 지도 탐색 범위이며 공간 재집계 전 |
| Back  | FastAPI market/score/scene API와 canonical SQLite repository            | 반경별 공간 query와 주기적 운영 배포 미구현   |
| Data  | 서울·공공데이터 수집기, canonical SQLite와 OSM 지도 생성기               | 주기적 자동 갱신과 좌표 변환 미구현              |
| 3D    | 촬영물 job, host/Docker worker, Nerfstudio pipeline과 Spark viewer | 공식 sample만 검증됨. 제품 환경 Scene API는 보안 gate 전까지 기본 비활성화 대상 |

## 3. Phase 2 목표 구조

```mermaid
flowchart LR
  user["Client\n발표자 / 예비창업자"]

  subgraph front["Front"]
    web["React + Vite"]
    workspace["MapLibre 분석 Workspace"]
    panels["Filter · Compare · Report"]
    scene["P1 3D Scene Viewer"]
  end


  subgraph back["Back"]
    api["FastAPI /api/v1"]
    market["Market Analysis Service"]
    score["Score + Report Service"]
    evidence["Source Metadata"]
  end

  subgraph storage["Storage"]
    db[("Supabase PostgreSQL\nProduct Runtime")]
    canonical[("Canonical SQLite\nImport · Verification Source")]
    migrations["SQLAlchemy + Alembic"]
    raw["Raw Snapshot\nJSON + manifest"]
    assets["Scene Assets"]
  end

  subgraph providers["External Data"]
    seoul["서울 열린데이터광장"]
    public["공공데이터포털"]
    osm["OpenStreetMap / Overpass"]
    mapSnapshot["LocalTwin GeoJSON snapshot"]
  end

  user --> web
  web --> workspace
  web --> panels
  osm --> mapSnapshot --> workspace
  web -->|"HTTPS JSON"| api
  api --> market
  api --> score
  market --> db
  score --> db
  evidence --> api
  seoul --> raw
  public --> raw
  raw -->|"normalize / validate"| canonical
  canonical -->|"migrate / seed"| migrations --> db
  scene --> assets
  panels -. "선택 위치" .-> scene
```

## 4. 요청과 데이터 흐름

### 4.1 데이터 준비

```text
공식 API/File
-> provider별 raw snapshot과 manifest 저장
-> 주소·좌표·업종·기간 정규화
-> canonical schema 품질 검사
-> canonical SQLite 적재와 기준 row count 검증
-> Alembic schema가 적용된 Supabase PostgreSQL에 migrate/seed
```

### 4.2 사용자 분석 요청

```text
상권/업종/반경 선택
-> React가 FastAPI 분석 endpoint 호출
-> DB에서 대상 점포와 지표 조회
-> 경쟁·변화·시간대·입지 점수 계산
-> source metadata를 포함한 JSON 응답
-> 지도, 비교표와 리포트 갱신
```

### 4.3 보조 3D 탐색

```text
지도에서 선택 위치 상세보기
-> 360 영상·사진 upload와 hash 검증
-> worker readiness 확인
-> ns-process-data -> ns-train splatfacto -> ns-export
-> PLY asset을 Spark/Three.js로 로드
-> 10시 / 13시 / 15시 / 18시 관찰 metadata 선택
```

원본과 job은 브라우저 정적 bundle이 아니라 API의 scene storage에 둔다. 익명화 검증 전 asset은 외부 공개 대상으로 취급하지 않는다.

## 5. 기술 스택과 도입 상태

| 계층     | 현재 사용                                       | Phase 2 목표                               | 후속 후보                                   |
| -------- | ----------------------------------------------- | ------------------------------------------- | ----------------------------------------------- |
| Front    | React, Vite, TypeScript, MapLibre, API/snapshot adapter | 기능별 파일 분리, 검색·반경 query와 source-aware 상태 | 대규모 Layer가 필요할 때 deck.gl 검토           |
| Back     | FastAPI market/score/scene endpoint, Uvicorn    | SQLAlchemy repository, 검색·반경 API와 service 배포 | 부하가 확인된 뒤 worker/cache 검토              |
| Data     | raw manifest, canonical SQLite, deploy snapshot | Supabase PostgreSQL, Alembic migration과 seed 검증 | 다지역 공간 질의가 필요할 때 PostGIS 검토 |
| Analysis | score 1.0.0과 실제 DB peer percentile          | 추가 지표로 confidence coverage 개선       | 충분한 데이터 이후 예측 모델 검토               |
| 3D       | upload/job API, Nerfstudio pipeline, Spark/Three.js viewer | CUDA worker에서 실제 scene 1개 학습·익명화 검증 | 혼잡도 mesh overlay와 pipeline 고도화           |
| Quality  | pytest, Vitest, TypeScript, lint, 문서 검사     | 평가 script와 시연 smoke test               | 필요 시 E2E 자동화                              |

## 6. 배포 구조

```text
ARCH-002 적용 후
  product/      실제 서비스 source와 제품 배포 artifact
  docs/         개발·결정·검증 문서 source와 별도 문서 배포 artifact
  두 artifact는 서로의 내부 파일을 복사하거나 함께 배포하지 않음

Product runtime
  React -> FastAPI -> Supabase PostgreSQL

Import/verification
  official snapshots -> canonical SQLite -> migration/seed -> PostgreSQL
```

제품은 `product/vercel.json`에서 `product/apps/web/dist`만 배포하고, 문서는 루트 `vercel.json`에서 `dist/docs-site`만 배포한다. 루트 `.vercelignore`는 Vercel source upload를 `docs/`, 문서 build script, `package.json`, `vercel.json`으로 제한한다. 따라서 ignored raw data, canonical DB, Scene asset과 제품 source는 build 이전 upload 단계에도 포함하지 않는다. 제품의 Docs 링크는 `VITE_DOCS_URL` 또는 현재 문서 URL을 사용하므로 같은 artifact의 `/docs`에 의존하지 않는다. 공공데이터 인증키와 수집기는 브라우저 bundle에 넣지 않으며 Scene route는 SEC-001의 제품 기본 차단을 유지한다. 실제 공개 제품 URL 생성은 별도 배포 Task에서 수행한다.

## 7. 이번 구조에서 하지 않는 것

- Eureka, API Gateway, Microservice 분할
- Redis와 Elasticsearch 선도입
- 실시간 영상 스트리밍
- 브라우저에서 provider API 직접 호출
- 서울 전체 검색과 도시 전체 3D reconstruction

첨부 예시처럼 Front와 Back의 책임은 분리하되, 프로토타입 규모에 필요하지 않은 분산 시스템 구성은 넣지 않는다.

## 8. 관련 문서

- [4주 개발 백로그](./tasks.md)
- [개발환경](./environment.md)
- [개발 컨벤션](./conventions.md)
- [데이터베이스 구조와 ERD](../data/database-structure.md)
- [데이터 소스 매핑](../data/data-source-mapping.md)
- [공공데이터 기반 상권 분석](../features/market-analysis.md)
- [2.5D 상권 지도와 유동인구 Layer](../features/market-map-experience.md)

## 9. 변경 기록

| 날짜       | 변경                                         | 이유                                                       |
| ---------- | -------------------------------------------- | ---------------------------------------------------------- |
| 2026-07-10 | 현재 구조와 4주 목표 구조를 분리해 최초 작성 | 구현된 기능과 계획을 같은 구조도로 오해하지 않게 하기 위해 |
| 2026-07-11 | scene job API, Nerfstudio worker와 Spark viewer 반영 | 구현 코드와 실제 GPU 제약을 구조에 함께 표시하기 위해 |
| 2026-07-11 | canonical market API와 Front fallback 반영 | 로컬 API와 정적 배포의 실제 데이터 경로를 구분하기 위해 |
| 2026-07-11 | Docker scene worker와 renderer QA 반영 | worker 재현성과 실제 capture 미검증을 구분하기 위해 |
| 2026-07-13 | Phase 2 runtime DB와 제품·문서 배포 경계 확정 | SQLite를 이관 원본으로 유지하면서 실제 서비스 구조로 전환하기 위해 |
| 2026-07-14 | 제품·문서 물리 source와 배포 artifact 분리 | 제품 build에서 내부 문서를 제거하고 문서 build에서 제품 source를 제외하기 위해 |
| 2026-07-15 | 문서 Vercel source upload allowlist 추가 | 로컬 raw data와 Scene asset이 문서 build 전 upload 대상에 포함되지 않게 하기 위해 |
