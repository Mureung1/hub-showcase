# Task Packet: DATA-005

## 1. Summary

```text
Task: canonical bulk import 품질 보고 표 작성
Backlog ID: DATA-005
Type: data quality
Status: done
```

## 2. Goal

공식 bulk 원본을 canonical SQLite에 적재할 때 입력·승인·제외 수와 제외 이유를
사람이 읽을 수 있고 재실행 가능한 표로 출력한다.

## 3. Scope

포함:

```text
SBDC 개별 점포와 서울시 점포-상권 importer의 quality summary
duplicate, missing required, invalid coordinate, unknown market 구분
Markdown report CLI와 회귀 test
```

제외:

```text
인허가 전체 pagination 품질 보고
새 공공데이터 source 수집
production database seed 변경
```

## 4. Related Documents

```text
docs/data/data-source-mapping.md
docs/data/database-structure.md
docs/development/tasks.md
```

## 5. Expected Changes

```text
bulk_import: --report-format markdown으로 summary table을 출력한다.
tests: fixture import의 제외 이유와 표를 검증한다.
docs: 실제 2026-07-15 import 결과와 재실행 명령을 기록한다.
```

## 6. Acceptance Criteria

- [x] 오류 건수와 제외 이유를 표로 출력한다.
- [x] duplicate key와 실제 제외 행을 혼동하지 않는다.
- [x] fixture import에서 missing, invalid coordinate, unknown market을 회귀 검증한다.
- [x] 기존 JSON 출력 계약을 기본값으로 유지한다.

## 7. Verification Plan

```powershell
uv run --directory product/apps/api pytest tests/test_bulk_import.py
uv run --directory product/apps/api ruff format --check src/localtwin_api/bulk_import.py tests/test_bulk_import.py
uv run --directory product/apps/api ruff check src/localtwin_api/bulk_import.py tests/test_bulk_import.py
```

## 8. Documentation Updates

- [x] 공식 bulk 적재 결과와 CLI 명령을 data mapping 문서에 기록한다.
- [x] 개발 백로그 상태를 갱신한다.

## 9. Commit Plan

```text
feat(data): report canonical import quality
docs(data): record quality report command
```

## 10. Self-check

- [x] CSV 원본이나 credential을 저장소에 추가하지 않았는가?
- [x] report의 제외 수가 각 제외 이유 합과 일치하는가?
- [x] 기본 JSON CLI contract를 바꾸지 않았는가?
- [ ] 후속 DATA-008 인허가 전체 importer에도 같은 품질 표를 적용할 것인가?
