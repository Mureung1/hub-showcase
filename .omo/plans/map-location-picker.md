# 지도 기반 위치 지정

## TL;DR
> **Summary**: 공동구매 개설자와 참여자가 현재 위치, 지도 클릭, 상세주소 입력으로 위치를 지정하고 좌표와 주소를 Supabase에 저장한다.
> **Deliverables**: 공통 위치 선택기, Leaflet 지도, 개설자 좌표 스키마, 참여/개설 연결, 테스트 및 브라우저 QA
> **Effort**: Medium
> **Parallel**: NO
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 4 → Task 5

## Context
### Original Request
- 현재 위치 사용 버튼, 지도 핀 지정, 상세주소 입력을 제공한다.

### Interview Summary
- Leaflet + OpenStreetMap을 사용한다.
- 역지오코딩은 제외하며 지도/현재 위치는 좌표를 정하고 상세주소는 사용자가 확인·수정한다.
- 저장 완료된 위치만 새로고침 후 유지한다. 작성 중 임시 초안 복원은 제외한다.

### Metis Review (gaps addressed)
- 주소는 2~80자로 유지하고 좌표만으로 제출할 수 없게 한다.
- 개설자 좌표용 DB 컬럼과 API/Repository 연결을 명시한다.
- 개설자 좌표는 후보 계산에 포함하되 외부 응답으로 직접 노출하지 않는다.
- 최종 수령지 좌표 저장, 경로 탐색, 역지오코딩은 제외한다.
- 지도 타일 실패 시에도 주소 직접 입력과 제출은 가능해야 한다.

## Work Objectives
### Core Objective
현재 위치·지도 클릭·상세주소 중 원하는 방식으로 출발 위치를 정하고, 저장된 주소와 좌표를 기존 공동 수령지 후보 계산에 사용한다.

### Deliverables
- `LocationPicker` 공통 React 컴포넌트
- Leaflet 및 OpenStreetMap 타일/저작권 표시
- `group_buys.pickup_latitude`, `pickup_longitude` 마이그레이션
- 개설/수정/참여 요청의 좌표 저장 및 조회
- 위치 권한 거절과 지도 실패의 대체 UX

### Definition of Done
- `npm test`, `npm run lint`, `npm run build`가 통과한다.
- 지도 클릭과 현재 위치 선택이 `{address, latitude, longitude}`를 만든다.
- 주소만 입력한 경우 null 좌표로 정상 저장된다.
- 개설자 좌표가 참여자 좌표와 함께 후보 계산에 사용된다.

### Must Have
- 주소는 항상 2~80자.
- 좌표는 둘 다 null이거나 둘 다 유효 숫자.
- 현재 위치 권한 거절 시 상세주소 입력은 계속 가능.
- OSM attribution 표시.

### Must NOT Have
- 역지오코딩, 주소 자동완성, 경로 탐색, 이동시간 계산.
- 공개 API 응답에서 참여자 또는 개설자의 원시 좌표 노출.
- 최종 투표 결과 좌표 저장.

## Verification Strategy
- Test decision: TDD + 기존 `node:test`
- QA policy: 모든 작업 후 실제 로컬 브라우저에서 지도 클릭·권한 거절 대체 흐름 검증
- Evidence: 콘솔 테스트 결과와 브라우저 DOM 상태

## Execution Strategy
### Parallel Execution Waves
Wave 1: 데이터 계약 및 마이그레이션
Wave 2: 공통 지도 컴포넌트
Wave 3: 개설/참여 화면 연결
Wave 4: 후보 계산과 전체 QA

### Dependency Matrix
- Task 1 blocks Tasks 3, 4
- Task 2 blocks Task 3
- Tasks 3, 4 block Task 5

## TODOs

- [x] 1. 위치 데이터 계약과 Supabase 스키마 확장

  **What to do**: `group_buys`에 nullable `pickup_latitude`, `pickup_longitude`를 추가하고 완전한 좌표 쌍 제약을 둔다. `server/demo.js`의 create/update schema와 `server/group-buy-repository.js`의 row/DTO/patch 매핑에 두 필드를 추가한다.
  **Must NOT do**: 참여자 좌표나 최종 수령지 좌표 스키마를 중복 생성하지 않는다.
  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 3, 4 | Blocked By: none
  **References**:
  - Pattern: `supabase/migrations/202607290001_flexible_participant_locations.sql` - 좌표 범위와 쌍 제약
  - Pattern: `server/group-buy-repository.js:19` - DB row/DTO 매핑
  - API: `server/demo.js:24` - 생성/수정 검증
  **Acceptance Criteria**:
  - [ ] null/null 및 유효 좌표 쌍은 통과하고 한쪽만 있는 좌표는 거절된다.
  - [ ] 저장 후 Repository 조회 결과에 owner pickup 좌표가 유지된다.
  **QA Scenarios**:
  ```
  Scenario: 유효 좌표 저장
    Tool: node:test
    Steps: pickupLatitude 37.5665, pickupLongitude 126.9780을 row 변환 후 역변환
    Expected: 두 값이 동일하게 유지됨

  Scenario: 불완전 좌표
    Tool: node:test
    Steps: latitude만 입력
    Expected: 검증 실패
  ```
  **Commit**: NO

- [x] 2. Leaflet 기반 공통 LocationPicker 구현

  **What to do**: `leaflet`을 설치하고 CSS를 불러온다. controlled props `{address, latitude, longitude, onChange}`를 받는 컴포넌트를 만든다. 현재 위치 버튼, 지도 클릭/드래그 마커, 상세주소 입력, 선택 좌표 요약을 제공한다. 기본 중심은 서울시청 `37.5665, 126.9780`, zoom 15로 한다.
  **Must NOT do**: 외부 주소 API 호출이나 역지오코딩을 추가하지 않는다.
  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 3 | Blocked By: none
  **References**:
  - External: `https://github.com/leaflet/leaflet/blob/main/docs/examples/quick-start/index.md`
  - Pattern: `src/pages/GroupBuyDetailPage.jsx:29` - 현재 위치 권한 처리
  - Style: `src/App.css:107` - 기존 위치 버튼
  **Acceptance Criteria**:
  - [ ] 지도 클릭 시 마커와 좌표가 갱신된다.
  - [ ] 현재 위치 성공 시 해당 좌표로 지도와 마커가 이동한다.
  - [ ] 권한 거절/미지원 시 오류 문구를 보여주고 주소 입력은 활성 상태다.
  - [ ] 지도 제거 시 Leaflet 인스턴스가 cleanup된다.
  **QA Scenarios**:
  ```
  Scenario: 지도 핀 지정
    Tool: in-app browser
    Steps: 지도 한 지점 클릭 후 상세주소 "중앙도서관 북문" 입력
    Expected: 마커, 좌표, 주소가 함께 표시됨

  Scenario: 위치 권한 거절
    Tool: in-app browser
    Steps: 현재 위치 사용 후 권한 거절
    Expected: 안내 표시, 수동 주소/지도 기능 유지
  ```
  **Commit**: NO

- [ ] 3. 개설·수정·참여 화면에 공통 선택기 연결

  **What to do**: `GroupBuyEditor`의 단일 pickup input과 `GroupBuyDetailPage`의 현재 위치 로직을 공통 선택기로 교체한다. 개설 요청은 `pickupLocation`, `pickupLatitude`, `pickupLongitude`; 참여 요청은 기존 `startLocation`, `latitude`, `longitude`로 직렬화한다. 편집 시 저장 좌표를 초기값으로 복원한다.
  **Must NOT do**: 좌표만 있고 주소가 비어 있는 제출을 허용하지 않는다.
  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 5 | Blocked By: 1, 2
  **References**:
  - `src/components/GroupBuyEditor.jsx:114` - 저장 payload
  - `src/pages/GroupBuyDetailPage.jsx:23` - 참여 payload
  - `src/services/groupBuysApi.js:24` - API 전달
  **Acceptance Criteria**:
  - [ ] 주소 2자 미만이면 개설/참여 버튼이 비활성화된다.
  - [ ] 주소만 입력해도 제출 가능하며 좌표는 null/null이다.
  - [ ] 저장 좌표가 편집 화면과 참여 완료 후 재조회에서 유지된다.
  **QA Scenarios**:
  ```
  Scenario: 개설자 지도 위치 저장
    Tool: in-app browser
    Steps: 지도 클릭, 주소 입력, 공동구매 생성, 상세 재조회
    Expected: 주소가 표시되고 서버 데이터에 좌표 쌍 존재

  Scenario: 주소만 참여
    Tool: in-app browser
    Steps: 지도 미사용, 상세주소 입력 후 참여
    Expected: 참여 성공, 좌표 null/null
  ```
  **Commit**: NO

- [ ] 4. 개설자 좌표를 후보 계산에 포함

  **What to do**: `pickupLocationsFor`가 개설자의 저장 좌표를 사용하도록 변경한다. 원시 좌표는 presenter에서 계속 숨긴다. 동일 주소 중복은 기존 텍스트 중복 제거 규칙을 유지한다.
  **Must NOT do**: 직선거리 기반 기존 순위를 경로/시간 계산으로 바꾸지 않는다.
  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 5 | Blocked By: 1
  **References**:
  - `server/demo.js:38` - 개설자 + 참여자 후보 입력
  - `server/location-candidates.js:15` - 후보 계산
  - `server/group-buy-presenter.js:8` - 공개 응답 필터
  **Acceptance Criteria**:
  - [ ] 개설자와 참여자 좌표가 모두 있는 경우 개설자 위치도 거리 계산 대상이다.
  - [ ] 비참여자 응답에 원시 좌표가 포함되지 않는다.
  **QA Scenarios**:
  ```
  Scenario: 개설자 포함 후보 순위
    Tool: node:test
    Steps: 개설자 1명과 참여자 2명의 서로 다른 좌표 입력
    Expected: 세 위치를 기준으로 후보 3개 생성

  Scenario: 좌표 비공개
    Tool: node:test
    Steps: 공개 presenter 실행
    Expected: latitude/longitude 필드 없음
  ```
  **Commit**: NO

- [ ] 5. 전체 검증과 DB 적용 안내

  **What to do**: 테스트·린트·빌드 실행 후 실제 브라우저에서 개설과 참여를 검증한다. 새 migration SQL을 사용자의 Supabase에 적용해야 하는 지점을 명확히 안내한다. OSM 타일 실패 상황에서도 수동 입력을 확인한다.
  **Must NOT do**: 사용자 허락 없이 커밋, 푸시, PR을 생성하지 않는다.
  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: none | Blocked By: 3, 4
  **References**:
  - `package.json` - 검증 명령
  - `server/group-buy-repository.integration.test.js` - Supabase 왕복 패턴
  **Acceptance Criteria**:
  - [ ] 전체 테스트, lint, build 통과.
  - [ ] migration 적용 후 저장/조회 실제 왕복 성공.
  - [ ] 현재 위치·지도·주소만 입력의 세 경로가 모두 동작.
  **QA Scenarios**:
  ```
  Scenario: 전체 수직 흐름
    Tool: in-app browser + Supabase
    Steps: 현재 위치 또는 지도 핀 선택, 주소 입력, 생성/참여, 새로고침
    Expected: 주소와 좌표 유지, 후보 계산 반영

  Scenario: 지도 타일 실패
    Tool: in-app browser
    Steps: 타일 요청 실패 상태에서 주소만 입력
    Expected: 제출 가능
  ```
  **Commit**: NO

## Final Verification Wave
- [ ] F1. 요구사항과 실제 diff 일치 확인
- [ ] F2. 좌표/주소 개인정보 노출 여부 확인
- [ ] F3. 실제 브라우저에서 현재 위치·지도 클릭·상세주소 흐름 확인
- [ ] F4. Supabase 저장 후 새로고침 재조회 확인

## Commit Strategy
- 사용자가 허락하기 전 커밋·푸시·PR을 생성하지 않는다.

## Success Criteria
- 사용자가 현재 위치 버튼 또는 지도 클릭으로 핀을 지정할 수 있다.
- 상세주소를 직접 작성하거나 수정할 수 있다.
- 개설과 참여 모두 동일한 UX를 사용한다.
- 저장 실패 없이 주소와 좌표가 DB까지 왕복한다.
