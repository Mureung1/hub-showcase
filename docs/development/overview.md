# LocalTwin v0.1 전체 개발문서

## 1. 제품 정의

LocalTwin은 공공데이터 기반 상권 분석을 주기능으로 제공하고, 보조/추가기능으로 한 가게 앞 또는 한 거리 10~20m 구간의 혼잡도 3D 기반 탐색을 제공하는 실제 웹 기반 상권 디지털 트윈 제품이다. Phase 2의 ARCH-002에서 실행 코드와 제품 배포 설정을 `product/`로 이동했고, `docs/`와 legacy prototype은 제품 artifact와 별도로 관리한다.

서비스의 중심은 3D 복원이 아니라 상권 분석이다. 3D 기반 탐색은 사용자가 선택한 상권의 일부 현장을 더 직관적으로 이해하도록 돕는 보조 기능으로 둔다.

## 2. v0.1 목표

```text
특정 상권 1곳을 기준으로 상권 데이터, 입지 점수, toggle 가능한 인구 Layer와 사람 눈높이의 3DGS 현장 상세보기를 연결한다.
```

v0.1에서는 지역을 서울로 고정하지 않는다. 실제 구현 시 데이터 확보가 쉬운 특정 상권 1곳을 선택한다.

## 3. 기능 구성

| 구분 | 기능 | 우선순위 | 문서 |
| --- | --- | --- | --- |
| 주기능 | 공공데이터 기반 상권 분석 | P0 | [market-analysis.md](../features/market-analysis.md) |
| 주기능 표현 | 2.5D 상권 지도와 핵심 3D Store Marker | P0 | [market-map-experience.md](../features/market-map-experience.md) |
| 보조/추가기능 | Gaussian Splatting 현장 상세보기 | P1 | [3d-congestion-explorer.md](../features/3d-congestion-explorer.md) |
| 보조/추가기능 | 사람 영역 익명화 전처리 | P1 | [person-anonymization-preprocessing.md](../features/person-anonymization-preprocessing.md) |

개발 순서와 현재 상태는 [4주 개발 백로그](./tasks.md), Front/Back/Data 연결은 [시스템 아키텍처](./architecture.md)를 원본으로 사용한다.

## 4. 사용자 흐름

```text
1. 사용자가 분석 대상 상권을 선택한다.
2. 지도 대시보드에서 주변 점포, 업종 분포, 경쟁 강도, 개폐업 흐름과 선택한 인구 Layer를 확인한다.
3. 입지 분석 카드에서 수요, 경쟁, 변화, 공간, 시간대 점수를 확인한다.
4. 선택한 위치의 현장 상세보기를 열어 사람 눈높이의 3DGS 장면을 탐색한다.
5. 10시 / 13시 / 15시 / 18시 시간대별 혼잡도를 추상적 사람 오브젝트와 정보 panel로 확인한다.
```

## 5. 데이터 흐름

```text
공공데이터 수집
→ 주소/좌표/업종 정규화
→ 상권 기준 집계
→ 입지 점수 계산
→ 대시보드/API 제공
```

```text
3D 복원용 촬영
→ 프레임 추출
→ 사람 영역 bbox 탐지
→ 별도 전처리 프로그램에서 blur/mask/프레임 제외
→ 정제 이미지 기반 Gaussian Splatting 생성
→ 사람 눈높이의 웹 3DGS viewer 제공
```

```text
시간대별 촬영
→ 10시 / 13시 / 15시 / 18시 대표 시간대 관찰
→ 수동 또는 경량 모델 기반 사람 수/혼잡도 추정
→ 지도 Layer와 현장 상세보기에 서로 다른 방식으로 집계값 표시
```

## 6. 시스템 구조

```text
React + MapLibre
-> FastAPI /api/v1
-> 분석 Service
-> canonical SQLite (import·verification source)
-> Supabase PostgreSQL (product runtime)
```

공식 API는 별도 수집기가 raw snapshot과 manifest로 저장하고, 정규화·품질 검사를 거쳐 canonical SQLite에 적재한다. Phase 2에서는 이 기준 데이터를 Alembic schema가 적용된 Supabase PostgreSQL로 이관한다. 브라우저는 provider 인증키나 Supabase service role key를 직접 사용하지 않는다. 현재 구현과 목표의 차이는 [시스템 아키텍처](./architecture.md)에서 확인한다.

## 7. 4주 개발 순서

| 주차 | 중심 작업 |
| --- | --- |
| 1주차 | 공식 데이터, canonical schema, 아키텍처와 Task 정리 |
| 2주차 | 배포 경계·FE 구조 정리, Supabase PostgreSQL 이관, 최소 검색 API와 React 연결 |
| 3주차 | 실제 API를 사용하는 지도 Workspace와 리포트 |
| 4주차 | P1 3D 보조 장면, 통합 평가, 발표와 배포 |

세부 Task, 선행 관계와 완료 기준은 [4주 개발 백로그](./tasks.md)에서만 관리한다.

## 8. v0.1 제외 범위

```text
도시 전체 3D 복원
여러 상권 동시 3D 복원
전국 서비스
AR
실시간 CCTV 분석
실시간 영상 스트리밍
정확한 Mesh/Texture Atlas 직접 구현
Occlusion 고급 복원
자동 창업 성공 예측
모든 시간대 영상을 3D 학습에 혼합
```

## 9. 완료 기준

```text
특정 상권 1곳을 선정했다.
카페 또는 음식점 1개 업종 기준 분석이 가능하다.
지도에서 반경 내 점포와 동일 업종 경쟁 강도를 볼 수 있다.
개업/폐업 흐름과 유동인구 또는 생활인구 시간대 그래프를 볼 수 있다.
한 가게 앞 또는 거리 10~20m의 3DGS 장면을 사람 눈높이에서 탐색할 수 있다.
3D 장면에 가게 마커가 있고, 클릭 시 상권 정보 카드가 열린다.
10시 / 13시 / 15시 / 18시 관찰 데이터가 지도 Layer와 현장 상세보기에 표시된다.
사람 영역 익명화 전처리 정책이 문서화되어 있다.
규칙 기반 입지 점수와 AI 해석 리포트를 생성할 수 있다.
```

## 10. 관련 문서

- [제품 기획서](../wiki/localtwin-product-plan.md)
- [Wiki Home](../wiki/Home.md)
- [4주 개발 백로그](./tasks.md)
- [시스템 아키텍처](./architecture.md)
- [문서 관리 기준](./document-management.md)
- [개발환경](./environment.md)
- [개발 컨벤션](./conventions.md)
- [개발 전 결정 Gate](./pre-development-decisions.md)
- [개발 체크리스트](./checklist.md)
- [Git 작업 규칙](./git-workflow.md)
- [LocalTwin Dev Harness](./harness.md)
- [검증 가이드](./validation.md)
- [LocalTwin 디자인 시스템](../design/design-system.md)
- [데이터베이스 구조와 ERD](../data/database-structure.md)
- [데이터 소스 매핑](../data/data-source-mapping.md)
- [v0.1 구현 범위 고정 명세](../module-notes/localtwin-v0.1-scope.md)
- [공공데이터 기반 상권 분석 스펙](../features/market-analysis.md)
- [상권 지도, 2.5D 건물과 핵심 3D Store Marker 스펙](../features/market-map-experience.md)
- [Gaussian Splatting 현장 상세보기 스펙](../features/3d-congestion-explorer.md)
- [사람 영역 익명화 전처리 스펙](../features/person-anonymization-preprocessing.md)
