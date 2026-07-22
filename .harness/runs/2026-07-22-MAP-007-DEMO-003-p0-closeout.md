# Run Report: MAP-007 and DEMO-003 P0 Closeout

## Scope

- MAP-007: viewport 가장자리에서 기본 건물과 LocalTwin Overlay가 겹치는 문제
- DEMO-003: 공개 제품 발표 순서와 Render API 복구 경로
- `/en`: 제출용 데모 경로로 유지하고 수정 대상에서 제외

## Root Cause and Fix

기존 지도는 현재 **중심점**만으로 기본 건물 표시 여부를 정했다. 따라서 중심점은 지원 영역 밖이지만
화면 가장자리에 LocalTwin Overlay가 보이는 경우, 두 building extrusion이 동시에 렌더링됐다.

`MarketMapCanvas`가 map load·move end의 bounds를 전달하고, `useMapViewport`가 ready Overlay 원과
viewport의 교차를 계산하도록 바꿨다. 한국어 기본 제품 경로에서만 이 규칙을 적용하며, `/en`은 기존
center-only 규칙을 유지한다.

## Automated Verification

```text
targeted viewport regression: 4 tests passed
web test: 32 files, 98 tests passed
web lint: passed
web typecheck: passed
web production build: passed
Task Packet check: 71 packets passed
Docs index check: passed
git diff --check: passed
```

## Browser Verification

- fresh local `/` page: 오류 console 0건
- 연남 Overlay가 화면 가장자리에 남도록 지도를 이동: Overlay 내부는 LocalTwin 건물만, 바깥은 기본 지도 건물만 표시됨
- fresh local `/en` page: `/en` 경로 렌더와 console error 0건
- browser screenshot은 실행 시점의 local 화면으로 확인했고, product source에는 별도 binary 증거를 추가하지 않았다.

## Public Readiness Verification

- `https://localtwin-product.vercel.app/`: HTTP 200
- `https://localtwin-api.onrender.com/ready`: `{"status":"ready"}`
- 첫 `/ready` 요청은 Render Free idle wake-up으로 34초 이상 대기 후 timeout 되었고, 바로 다음 요청은 ready를 반환했다.
- 이 실제 관찰을 `docs/operations/public-demo-runbook.md`의 사전 wake-up·대기·retry 절차와 대조했다.

## Remaining Manual Follow-up

- commit·push 뒤 최신 Web build를 공개 배포하고 MAP-007 browser smoke를 다시 확인한다.
- Jira LT-15와 LT-16은 사용자가 run report·commit 링크를 붙인 뒤 완료 처리한다.
