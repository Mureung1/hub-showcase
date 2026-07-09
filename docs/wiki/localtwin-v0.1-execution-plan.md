# LocalTwin v0.1 전체 실행 계획

이 문서는 GitHub Wiki에 올리기 위한 LocalTwin v0.1 실행 계획이다.

대상 저장소:

```text
https://github.com/HyunKN/hub
```

개발 브랜치:

```text
develop
```

## 1. 프로젝트 방향

LocalTwin의 주기능은 공공데이터 기반 상권 분석이다.

혼잡도 3D 기반 탐색은 주기능이 아니라, 상권 분석 결과를 현실 공간 위에서 보조적으로 이해하게 해주는 추가 기능이다.

```text
주기능:
공공데이터 기반 상권 분석

보조기능:
혼잡도 3D 기반 탐색
사람 영역 익명화 전처리
```

확정된 구현 방향:

```text
Frontend: React
Backend: FastAPI
Map: MapLibre GL JS PoC -> 데이터 부족 시 2D fallback
DB/공간계산: SQLite + Haversine + point-in-polygon
Data: API-first 조사 -> canonical schema -> 동일 schema mock fixture -> 구현
Category: 카페 + 음식점 동시
Report: Template report -> 범용 LLM adapter
Test: 기능 구현과 테스트는 같은 커밋
```

## 2. 지역 및 데이터 전략

지역은 아직 최종 확정하지 않는다. 먼저 공공데이터 제공 범위를 조사한다.

서울 후보:

```text
홍대
신촌
```

대전 후보:

```text
공공데이터 제공 범위를 먼저 확인
데이터가 적합하면 3D 데모는 유성구의 촬영 가능한 한 동네를 별도 선정
```

상권 분석 대상과 3D 촬영 대상은 반드시 같을 필요 없다.

```text
상권 분석:
공공데이터 품질이 좋은 지역

3D 데모:
직접 촬영 가능하고 개인정보 위험이 낮은 장소
```

## 3. 문서 환경

문서 구조는 다음처럼 고정한다.

```text
README.md
docs/wiki/
docs/development/
docs/features/
docs/data/
docs/evaluation/
docs/module-notes/
```

각 역할:

| 경로 | 역할 |
| --- | --- |
| `README.md` | 모든 문서로 접근하는 최상위 허브 |
| `docs/wiki/` | GitHub Wiki로 옮길 제품/실행 계획 문서 |
| `docs/development/` | 전체 개발문서, 체크리스트, Git/CI/검증 운영 문서 |
| `docs/features/` | 기능별 스펙 문서 |
| `docs/data/` | 공공데이터 조사, raw-to-canonical 매핑표, 샘플 응답 |
| `docs/evaluation/` | 에이전트 평가 기준, 평가 결과, meta-evaluation 문서 |
| `docs/module-notes/` | 방향 결정과 범위 고정 메모 |

새 기능을 만들 때 필요한 문서:

```text
1. docs/features/<feature>.md 작성 또는 갱신
2. docs/development/checklist.md 갱신
3. 데이터/API 변경 시 docs/data/data-source-mapping.md 갱신
4. README.md 링크 갱신
```

README는 문서 허브 역할을 유지해야 한다. 새 주요 문서가 생기면 README에서 접근 가능해야 한다.

## 4. Sprint 0: 공공데이터 API 조사

목표:

```text
API-first로 실제 데이터 구조를 확인하고 canonical schema를 설계한다.
```

먼저 `data.go.kr`에서 공공데이터 API 활용신청을 진행한다.

환경변수:

```text
PUBLIC_DATA_SERVICE_KEY
```

조사 대상:

| 데이터 | 목적 |
| --- | --- |
| 소상공인시장진흥공단 상가(상권)정보 API | 현재 점포, 업종, 좌표, 경쟁 밀도 |
| 상가(상권)정보 파일데이터 | API fallback 및 schema 확인 |
| 행정안전부 식품 휴게음식점 | 카페/휴게음식점 인허가 흐름 |
| 전국일반음식점표준데이터 | 음식점 인허가 흐름 |
| 대전 서구 상권별 시간대별 유동인구 | 대전 상권 단위 유동 후보 |
| 대전 서구 행정동별 시간대별 유동인구 | 대전 행정동 단위 유동 후보 |

산출물:

```text
docs/data/data-source-mapping.md
```

해당 문서에는 다음을 기록한다.

```text
API명
제공 지역 범위
raw field
canonical field
샘플 응답
좌표계
결측/제약
사용 여부
fallback 가능 여부
```

API가 키, 쿼터, 응답 구조 문제로 막힐 경우 공식 CSV/file fallback을 허용한다. 단, 내부 canonical schema는 유지한다.

## 5. Sprint 1: Canonical Schema와 Mock Fixture

mock fixture는 화면 편의용 임의 구조로 만들지 않는다.

순서:

```text
1. API 응답 구조 확인
2. raw field 분석
3. canonical schema 확정
4. 같은 schema로 mock fixture 작성
5. API/UI는 canonical schema만 사용
```

기본 canonical model:

```text
Market
Store
PermitBusiness
FlowObservation
LocationScore
Report
```

예상 역할:

| 모델 | 역할 |
| --- | --- |
| `Market` | 분석 대상 상권 |
| `Store` | 현재 점포, 업종, 좌표 |
| `PermitBusiness` | 인허가, 영업상태, 개폐업 흐름 |
| `FlowObservation` | 시간대별 유동/관찰값 |
| `LocationScore` | 항목별 입지 점수와 근거 |
| `Report` | template 기반 상권 해석 |

## 6. Sprint 2: FastAPI MVP

목표:

```text
상권 분석 데이터를 API로 조회하고, 반경/업종 기준 분석 결과를 반환한다.
```

필수 endpoint:

```text
GET /health
GET /markets
GET /markets/{market_id}/stores?category=&radius=
GET /markets/{market_id}/summary?category=&radius=
GET /markets/{market_id}/observations
GET /markets/{market_id}/score?category=&radius=
GET /markets/{market_id}/report?category=&radius=
```

초기 category:

```text
카페
음식점
전체
```

초기 radius:

```text
100m
300m
500m
```

공간 계산:

```text
SQLite에 위도/경도 저장
API 레이어에서 Haversine으로 반경 필터링
```

## 7. Sprint 3: React Dashboard MVP

목표:

```text
상권 분석 결과를 지도와 카드 중심의 대시보드로 보여준다.
```

필수 UI:

```text
상권 선택
업종 필터
반경 선택
2.5D 상권 지도 PoC
건물 footprint extrusion
점포 마커
유동인구 Layer toggle
10시 / 13시 / 15시 / 18시 전환
상권 요약 카드
동일 업종 경쟁 강도 카드
개업/폐업 흐름 카드
시간대별 유동 그래프
입지 점수 카드
template 상권 해석 리포트
```

첫 화면은 소개 페이지가 아니라 실제 상권 분석 대시보드로 한다.

문서 홈은 `docs/wiki/Home.md`를 기준으로 관리하고, 인터랙티브 탐색은 `docs/wiki/knowledge-graph.html`에서 제공한다.

## 8. Sprint 4: 보조 기능 준비

3D 기능은 상권 분석 MVP 완료 후 진행한다.

3D 데모의 원칙:

```text
상권 분석 대상과 3D 촬영 대상은 분리 가능
도시 전체 3D 복원은 하지 않음
한 가게 앞 또는 거리 10~20m만 촬영
Gaussian Splatting으로 정적 배경 공간 복원
사람 눈높이의 현장 상세보기 제공
집계값 기반의 추상적 사람 오브젝트 표시
원본 영상은 서비스 화면에 노출하지 않음
```

보조 API 후보:

```text
GET /scenes/{scene_id}
GET /scenes/{scene_id}/markers
```

사람 영역 익명화:

```text
person bbox detection
-> blur / mask / exclude
-> cleaned frames
-> Gaussian Splatting 생성 입력
```

이 기능은 MoE가 아니다.

정의:

```text
lightweight person detection + preprocessing anonymization pipeline
```

## 9. 검증 및 자동화 환경

로컬 검증 엔트리포인트:

```text
scripts/check.ps1
```

포함 항목:

```text
docs link check
API tests
web build
hook sanity
agent evaluation
meta-evaluation
```

Git hooks:

```text
pre-commit:
큰 커밋 차단
여러 영역 동시 변경 차단
README 문서 링크 누락 차단

commit-msg:
type(scope): summary 강제
why: 섹션 강제
verify: 섹션 강제
```

CI job:

```text
docs
api
web
workflow
agent-eval
```

테스트 원칙:

```text
한 기능 구현 커밋에는 해당 기능 테스트 또는 smoke check 포함
버그 수정 커밋에는 재현 케이스 또는 회귀 검증 포함
문서 변경 커밋에는 링크 검증 또는 문서 구조 검증 포함
```

## 10. 에이전트 평가 시스템

목적:

```text
에이전트가 프로젝트 규칙을 지키며 작은 단위로 구현했는지 평가한다.
```

평가 문서:

```text
docs/evaluation/agent-rubric.md
docs/evaluation/agent-evaluation-protocol.md
docs/evaluation/evaluation-log.md
docs/evaluation/meta-evaluation.md
```

평가 기준:

| 기준 | 설명 |
| --- | --- |
| Scope | 한 기능/한 버그 단위인지 |
| Correctness | 요구 기능이 실제로 동작하는지 |
| Verification | 테스트 또는 smoke check가 있는지 |
| Documentation | README, checklist, feature spec이 갱신됐는지 |
| Data discipline | raw field와 canonical schema를 혼동하지 않았는지 |
| Safety | 원본 영상, 개인정보, secret 노출이 없는지 |
| Git hygiene | 커밋 메시지, why, verify, 작은 커밋 규칙을 지켰는지 |

평가 방식:

```text
1. 작업 완료 후 self-check 작성
2. reviewer 또는 사람 검토
3. rubric 기준으로 평가
4. 기준 미달 시 완료로 보지 않음
```

## 11. Meta-Evaluation System

목적:

```text
에이전트 평가 시스템이 좋은 작업과 나쁜 작업을 실제로 구분하는지 검증한다.
```

구성:

```text
docs/evaluation/meta-evaluation.md
docs/evaluation/golden-cases/
scripts/evaluate_agent_output.py
scripts/evaluate_evaluator.py
```

검증 기준:

```text
좋은 작업을 통과시키는가
README 누락을 실패시키는가
테스트 누락을 실패시키는가
큰 커밋을 실패시키는가
scope creep을 실패시키는가
평가 결과에 이유와 개선 액션이 남는가
평가 기준이 너무 느슨하거나 너무 엄격하지 않은가
```

CI 기준:

```text
통과해야 하는 golden case가 실패하면 CI 실패
실패해야 하는 golden case가 통과하면 CI 실패
평가 로그 format이 깨지면 CI 실패
```

## 12. Branch Strategy

개발과 문서 작업 브랜치:

```text
develop
```

작업 원칙:

```text
한 기능 또는 한 문서 단위로 구현
검증 후 작업 단위별 커밋
README와 문서 허브를 같은 작업에서 갱신
```

## 13. Open Gates

아직 열려 있는 결정:

```text
data.go.kr API 키 발급 여부
서울/대전 중 v0.1 실제 분석 대상 확정
대전 유성구 3D 데모 촬영 후보지 확정
LLM provider 후보 확정
GitHub repository/wiki 반영 방식 확정
```

README는 항상 문서 허브 역할을 유지한다.

새 주요 문서가 추가되면 README에 반드시 링크를 추가한다.

## 14. 관련 문서

- [공공데이터 기반 상권 분석 스펙](../features/market-analysis.md)
- [2.5D 상권 지도와 유동인구 Layer 스펙](../features/market-map-experience.md)
- [Gaussian Splatting 현장 상세보기 스펙](../features/3d-congestion-explorer.md)
- [데이터 소스 매핑](../data/data-source-mapping.md)
- [LocalTwin 디자인 시스템](../design/design-system.md)
