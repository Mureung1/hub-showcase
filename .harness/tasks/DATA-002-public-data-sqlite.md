# Task Packet: DATA-002

## 1. Summary

```text
Task: 공공데이터포털 실제 수집과 canonical SQLite 적재
Backlog ID: DATA-002 / DATA-003 / DATA-004 / API-001
Parent Epic: EPIC-02 · EPIC-03
Type: data
Owner: N187_정현우
Status: done
```

## 2. Goal

허용된 공식 API의 실제 응답과 서울 상권 snapshot을 provenance가 연결된 canonical SQLite에 반복 적재한다.

## 3. Scope

포함:

```text
상가 반경 조회, 일반음식점, 휴게음식점 공식 API adapter
secret을 출력하지 않는 raw snapshot과 manifest
시장·점포집계·매출·유동·개별점포·인허가 canonical tables
source URL·수집시각·period·row count·hash provenance
같은 snapshot 재적재 idempotency
```

제외:

```text
인증이 필요한 비공개 web scraping
robots.txt 또는 이용약관 우회
개인정보 수집
PostgreSQL/PostGIS와 migration framework
Front API 연결
```

## 4. Related Documents

```text
docs/data/data-source-mapping.md
docs/development/architecture.md
docs/development/tasks.md
docs/features/market-score-methodology.md
```

## 5. Expected Changes

```text
api: public data collector와 SQLite importer
tests: provider response parsing, schema, provenance, idempotency
data: ignored raw snapshot과 processed SQLite
docs: 실제 row count와 schema 흐름
```

## 6. Acceptance Criteria

- [x] 3개 공식 API endpoint와 요청 제한이 코드·문서에 일치한다.
- [x] API key가 URL log, snapshot, manifest에 남지 않는다.
- [x] 공공데이터포털 실제 sample 응답을 저장한다.
- [x] 서울 101,110 raw rows가 canonical SQLite에 적재된다.
- [x] 모든 canonical table이 source snapshot을 참조한다.
- [x] 같은 snapshot을 두 번 적재해도 row 수가 늘지 않는다.
- [x] schema와 importer test가 통과한다.

## 7. Verification Plan

```powershell
uv run --directory product/apps/api pytest
uv run --directory product/apps/api ruff check .
uv run --directory product/apps/api python -m localtwin_api.public_data --help
uv run --directory product/apps/api python -m localtwin_api.canonical_db --help
```

실제 data check:

```text
public-data manifest에서 세 source의 row count와 hash 확인
SQLite stats와 원본 서울 manifest count 대조
같은 importer 명령 2회 후 table count 비교
```

## 8. Documentation Updates

- [x] canonical schema와 provenance 흐름 기록
- [x] 실제 수집·적재 결과 기록
- [x] 백로그 상태 갱신
- [x] Run Report 작성

## 9. Commit Plan

```text
feat(data): import official market data with provenance
```

## 10. Self-check

- [x] 허용된 공식 API만 호출하는가?
- [x] secret이 source·test·log·snapshot에 없는가?
- [x] 추정매출과 추정 유동을 official_estimate로 유지하는가?
- [x] 좌표계를 WGS84로 임의 해석하지 않는가?
- [ ] 후속: API endpoint와 Front adapter를 연결한다.
