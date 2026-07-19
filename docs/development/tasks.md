# LocalTwin Phase 1 종료 및 Phase 2 개발 백로그

문서 상태: canonical
개발 기간: 4주 (Phase 1 종료, Phase 2 진행 중)
최종 갱신: 2026-07-20

이 문서는 LocalTwin에서 앞으로 수행할 제품 작업의 유일한 백로그다. 큰 Task인 Epic 아래에 세부 Task를 두고, 실제 작업을 시작할 때 `.harness/tasks/<task-id>.md` Task Packet으로 범위와 검증을 고정한다.

## 1. Product Goal

4주 안에 실제 공공데이터를 수집·정규화·분석하고, 사용자가 지도에서 상권·업종·반경을 바꾸며 경쟁 강도, 상권 변화, 시간대 특성과 근거가 있는 입지 리포트를 시연할 수 있는 LocalTwin 프로토타입을 완성한다.

3D 장면 탐색은 핵심 상권 분석이 동작한 뒤 연결하는 P1 보조 기능이다.

## 1.1 Phase 인계 상태

Phase 1은 기반 구현 단계로 종료한다. 이는 LocalTwin 전체 목표의 완료를 뜻하지 않는다.

Phase 1에서 완료된 기반:

- 제품 웹과 문서·legacy prototype의 public route 및 물리 폴더·배포 artifact 분리
- 공공데이터 수집, canonical SQLite와 반복 가능한 importer 구축
- 상권 점수 공식, 근거 API/UI와 3개 상권·4개 업종 연결
- LocalTwin 지도용 low-poly 점포 prefab 구현
- GPU 서버에서 Nerfstudio 공식 `storefront` sample 학습·export와 local viewer 검증

Phase 1 완료로 해석하면 안 되는 항목:

- 공식 sample 검증은 사용자 촬영 360 영상·다중 시점 사진의 end-to-end 성공 증거가 아니다.
- UI의 privacy 안내는 얼굴·차량번호 익명화와 서버 privacy gate 완료 증거가 아니다.
- 상권 경계 기반 분석은 100m/300m/500m 반경 query 완료를 뜻하지 않는다.
- API adapter 연결은 filter·URL·지도·패널 동기화와 통합 smoke test 완료를 뜻하지 않는다.
- 보안 점검 문서 작성은 SEC-001~008의 실제 조치 완료를 뜻하지 않는다.

Phase 2 종료 기준:

1. 합성 fixture와 승인된 사용자 촬영 sample에서 익명화·privacy gate를 포함한 변환 경로가 검증된다.
2. 반경별 분석, filter 동기화와 Front-API 통합 smoke test가 통과한다.
3. SEC-001~008이 각각 재현, 수정, 회귀 테스트를 거쳐 `Verified`가 된다.
4. 배포 경로와 최종 문서가 실제 구현 상태와 일치한다.

## 2. 백로그 양식

백로그는 다음 필드를 사용한다.

| 필드       | 의미                                                   |
| ---------- | ------------------------------------------------------ |
| ID         | `영역-번호` 형식의 변하지 않는 식별자                  |
| Parent     | 상위 Epic ID                                           |
| Outcome    | 구현 목록이 아니라 완료 후 달라지는 사용자/시스템 상태 |
| Priority   | `P0` 필수, `P1` 중요, `P2` 여유가 있을 때              |
| Status     | `Done`, `In Progress`, `Ready`, `Backlog`, `Blocked`   |
| Week       | 목표 주차. 확정 마감일이 아니라 계획 기준              |
| Depends on | 먼저 끝나야 하는 Task                                  |
| Acceptance | 완료 여부를 확인할 수 있는 최소 기준                   |
| Packet     | 실행할 때 만드는 `.harness/tasks/<task-id>.md`         |

## 3. 관리 방법

1. 이 문서의 순서를 현재 우선순위로 사용한다.
2. 한 주 시작 시 해당 주차의 `Ready` Task만 선택한다.
3. Task가 1~2일 안에 검증하기 어렵다면 더 작은 Task로 나눈다.
4. `In Progress`로 바꾸기 전에 Task Packet에 Scope, Acceptance와 Verification을 적는다.
5. PR 또는 커밋은 세부 Task 하나를 기준으로 만든다.
6. 구현과 문서가 검증되면 Run Report를 남기고 `Done`으로 바꾼다.
7. 막힌 Task는 `Blocked`와 사유를 기록하고, 독립적인 다음 Task로 이동한다.
8. 상세 기능 정의는 기능 스펙에서 관리하며 백로그에 다시 복사하지 않는다.

Scrum Guide가 설명하는 “정렬되고 계속 구체화되는 단일 Product Backlog”를 문서 원칙으로 삼고, GitHub에서 옮길 때는 Epic을 Parent Issue, 세부 Task를 Sub-issue로 매핑한다.

## 4. 상태 흐름

```text
Backlog -> Ready -> In Progress -> Done
                    |
                    -> Blocked -> Ready
```

진행 중 Task는 원칙적으로 1개, 많아도 2개를 넘기지 않는다.

## 5. 원래 4주 로드맵과 현재 상태

주차는 최초 계획 기준이다. Phase 1 종료 후 남은 작업은 기존 주차와 무관하게 아래 Phase 2 Ready Queue 순서로 수행한다.

| 주차  | 목표                              | 주요 결과물                                                     | 주차 종료 시연                                         |
| ----- | --------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------ |
| 1주차 | 데이터와 구조를 믿을 수 있게 준비 | 아키텍처, 공식 raw snapshot, canonical schema, 데이터 품질 요약 | 실제 데이터가 어떤 과정을 거쳐 분석 입력이 되는지 설명 |
| 2주차 | 핵심 분석과 API 완성              | 경쟁·변화·시간대 metric, 입지 점수, `/api/v1` endpoint, SQLite  | 한 상권/업종/반경의 실제 분석 JSON과 근거 확인         |
| 3주차 | 조작 가능한 지도 시연 완성        | API 연결 지도, 다중 업종, 반경·Layer·비교·리포트, 오류 상태     | 발표자가 화면의 주요 기능을 직접 조작                  |
| 4주차 | 통합·보조 기능·발표 품질 완성     | 3D 보조 장면, 평가 script, demo scenario, 배포와 문서           | 처음부터 끝까지 끊기지 않는 통합 데모                  |

## 6. Epic과 세부 Task

### EPIC-01. 개발 기준과 문서 원본 정리

Outcome: 팀원이 Home만 보고 현재 구조, 다음 작업과 문서의 원본을 찾을 수 있다.

| ID       | 세부 Task                           | Priority | Status | Week | Acceptance                                         |
| -------- | ----------------------------------- | -------- | ------ | ---- | -------------------------------------------------- |
| ARCH-001 | 현재/목표 시스템 아키텍처 작성      | P0       | Done   | 1    | Front, Back, Data와 외부 source 흐름이 구분된다    |
| DOCS-001 | 문서 원본과 중복 문서 역할 정리     | P0       | Done   | 1    | canonical/support/history/legacy 역할이 문서화된다 |
| DOCS-003 | Home, Viewer와 Knowledge Graph 연결 | P0       | Done   | 1    | Task와 Architecture를 모든 문서 진입점에서 연다    |
| PLAN-001 | 4주 Epic/Task 백로그 확정           | P0       | Done   | 1    | 모든 P0가 주차와 완료 기준을 가진다                |
| PLAN-002 | Phase 1 기준선 확인과 Phase 2 인계       | P0       | Done   | Phase 2 | 완료·미완료·의존 순서가 문서와 Issue에서 일치한다 |
| ARCH-002 | 제품 source·배포 artifact를 문서와 물리 분리 | P0 | Done | Phase 2 | 제품 build에 내부 문서가 없고 문서 build에 제품 source가 없다 |

### EPIC-02. 공식 데이터 수집과 Canonical Schema

Outcome: 화면용 임의 수치가 아니라 출처와 기준 기간이 있는 실제 데이터를 반복해서 준비할 수 있다.

| ID       | 세부 Task                                           | Priority | Status      | Week | Depends on | Acceptance                                                  |
| -------- | --------------------------------------------------- | -------- | ----------- | ---- | ---------- | ----------------------------------------------------------- |
| DATA-001 | 서울 Open API raw snapshot 준비                     | P0       | Done        | 1    | -          | 20251 기준 101,110행과 manifest를 저장했다                  |
| DATA-002 | 공공데이터포털 점포·인허가 API 실제 응답 검증       | P0       | Done        | 1    | DATA-001   | 3개 API 60행 sample과 secret 미포함을 확인했다              |
| DATA-003 | Store·Permit·Population·Sales canonical schema 확정 | P0       | Done        | 1    | DATA-002   | 7개 SQLite table, source FK와 좌표계를 정의했다             |
| DATA-004 | provider별 raw-to-canonical importer 구현           | P0       | Done        | 1    | DATA-003   | 같은 명령을 2회 실행해 동일 row count를 확인했다            |
| DATA-005 | 중복·결측·좌표·기간 품질 검사 작성                  | P0       | Backlog     | 1    | DATA-004   | 오류 건수와 제외 이유를 표로 출력한다                       |
| DATA-006 | 시연 상권과 비교 상권 sample 확정                   | P0       | Backlog     | 1    | DATA-005   | 최소 2개 상권과 카페·음식점·베이커리·편의점 분석이 가능하다 |
| DB-001   | Supabase PostgreSQL schema·migration·전체 canonical seed | P0 | Done | Phase 2 | ARCH-002, DATA-004 | development Supabase migration·2회 전체 seed·47 API test와 GitHub #11 종료를 완료했고 Jira 수동 동기화만 남는다 |
| DATA-007 | 운영 수집 범위·요청 시점·갱신·보존 정책 결정       | P1       | In Progress | Later | DATA-009 | 공공데이터만 사용하며 최초 bulk import 후 실행 주기, quota, raw 보존·rollback 기준과 자동화 범위를 확정한다 |
| DATA-008 | 분기 상가정보·인허가·상권영역 bulk importer와 품질 검사 | P0 | In Progress | Phase 2 | DATA-004 | 서울 상가정보 537,489행·점포-상권 304,775행과 3개 상권 polygon 적재를 완료했고 전체 인허가 확장을 남겼다 |
| DATA-009 | 개별 점포-상권 공간 결합과 공식 밀집 집계 비교 | P0 | In Progress | Phase 2 | DATA-008 | 3개 상권에 4,548개 점포를 공간 결합했고 공식 업종 집계와 차이 보고를 남겼다 |
| DATA-010 | KOSIS 행정동 인구·사업체 종사자 보강 | P1 | Done | Phase 2 | DATA-008 | `DT_1B04005N` 2025.12 JSON 66행과 전국사업체조사 2024 XLSX 66행을 provenance와 함께 적재하고 경계 차이·비공개 값·secret 미노출을 검증했다 |
| DATA-011 | 상권·행정동 주거·직장인구 API·화면 연결 | P0 | Done | Phase 2 | DATA-010 | 서울시 상권 인구와 KOSIS 행정동 배후통계를 공간 단위·출처·기간을 분리하고 오류를 0으로 숨기지 않는다 |

### EPIC-03. 상권 분석 엔진과 FastAPI

Outcome: 같은 입력에는 같은 분석 결과와 근거를 반환하는 API가 동작한다.

| ID           | 세부 Task                                     | Priority | Status  | Week | Depends on                | Acceptance                                            |
| ------------ | --------------------------------------------- | -------- | ------- | ---- | ------------------------- | ----------------------------------------------------- |
| ANALYSIS-001 | 핵심 metric의 계산식·단위·기간 확정           | P0       | Done    | 2    | DATA-003                  | 경쟁·변화·시간대·점수 정의에 source metadata가 붙는다 |
| ANALYSIS-002 | 이동 가능한 중심의 반경별 점포·동일 업종 경쟁 계산 | P0    | Done | Phase 2 | DATA-009, SEARCH-001 | 지원 영역에서 100m/300m/500m 공간 query와 이동·취소 fixture가 일치한다 |
| ANALYSIS-003 | 개업·폐업·영업기간 변화 계산                  | P0       | Backlog | 2    | DATA-004, ANALYSIS-001    | 기간별 집계와 표본 부족 상태를 구분한다               |
| ANALYSIS-004 | 생활인구·매출 시간대 특성 계산                | P0       | Backlog | 2    | DATA-004, ANALYSIS-001    | 시간대 값과 실제/추정/관찰 source type을 반환한다     |
| ANALYSIS-005 | 설명 가능한 입지 점수와 템플릿 리포트         | P0       | Done    | 2    | ANALYSIS-002~004          | SCORE-001에서 총점, 신뢰도, 근거와 제한 API를 구현했다 |
| SCORE-002    | 점수 공식 1.1 누락·fixture·근거 안전성 보완 | P0       | Done | Phase 2 | DB-001, API-002           | 1.1.0 중립 수축·fixture gate·freshness·sample·cluster blocker와 12개 canonical 평가가 통과했다 |
| SCORE-003    | 업종별 profile과 과거 결과 calibration     | P1       | Backlog | Later | SCORE-002, ANALYSIS-002~004 | 최소 5개 분기의 out-of-time 평가로 승인된 profile만 versioning한다 |
| API-001      | SQLite repository와 seed/import 연결          | P0       | Done    | 2    | DATA-004                  | canonical data를 저장하고 반복 조회한다               |
| API-002      | `/api/v1/markets` 분석 endpoint 구현          | P0       | Done | 2 | API-001, ANALYSIS-002~005 | 상권·업종·반경 query가 실제 runtime DB에 연결된다      |
| API-003      | validation·empty·provider error contract 구현 | P0       | Done | 2    | API-002                   | 오류 상태와 근거 부족 상태가 HTTP/test로 구분된다     |
| SEARCH-001   | 소상공인 점포·상권 검색 API와 React 연결      | P0       | Done | Phase 2 | DB-001, WEB-008, DATA-009 A단계 | 실제 Supabase의 이름·주소·업종 검색 결과를 지도·분석 화면에 연결하고 상태·보안 smoke를 통과했다 |
| ANALYSIS-006 | 동일 비교집단 기준 상권·동네별 순위          | P1       | Done | Phase 2 | DATA-011 | 점포·매출·개폐업·유동·주거·직장 지표에 값·순위·분모·상위 비율·기간·비교집단을 함께 반환하고 근거 부족 시 순위를 만들지 않는다 |

### EPIC-04. 지도 중심 분석 Workspace

Outcome: 발표자가 실제 지도에서 주요 분석 기능을 직접 조작하고 결과 변화를 설명할 수 있다.

| ID      | 세부 Task                                 | Priority | Status  | Week | Depends on            | Acceptance                                                 |
| ------- | ----------------------------------------- | -------- | ------- | ---- | --------------------- | ---------------------------------------------------------- |
| APP-001 | 제품 웹과 문서 public route 분리          | P0       | Done    | 3    | -                     | URL route 역할이 분리된다. 물리·배포 분리는 ARCH-002에서 수행한다 |
| WEB-001 | 현재 지도 프로토타입을 API adapter에 연결 | P0       | Done    | 3    | API-002               | API 우선·canonical snapshot fallback으로 실제 집계를 표시한다 |
| WEB-002 | 상권·업종·반경 Filter 동기화              | P0       | Done | 3    | WEB-001               | 선택 변경이 URL/요청/지도/패널에 일관되게 반영된다         |
| WEB-003 | 실제 점포 marker와 경쟁·수요 Layer 구현   | P0       | Done | 3    | WEB-001               | source와 기간이 있는 점포/지표가 지도에 표시된다           |
| WEB-004 | 상권 비교와 입지 리포트 구현              | P0       | Backlog | 3    | WEB-002, ANALYSIS-005 | 최소 2개 상권을 같은 기준으로 비교한다                     |
| WEB-005 | loading·empty·error·stale state 구현      | P0       | Done | 3    | WEB-001               | 실패 시 빈 흰 화면 없이 다음 행동을 안내한다               |
| WEB-006 | keyboard·mobile·contrast 접근성 검증      | P1       | Backlog | 3    | WEB-002~005           | 핵심 조작이 keyboard와 mobile viewport에서 가능하다        |
| WEB-007 | 근거 보기와 데이터 기준 시각화            | P0       | Done    | 3    | WEB-003               | source, period, unit, method를 화면에서 확인한다           |
| WEB-008 | FE 파일 구조 분리와 기능별 state 경계 정리 | P0       | Done | Phase 2 | - | 거대 App을 feature/component/hook/service로 나누고 기존 동작 test를 유지한다 |
| WEB-009 | 선택 업종 coverage와 silent fallback 제거 | P0 | Done | Phase 2 | SEARCH-001 | 세부 업종 원문을 유지하고 full·partial·unavailable 근거 범위 밖의 점수는 표시하지 않는다 |
| WEB-010 | 첫 진입 neutral state와 stale 점포 선택 해제 | P0 | Done | Phase 2 | SEARCH-001, ANALYSIS-002 | 사용자가 고르기 전 점포를 자동 선택하지 않고 반경·기준·중심 변경 시 이전 점포를 제거하며 API 오류를 정적 fallback으로 숨기지 않는다 |
| WEB-011 | 고정 개폐업 그래프 제거와 실제 분기 집계 표시 | P0 | Done | Phase 2 | API-002 | 고정 12개 막대를 제거하고 실제 분기·개업·폐업·순증 값과 시계열 미지원 범위를 명시한다 |
| WEB-012 | 데이터별 기준 시점과 출처를 함께 표시 | P0 | Done | Phase 2 | DATA-011, WEB-007 | 상권·행정동·개별 점포의 source·period·geography를 구분하고 서로 다른 갱신 주기와 기간 선택 미지원 범위를 명시한다 |
| MAP-001 | 연남·홍대·합정 상권 비교군 고정           | P0       | Done    | 3    | -                     | selector와 비교표에 가까운 3개 상권만 표시된다             |
| MAP-002 | LocalTwin 2.5D 지도와 원본 fallback       | P0       | Done    | 3    | MAP-001               | 실제 footprint 기반 전용 지도와 원본 지도를 전환한다       |
| MAP-003 | 상권별 LocalTwin 지도 data와 style 자체 구성 | P0       | Done    | 3    | MAP-002               | 외부 basemap 없이 로컬 도로·건물·POI GeoJSON을 렌더링한다  |
| MAP-004 | 핵심 점포 방향 독립형 3D store marker와 업종 asset system | P1 | In Progress | Phase 2 | ARCH-002, SEARCH-001, WEB-003 | 첫 5개 canonical 업종을 공유 GLB body·SVG atlas·procedural attachment에 연결하고 asset 1회 load, style loading race, marker LOD·cleanup을 검증했다. 복수 점포 건물 묶음과 회전·reduced-motion 성능 검증은 남았다 |
| MAP-005 | 전체 basemap과 지원 지역 LocalTwin 3D Overlay 분리 | P0 | Done | Phase 2 | MAP-003 | 기본 지도는 모든 위치에서 유지되고 연남·홍대·합정의 검증 Overlay만 독립적으로 표시되며 관평동은 planned 상태로 구분된다 |
| MAP-006 | 분석 기준·주제·지도 Layer 정보구조 분리 | P0 | Done | Phase 2 | MAP-005 | 공간 기준·분석 주제·지도 표현을 독립 state로 선택하고 미지원 조합을 명시한다 |
| DESIGN-001 | 업종별 low-poly 점포 prefab 고도화        | P1       | Done    | 3    | MAP-003               | 지붕·창문·간판·차양·화분으로 후보 점포를 구분한다          |

### EPIC-05. 보조 3D 장면 탐색

Outcome: 상권 분석에서 선택한 한 위치의 현장감을 제한된 3D 장면으로 보조 설명할 수 있다.

| ID        | 세부 Task                                   | Priority | Status  | Week | Depends on | Acceptance                                          |
| --------- | ------------------------------------------- | -------- | ------- | ---- | ---------- | --------------------------------------------------- |
| SCENE-001 | 관평동 촬영 위치·범위·privacy Gate 확정     | P1       | Done    | 4    | EPIC-04    | 관평동 한 장소의 10~20m 범위와 공개 기준이 정해진다 |
| SCENE-002 | 사람 영역 익명화 sample pipeline 검증       | P1       | In Progress | 4 | SCENE-001 | upload/job은 구현, 실제 blur/mask/exclude 검증이 남았다 |
| SCENE-003 | 실제 scene 1개 또는 검증된 대체 viewer 연결 | P1       | Done | 4 | SCENE-002 | 공식 storefront PLY와 camera pose를 local viewer에서 검증했다 |
| SCENE-006 | GPU server 공식 sample 학습과 local viewer 검증 | P1 | Done | 4 | SCENE-005 | `storefront` 12999-step PLY, camera pose, desktop/mobile QA 완료 |
| SCENE-004 | 대표 시간대 혼잡도 overlay 연결             | P1       | Backlog | 4    | SCENE-003  | 10시/13시/15시/18시 상태가 근거와 함께 바뀐다       |
| SCENE-005 | Docker GPU worker와 Spark renderer QA       | P1       | Done    | 4    | SCENE-001  | Docker path와 synthetic PLY nonblank canvas를 검증한다 |
| SCENE-007 | 사용자 촬영 입력 end-to-end 변환 검증       | P0       | Backlog | Phase 2 | SEC-002, SEC-004, SCENE-006 | 승인된 360 영상 또는 다중 시점 사진 1건이 익명화·학습·viewer 경로를 통과한다 |

P0가 늦어지면 EPIC-05 범위를 줄이고 상권 분석 완성도를 우선한다.

### EPIC-07. 제품 보안과 Privacy Enforcement

Outcome: 공개 또는 제품 환경에서 Scene·데이터 경로가 기본 차단 원칙, 객체 단위 권한, privacy 승인과 자원 제한을 서버에서 강제한다.

보안 항목의 상세 문제·재현·조치 근거는 [보안 점검 및 조치 체크리스트](../issues/security-hardening-review.md)를 원본으로 사용한다.

| ID      | 세부 Task                                  | Priority | Status  | Week    | Depends on | Acceptance |
| ------- | ------------------------------------------ | -------- | ------- | ------- | ---------- | ---------- |
| SEC-001 | Scene API 제품 기본 차단 후 인증·객체 단위 인가 | P0 | A Verified / B Backlog | Phase 2 | - | A단계에서 제품 route가 기본 비활성화되고, B단계에서 무인증·다른 사용자 job 접근이 차단된다 |
| SEC-002 | 서버 privacy 상태와 asset gate             | P0       | Backlog | Phase 2 | SEC-001    | 승인된 anonymized asset만 다운로드할 수 있다 |
| SEC-003 | upload·GPU quota와 실행 제한               | P0       | Backlog | Phase 2 | SEC-001    | 크기·빈도·동시 실행·retry 제한이 API와 worker에서 검증된다 |
| SEC-004 | media·PLY 내용 기반 검증                   | P0       | Backlog | Phase 2 | -          | 위장 파일과 처리 한도 초과 입력이 GPU 실행 전에 거부된다 |
| SEC-005 | 사용자·관리자 response schema 분리         | P1       | Backlog | Phase 2 | SEC-001    | 공개 응답에 path·command·상세 exception이 없다 |
| SEC-006 | Seoul API key 전송·log 보호                | P1       | Backlog | Phase 2 | -          | HTTPS 또는 승인된 격리 대안과 log redaction이 검증된다 |
| SEC-007 | dependency·container 공급망 hardening      | P1       | Backlog | Phase 2 | SEC-003    | frozen install, image digest와 최소 권한 runtime이 검증된다 |
| SEC-008 | 정적 배포 security header와 화면 회귀      | P1       | Backlog | Phase 2 | -          | 배포 header와 지도·문서·3D smoke test가 함께 통과한다 |

### EPIC-06. 통합 검증과 발표 배포

Outcome: 다른 사람이 설명을 듣지 않아도 데모를 실행하고, 발표자는 주요 기능을 안정적으로 시연할 수 있다.

| ID         | 세부 Task                                  | Priority | Status  | Week | Depends on | Acceptance                                         |
| ---------- | ------------------------------------------ | -------- | ------- | ---- | ---------- | -------------------------------------------------- |
| EVAL-001   | 핵심 분석 평가 fixture와 score script 작성 | P0       | Done    | 4    | EPIC-03    | 12개 canonical case와 정상·경계·실패 test를 재현한다 |
| EVAL-002   | Front-API 통합 smoke test                  | P0       | Done | 4    | EPIC-04    | 주요 시연 경로가 새 환경에서 통과한다              |
| DEMO-001   | 5분 발표 시나리오와 복구 경로 작성         | P0       | Backlog | 4    | EVAL-002   | 발표 순서, 예상 결과와 fallback이 문서화된다       |
| DEPLOY-001 | docs/prototype 배포와 공개 경로 검증       | P0       | Backlog | 4    | EVAL-002, SEC-008 | Home, Tasks, Architecture와 prototype URL이 열린다 |
| DEPLOY-002 | production Supabase 생성·migration·배포 연결 | P0 | Done | 공개 배포 | DB-001, EVAL-002, SEC-008 | 별도 production DB, Render secret, Vercel Web과 공개 FE-BE smoke를 완료했다 |
| DOCS-004   | 실제 구현 결과로 스펙·아키텍처·백로그 마감 | P0       | Done | 4    | EPIC-03~07 | current/canonical 문서 감사, 독립 artifact 검사와 공개 docs 배포 검증을 완료했다 |

### EPIC-08. 전체 코드 책임 경계 리팩터링과 자동 품질 규칙

Outcome: 기존 사용자 동작을 유지하면서 Web·API·Data·Scene의 변경 이유가 분리되고 같은 구조 문제가
새 코드에 다시 들어오면 local check에서 실패한다.

| ID | 세부 Task | Priority | Status | Week | Depends on | Acceptance |
| --- | --- | --- | --- | --- | --- | --- |
| REFACTOR-001 | 전체 코드 리팩터링 Epic 관리 | P0 | In Progress | Phase 2 | WEB-015, DEPLOY-002 | GitHub #63 하위 Task와 최종 release 검증이 모두 완료된다 |
| ARCH-003 | runtime hardcoding·config·fixture 경계 분리 | P0 | Done | Phase 2 | ARCH-004 | 실제 데이터·제품 정책·환경값·fixture의 authoritative source가 분리된다 |
| ARCH-004 | 리팩터링 기준선·구조 규칙 자동 검사 | P0 | Done | Phase 2 | - | AST budget ratchet, runtime literal·FastAPI boundary 검사와 pre-commit/harness 강제를 완료했다 |
| WEB-018 | App orchestration·state·URL·map 책임 분리 | P0 | Ready | Phase 2 | ARCH-003 | App은 page 조립만 담당하고 각 state 흐름을 독립 테스트한다 |
| WEB-019 | MarketFilters·MarketInspector UI 책임 분리 | P1 | Ready | Phase 2 | WEB-018 | 분석 UI section을 독립 렌더링·테스트한다 |
| API-004 | FastAPI router·dependency·Scene gate 분리 | P0 | Ready | Phase 2 | ARCH-004 | app factory는 middleware·exception·router 조립만 수행한다 |
| API-005 | 분석 query·계산·response 조립 분리 | P0 | Ready | Phase 2 | API-004 | repository와 순수 domain 계산을 독립 테스트한다 |
| DATA-013 | importer·spatial pipeline 단계 분리·manifest화 | P1 | Ready | Phase 2 | ARCH-003, API-005 | read·validate·normalize·persist·verify 단계와 실행 입력을 재현한다 |
| SCENE-008 | Scene job UI·polling·pipeline 책임 분리 | P1 | Ready | Phase 2 | API-004 | UI API client와 server job 단계를 분리하고 기존 gate를 유지한다 |
| TEST-001 | 전체 회귀·architecture boundary·release 검증 | P0 | Ready | Phase 2 | ARCH-003~SCENE-008 | full check와 공개 핵심 흐름 smoke가 통과한다 |

## 7. Phase 2 Ready Queue

기능 의존성과 이번 주 구현 가능성을 기준으로 위에서 아래 순서로 진행한다.

현재 전체 리팩터링 실행 순서는 `ARCH-004 -> ARCH-003 -> WEB-018 -> WEB-019 -> API-004 -> API-005 -> DATA-013 -> SCENE-008 -> TEST-001`로 고정한다. 상세 기준은 [리팩터링 및 코드 구조 기준](refactoring-standards.md)을 따른다.

1. `PLAN-002` Phase 1 기준선과 인계 문서·Issue 정합성 확인
2. `SEC-001 A단계` 공개 위험을 먼저 줄이기 위한 Scene API 제품 환경 기본 차단 (Done)
3. `ARCH-002` 실제 서비스 source와 문서의 물리 폴더·배포 artifact 분리 (Done)
4. `WEB-008` FE 파일 구조를 기능별로 분리하고 state 경계를 정리 (Done early)
5. `DB-001` Supabase PostgreSQL schema, SQLAlchemy/Alembic과 검증된 전체 canonical data·업종 이관
6. `DATA-008` 내려받은 분기 상가정보·인허가·상권영역의 bulk importer와 품질 검사
7. `DATA-009 A단계` 3개 상권 polygon과 개별 점포의 공간 결합 (Done, 공식 집계 비교는 계속)
8. `SEARCH-001` 제한된 시연 상권·점포 검색 API와 React의 최소 vertical slice 연결 (Done)
9. `MAP-005` 전체 basemap을 유지하고 연남·홍대·합정의 LocalTwin Overlay만 독립 표시 (Done)
10. `ANALYSIS-002`, `WEB-002`, `WEB-003` 이동 가능한 중심과 100m/300m/500m query·state 동기화
11. `EVAL-002`, `API-003`, `WEB-005` Front-API 실제 smoke와 오류·retry·stale 상태 검증
12. `DATA-010` KOSIS 2025.12 행정동 인구 snapshot과 최신 사업체 종사자 보강
13. `SCORE-002` 점수 공식 1.1 누락·fixture·freshness·집적 보정 안전성 수정
14. `MAP-004` 실제 검색 결과 중 검증된 업종의 핵심 점포만 방향 독립형 3D store marker로 표현
15. `SEC-001 B단계`와 `SEC-002`~`SEC-008` 인증·privacy·resource·정보노출·배포 hardening
16. `SCENE-002`, `SCENE-007` 승인된 사용자 촬영 입력의 익명화·end-to-end 검증
17. `DEPLOY-001`, `DOCS-004` 문서·prototype 배포 검증과 최종 문서 정합성 마감
18. `DEPLOY-002` 공개 제품 승인 시 별도 production Supabase와 API 배포 연결
19. `DATA-007` 운영 수집 범위·요청 시점·갱신 주기·raw 보존 정책 결정 후 자동화 Task 확정
20. `ANALYSIS-003`, `ANALYSIS-004` multi-period 성장·안정성 metric 준비
21. `SCORE-003` multi-period 데이터로 업종별 profile·peer group·band calibration

Scene route의 제품 기본 차단은 즉시 수행하지만, 인증 체계 전체를 이번 주 핵심 서비스 연결보다 먼저 구현하지 않는다. 사용자 촬영 E2E는 privacy와 입력 검증이 완료된 뒤에만 수행한다. 동시에 진행하는 Task는 원칙적으로 1개다.

### 7.1 이번 주 일별 계획

| 일자 | Task | 완료 기준 |
| --- | --- | --- |
| D1 | PLAN-002, SEC-001 A단계 | 현재 구현 기준선이 기록되고 제품 환경에서 Scene route가 기본 차단된다 |
| D2 | ARCH-002 | 제품과 문서가 물리 폴더·배포 artifact 수준에서 분리된다 (Done) |
| D3 | WEB-008 | 기존 화면 동작을 유지한 채 FE 기능·component·state 파일이 분리된다 |
| D4 | DB-001 | Supabase schema와 migration이 적용되고 canonical data의 핵심 row count가 일치한다 |
| D5 | SEARCH-001 | 제한된 시연 데이터에서 검색 → 선택 → 핵심 분석 화면 진입이 실제 API로 동작한다 (Done) |

이번 주 범위에는 서울 전체 검색이 없다. D5는 한정된 시연 상권·점포 dataset의 최소 end-to-end 흐름이며, 반경 분석과 전체 보안 조치는 다음 순서의 별도 Task다.

반경 분석은 현재 스프린트 마감 뒤 `.harness/tasks/ANALYSIS-002-radius-search.md`를 기준으로
진행한다. 최소 100m, 최대 500m, 기본 300m의 고정 선택지를 사용하고, 지도 이동 중에는
원을 계속 표시하되 `이 위치에서 검색`으로 확정할 때만 API를 호출한다.

W3-D1은 `MAP-005 → ANALYSIS-002/WEB-002/WEB-003 → EVAL-002` 순서로 진행한다. 상세 구현 파일·state·Layer contract는 각각 `.harness/tasks/MAP-005-base-map-supported-overlays.md`, `.harness/tasks/ANALYSIS-002-radius-search.md`, `.harness/tasks/EVAL-002-front-api-smoke.md`를 원본으로 사용한다.

## 8. Definition of Ready

- Outcome과 Acceptance가 한 문장으로 설명된다.
- 필요한 데이터와 선행 Task가 확인됐다.
- 관련 기능/데이터 문서가 연결됐다.
- 1~2일 안에 검증 가능한 크기다.
- 실제 시작 시 Task Packet을 만들 수 있다.

## 9. Definition of Done

- Acceptance를 만족한다.
- 관련 test 또는 최소 검증을 통과한다.
- 기능 스펙, 데이터 매핑과 아키텍처 중 영향을 받은 문서를 갱신했다.
- Run Report에 실행 결과와 한계를 남겼다.
- 백로그 상태를 `Done`으로 바꿨다.

상세 품질 항목은 [개발 완료 체크리스트](./checklist.md)를 사용한다.

## 10. GitHub로 옮길 때의 매핑

| 문서 백로그          | GitHub                                           |
| -------------------- | ------------------------------------------------ |
| Epic                 | Parent Issue                                     |
| 세부 Task            | Sub-issue                                        |
| Priority/Status/Week | Project field                                    |
| 4주                  | Iteration 또는 Milestone                         |
| Depends on           | Issue dependency                                 |
| Task Packet          | Issue 본문 또는 repository `.harness/tasks` 링크 |
| Run Report           | PR 설명과 `.harness/runs` 링크                   |

문서가 먼저인 현재 단계에서는 `tasks.md`가 원본이다. GitHub Project를 실제 운영하기 시작하면 한 방향으로만 동기화하고, 두 곳에서 우선순위를 따로 수정하지 않는다.

## 11. 참고한 관리 원칙

- [Scrum Guide](https://scrumguides.org/scrum-guide.html): Product Backlog는 제품 개선에 필요한 작업의 단일하고 정렬된 목록이며, refinement로 더 작고 구체적인 항목이 된다.
- [GitHub Sub-issues](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/browsing-sub-issues): 큰 작업을 Parent Issue와 여러 단계의 Sub-issue로 나눌 수 있다.
- [GitHub Parent/Sub-issue fields](https://docs.github.com/en/issues/planning-and-tracking-with-projects/understanding-fields/about-parent-issue-and-sub-issue-progress-fields): Project에서 parent 관계와 sub-issue 진행률을 함께 볼 수 있다.

## 12. 변경 기록

| 날짜       | 변경                           | 이유                                                                      |
| ---------- | ------------------------------ | ------------------------------------------------------------------------- |
| 2026-07-10 | 4주 Epic/Task 백로그 최초 작성 | 체크리스트와 실행 계획에 흩어진 다음 작업을 하나의 원본으로 통합하기 위해 |
| 2026-07-11 | SCENE-002~004 구현·검증 경계 반영 | upload/viewer 코드 완료와 실제 GPU 학습 미완료를 구분하기 위해 |
| 2026-07-11 | API-002와 WEB-001/007 실데이터 연결 반영 | 상권 경계 분석 완료와 반경 query 미완료를 구분하기 위해 |
| 2026-07-11 | EVAL-001 결과 반영 | 재현성 gate 통과와 confidence 부족을 함께 추적하기 위해 |
| 2026-07-11 | SCENE-005 worker와 renderer QA 반영 | 실제 학습 blocker와 web renderer 검증을 분리하기 위해 |
| 2026-07-13 | Phase 1 종료와 Phase 2 인계 상태 반영 | 공식 sample 검증과 사용자 촬영·privacy·통합·보안 미완료를 구분하기 위해 |
| 2026-07-13 | EPIC-07과 SEC-001~008 추가 | 보안 점검을 실행 가능한 Task와 Task Packet 단위로 관리하기 위해 |
| 2026-07-13 | ARCH-002·WEB-008·DB-001·SEARCH-001과 의존 순서 추가 | 서비스 경계부터 최소 검색 연결까지 이번 주에 가능한 vertical slice로 복원하기 위해 |
| 2026-07-15 | DATA-009 A단계와 SEARCH-001 완료 상태 반영 | 3개 상권 공간 결합과 실제 Supabase 검색·React 선택 흐름의 검증 결과를 기록하기 위해 |
| 2026-07-13 | SEC-001 A단계와 WEB-008 조기 완료 | 공개 Scene route를 기본 차단하고 FE server/UI state 경계를 후속 DB·검색 연결 전에 고정하기 위해 |
| 2026-07-14 | DB-001 전체 canonical seed와 DATA-007 추가 | DB에는 전체 검증 데이터를 보존하고 4개 업종은 현재 UI 지원 범위로만 두며 운영 요청 시점은 후속 결정하기 위해 |
| 2026-07-14 | ARCH-002 완료 | 실행 source를 `product/`로 이동하고 제품·문서 artifact를 독립 build·검사하도록 분리하기 위해 |
| 2026-07-14 | MAP-004 상세 3D storefront 계획 추가 | 일반 건물은 가볍게 유지하고 실제 검색의 핵심 점포만 확장 가능한 업종 asset system으로 표현하기 위해 |
| 2026-07-14 | SCORE-002·003 공식 보완 계획 추가 | 명확한 논리 오류를 먼저 수정하고 업종별 weight는 과거 결과 검증 뒤에만 채택하기 위해 |
| 2026-07-15 | MAP-004 업종 근거와 방향 독립 marker 결정 | 점포명 기반 오분류와 근거 없는 facade 추정을 막고 어느 지도 회전에서도 업종을 읽게 하기 위해 |
| 2026-07-15 | DB-001 local implementation 완료 | SQLAlchemy/Alembic schema와 전체 canonical 2회 seed를 검증하고 실제 Supabase 적용 전 상태를 구분하기 위해 |
| 2026-07-15 | DB-001 Supabase G6 검증 완료 | 실제 Supabase에 migration과 전체 canonical seed 2회를 적용하고 count·대표 query·idempotency를 확인하기 위해 |
| 2026-07-15 | DEPLOY-002 production Supabase 분리 Task 추가 | 현재 project를 개발·검증용으로 유지하고 공개 운영 credential·data를 격리하기 위해 |
| 2026-07-15 | DB-001 구현·검증·GitHub 게시 완료 | 5개 범위별 commit을 develop에 push하고 실제 Supabase 검증 결과로 #11을 종료했기 때문에 |
| 2026-07-15 | DATA-008·009 bulk 위치·밀집 계획 추가 | 20개 위치 sample을 공식 분기 파일 전체와 상권 polygon 공간 결합으로 확장하고 카카오·네이버 API를 제외하기 위해 |
| 2026-07-15 | DOCS-004 전체 current 문서 감사 시작 | 구현 전 문구, 과거 row count와 완료·미완료 경계를 실제 코드와 검증 결과에 맞추기 위해 |
| 2026-07-15 | DOCS-004 문서 정합성과 공개 배포 완료 | 링크·HTML·Viewer·Task·artifact 검사를 통과하고 production alias에서 최신 Markdown을 확인했기 때문에 |
| 2026-07-16 | W3-D1 지도·반경·통합 smoke 코드수준 계획 확정 | basemap/Overlay 경계를 먼저 고정하고 nearby API와 state 동기화 뒤 실제 오류 회귀를 수행하기 위해 |
| 2026-07-16 | DATA-010 코드수준 계획과 KOSIS contract 확정 | 수집·snapshot·변환·migration·idempotent import를 분리하고 기존 SQLite seed 회귀 없이 구현하기 위해 |
| 2026-07-16 | DATA-010 인구·사업체 배경 통계 적재 완료 | 실제 KOSIS JSON과 공식 온라인간행물 XLSX를 development Supabase에 2회 적재하고 provenance·비공개 값·FK를 검증했기 때문에 |
| 2026-07-16 | SCORE-002 점수 공식 1.1 안전성 보완 완료 | 누락 지표 중립 수축, fixture 차단, freshness·sample·peer·cluster blocker를 구현하고 12개 canonical 평가를 통과했기 때문에 |
| 2026-07-16 | MAP-004 꽃집 vertical slice와 선택 상권 경계 구현 | canonical 꽃집 검색 결과만 상세 3D marker로 표시하고 일반 점포·건물 중복을 줄이며 선택 polygon을 노란 경계로 확인하기 위해 |
| 2026-07-16 | MAP-004 첫 5개 업종 marker와 LOD 확대 | canonical 업종 코드로 방향 독립 장식을 선택하고 겹치는 marker를 제거하며 desktop 12개·mobile 6개 상한을 보장하기 위해 |
| 2026-07-16 | API-002 상권 분석 runtime PostgreSQL 전환 | 배포 artifact에 없는 canonical SQLite 파일 대신 검색·반경 API와 같은 SQLAlchemy session을 사용하고 SQLite는 import·회귀 기준으로만 유지하기 위해 |
| 2026-07-16 | MAP-004 공유 GLB body와 category atlas cache | 선택 전환마다 asset을 다시 받지 않고 3D 실패 시 procedural marker를 유지하며 선택 중심 UI가 점포를 가리지 않게 하기 위해 |
