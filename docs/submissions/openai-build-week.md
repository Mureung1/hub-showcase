# OpenAI Build Week 제출 패키지 — LocalTwin

문서 상태: 제출 준비 중  
대회: [OpenAI Build Week](https://openai.devpost.com/)  
제출 트랙: **Apps for your life**

## 1. 제출 화면에 입력할 내용

### 프로젝트 이름

```text
LocalTwin — Evidence-Based Neighborhood Storefront Explorer
```

### 한 줄 설명

```text
LocalTwin helps prospective small-business owners explore a Seoul neighborhood, search stores, and understand competition, demand, and evidence-backed location signals before choosing a site.
```

### 프로젝트 설명

```text
Opening a small shop often starts with incomplete information: a map, a few reviews, and a personal impression of the neighborhood. LocalTwin turns that first exploration into an evidence-backed workflow.

Users can search a supported Seoul commercial area or store, choose an industry, and inspect the result on an interactive MapLibre map. The product connects store and commercial-area data to show same-category competition, opening and closing signals, foot-traffic context, population context, and an explainable location score. Every analysis result carries its period, unit, method, and source metadata so that the UI does not present a number as unexplained certainty.

The current public demonstration focuses on Yeonnam, Hongdae, and Hapjeong. The product deliberately keeps the operational boundary small: it is a working vertical slice, not a misleading claim of city-wide coverage. A separate Scene route exists for future on-site 3D exploration, but it is disabled in the public environment until privacy, authorization, and quota controls are complete.

I used Codex with GPT-5.6 as an implementation partner across the product boundary, React state and map component refactors, FastAPI router and repository boundaries, SQLAlchemy/Alembic database work, importer validation, tests, deployment configuration, and documentation. The work was organized as small, verifiable commits: inspect the existing behavior, isolate one responsibility, run focused regression checks, then record the result in the related issue and task packet.
```

### 핵심 기능

- 상권명·점포명·주소·업종의 통합 검색
- React → FastAPI → Supabase PostgreSQL의 실제 데이터 흐름
- MapLibre 기반 지도, 상권 경계와 점포 선택
- 동종 업종 경쟁·개폐업·유동·인구 근거를 포함한 상권 분석
- 데이터 기간·단위·출처·계산 방법을 표시하는 설명 가능한 결과
- 원본 snapshot → canonical SQLite → PostgreSQL seed의 재현 가능한 데이터 pipeline

## 2. 심사자가 사용할 링크

| 항목 | 링크 또는 값 | 확인 상태 |
| --- | --- | --- |
| 제품 데모 | https://localtwin-product.vercel.app | HTTP 200 (2026-07-21) |
| API health | https://localtwin-api.onrender.com/health | HTTP 200 (2026-07-21) |
| 코드 저장소 | https://github.com/HyunKN/hub | 제출 전 공개 상태와 라이선스 확인 필요 |
| 데모 영상 | `TODO: public YouTube URL` | 업로드 필요 |
| Codex `/feedback` Session ID | `TODO: core functionality session ID` | 본인 계정에서 입력 필요 |

## 3. 2분 40초 데모 영상 대본

목표는 화면을 많이 보여주는 것이 아니라, **실제 문제 → 작동 흐름 → Codex 사용 방식 → 안전한 범위**를 보여주는 것이다.

| 시간 | 화면 | 말할 내용 |
| --- | --- | --- |
| 0:00–0:20 | 제품 첫 화면 | “LocalTwin은 예비 소상공인이 점포를 열기 전에 상권을 탐색하고 근거를 확인하도록 돕는 서비스입니다.” |
| 0:20–0:45 | 검색창에서 `연남`, `카페` 검색 | “현재는 연남·홍대·합정의 검증된 시연 범위에 집중합니다. 검색은 정적 목록이 아니라 FastAPI와 PostgreSQL의 실제 응답을 사용합니다.” |
| 0:45–1:15 | 지도·점포 선택 | “결과를 선택하면 점포 위치와 소속 상권이 지도와 분석 패널에 함께 반영됩니다. 지도는 탐색용이고, 분석 근거는 별도 데이터 흐름으로 관리합니다.” |
| 1:15–1:45 | 분석 패널 | “동종 업종 경쟁, 개·폐업, 유동·인구 근거, 입지 점수를 함께 봅니다. 각 숫자는 기간·단위·출처를 남겨서 사용자가 해석할 수 있게 합니다.” |
| 1:45–2:15 | GitHub README·테스트 또는 코드 | “Codex와 GPT-5.6은 React 상태와 지도 UI, FastAPI router·repository, SQLAlchemy/Alembic, importer 검증을 작은 단위로 분리하고 회귀 테스트를 실행하는 데 사용했습니다.” |
| 2:15–2:40 | README의 범위와 제한 | “3D 현장 탐색은 후속 기능이며, privacy gate가 검증되기 전에는 공개하지 않습니다. LocalTwin은 서울 전체를 이미 지원한다고 주장하지 않고, 검증된 범위에서 확장 가능한 구조를 보여줍니다.” |

영상 조건:

- 3분 미만, YouTube에서 **Public**로 공개
- 음성으로 Codex와 GPT-5.6을 어떻게 사용했는지 설명
- 화면에서 실제 검색→선택→분석 흐름을 한 번 끝까지 보여주기
- API가 처음 깨어나는 데 시간이 걸릴 수 있으므로, 녹화 전에 제품 URL을 한 번 열어 둘 것

## 4. 제출 전 체크리스트

- [ ] Devpost에서 `Apps for your life` 선택
- [ ] 위 프로젝트 설명을 붙여넣고 실제 내용과 일치하는지 재확인
- [ ] 3분 미만 Public YouTube 영상 URL 입력
- [ ] 공개 GitHub 저장소 URL 입력
- [ ] 저장소에 적절한 license를 추가하거나, private 저장소라면 Devpost가 지정한 두 테스트 계정에 공유
- [ ] README에 실행 방법·sample data/데이터 제약·Codex/GPT-5.6 활용 설명이 있는지 확인
- [ ] 핵심 기능을 만든 Codex `/feedback` Session ID 입력
- [ ] 제품 URL과 `/health`를 제출 직전에 다시 열어 확인
- [ ] 사용하지 않는 3DGS·내부 job·개발용 데이터 경로를 제출 화면이나 영상에서 노출하지 않음

## 5. 제출 전에 확인할 사실

- 현재 제품은 **연남·홍대·합정**의 제한된 상권 시연 범위다.
- 서울 전체 검색·반경별 실제 재집계·공개 Scene API는 제출 범위가 아니다.
- 제품 API는 Render, 웹은 Vercel에 배포되며 현재 URL은 위의 HTTP 상태로만 확인했다. 브라우저 사용자 흐름은 영상 녹화 전에 수동으로 다시 확인한다.
- canonical SQLite는 운영 DB가 아니라 원본 데이터 정제·검증 기준이다. 제품 runtime은 Supabase PostgreSQL이다.

## 6. 제출 이후 보관 기준

- Devpost에 입력한 최종 설명·영상 URL·Session ID는 이 문서의 `TODO`를 실제 값으로 교체해 기록한다.
- 제출 직전 코드 변경은 작은 commit으로 분리하고, 마지막 commit SHA와 검증 결과를 GitHub Issue에 남긴다.
- 배포 실패나 심사 중 재현 실패는 `docs/issues/`에 재현 단계와 영향 범위를 기록한다.
