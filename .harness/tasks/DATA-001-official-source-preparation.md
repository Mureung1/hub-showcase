# Task Packet: DATA-001

## 1. Summary

```text
Task: 공식 상권 데이터 API 신청과 로컬 raw snapshot 수집 준비
Type: data
Owner: Codex + project owner
Status: done
```

## 2. Goal

```text
브라우저가 secret을 직접 사용하지 않고,
서버 측 수집 명령이 서울 상권분석 Open API와 공공데이터포털 API의
실제 응답을 product/data/raw에 저장할 수 있는 상태를 만든다.
```

## 3. Scope

포함:

```text
공식 데이터셋과 신청 항목 확인
SEOUL_OPEN_DATA_KEY / PUBLIC_DATA_SERVICE_KEY 환경변수 준비
서울 상권분석 Open API raw snapshot 수집 CLI
수집 metadata와 문서 변경 기록
```

제외:

```text
API key 발급 대행 또는 key 값 공유
raw 데이터를 Git에 커밋
canonical schema 변환과 분석 API 구현
브라우저에서 공공 API를 직접 호출
```

## 4. Related Documents

```text
docs/data/data-source-mapping.md
docs/development/environment.md
docs/development/validation.md
docs/features/market-analysis.md
```

## 5. Expected Changes

```text
api: Seoul Open Data snapshot collector
data: ignored local raw snapshot directory
docs: source application and collection procedure
tests: collector response and snapshot tests
```

## 6. Acceptance Criteria

- [x] 공식 서울 상권 점포, 매출, 생활인구, 상권영역 API의 서비스명을 확인한다.
- [x] 공공데이터포털의 상가업소, 일반음식점, 휴게음식점 신청 항목을 확인한다.
- [x] `SEOUL_OPEN_DATA_KEY`를 넣으면 raw JSON과 manifest를 저장하는 명령이 실행된다.
- [x] project owner가 서울 Open API key를 `.env`에 넣고 실제 응답을 수집한다.
- [x] `20251` 기준 101,110행의 서울 raw snapshot에 기준 기간, row 수와 잘림 여부가 남는다.
- [x] `PUBLIC_DATA_SERVICE_KEY`로 개별 점포·인허가 실제 sample을 수집한다.

## 7. Verification Plan

실행할 검증 명령:

```powershell
uv run --directory product/apps/api pytest
uv run --directory product/apps/api python -m localtwin_api.seoul_open_data --help
uv run --directory product/apps/api python -m localtwin_api.seoul_open_data --period 20251 --all --allow-official-http
```

수동 확인:

```text
product/data/raw/seoul-market/<timestamp>/manifest.json에 실제 provider row 수와 저장 row 수가 남는지 확인한다.
수집 명령과 브라우저 응답에 API key가 노출되지 않는지 확인한다.
```

## 8. Documentation Updates

- [x] 공공데이터 신청 목록과 source별 용도를 data mapping에 기록
- [x] `.env.example`에 서울 Open API key 이름 추가
- [x] data mapping에 DATA-001 변경 기록 추가
- [x] 서울 raw snapshot 수집 후 데이터 기준일과 제한 사항을 data mapping에 갱신

## 9. Commit Plan

```text
feat(data): prepare official market data collection

why:
- keep provider secrets outside the browser and save reproducible raw snapshots

verify:
- run API collector unit tests and a real-key snapshot collection
```

## 10. Self-check

- [x] 실제 provider가 공개한 API와 데이터셋만 기록했는가?
- [x] API key를 문서, source, output에 직접 넣지 않았는가?
- [x] 실제 서울 Open API key로 product/data/raw snapshot을 수집했는가?
- [x] source metadata와 data limitation을 UI/API 구현 전에 유지할 수 있는가?
- [x] 공공데이터포털 API key로 개별 점포·인허가 importer를 검증했는가?
- [ ] 후속: 운영 갱신 주기와 보존 기간을 결정한다.
