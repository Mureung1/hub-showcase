# Run Report: 2026-07-10-DATA-001

## 1. Task

```text
Task packet: .harness/tasks/DATA-001-official-source-preparation.md
Commit: pending
Branch: develop
Status: partial
```

## 2. Changed Files

```text
.env.example
apps/api/src/localtwin_api/config.py
apps/api/src/localtwin_api/seoul_open_data.py
apps/api/tests/test_seoul_open_data.py
docs/data/data-source-mapping.md
docs/development/environment.md
```

## 3. Summary

```text
서울 상권분석 Open API의 상권영역, 점포, 추정매출, 생활인구,
상주인구, 직장인구 service를 local raw snapshot collector에 등록했다.

공공데이터포털의 상가업소, 일반음식점, 휴게음식점 API 신청 목록을 문서화했다.
API key는 .env의 SecretStr 설정으로만 읽고, browser route 또는 Git에는 넣지 않는다.

서울 Open API key로 `20251` 기준 상권영역, 점포, 추정매출, 생활인구의
전체 101,110행을 data/raw/seoul-market/20260709T191532Z에 저장했다.
```

## 4. Verification

명령:

```powershell
uv run --directory apps/api ruff check .
uv run --directory apps/api ruff format --check .
uv run --directory apps/api pytest
uv run --directory apps/api python -m localtwin_api.seoul_open_data --help
uv run --directory apps/api python -m localtwin_api.seoul_open_data --period 20251 --all --allow-official-http
powershell -ExecutionPolicy Bypass -File scripts/check.ps1
git diff --check
```

결과:

```text
Ruff lint와 format check가 통과했다.
API pytest 7개가 통과했다.
수집 CLI help와 HTTP acknowledgement guard가 동작했다.
전체 harness check가 통과했다.
네 raw source의 provider row 수와 saved row 수가 일치했고, 모두 truncated=false였다.
raw snapshot 파일에서 서울 Open API key 문자열이 발견되지 않았다.
```

## 5. Self-check

| Criterion | Result | Note |
| --- | --- | --- |
| Scope | pass | 공식 데이터 조사와 snapshot 준비만 포함했다. |
| Correctness | partial | 서울 Open API 전체 수집은 통과했고, 공공데이터포털 importer는 아직 없다. |
| Verification | pass | unit test, CLI help, key/HTTP guard, full harness check를 실행했다. |
| Documentation | pass | 신청 목록, 수집 명령, limitation과 변경 기록을 갱신했다. |
| Data discipline | pass | raw snapshot, source type, row limit, truncated metadata를 구분했다. |
| Safety | pass | key를 source, log, browser route, Git에 넣지 않았다. |
| Git hygiene | pending | 실제 snapshot 확인 뒤 task를 완료하고 별도 commit한다. |

## 6. Known Limitations

```text
서울 Open API의 공식 endpoint는 HTTP port 8088과 URL path key 방식을 문서화한다.
수집기는 --allow-official-http 명시 없이는 요청을 보내지 않는다.

PUBLIC_DATA_SERVICE_KEY를 요구하는 개별 점포와 인허가 importer는
신청 후 실제 Swagger 응답을 확인하는 다음 task에서 구현한다.

현재 raw snapshot은 SQLite canonical schema로 아직 변환되지 않았다.
```

## 7. Next Action

```text
project owner가 공공데이터포털의 세 API에 활용신청하고 PUBLIC_DATA_SERVICE_KEY를 .env에 넣는다.
다음 DATA-002에서 개별 점포 marker와 음식점 인허가 importer를 구현한다.
그 뒤 현재 서울 snapshot을 SQLite canonical schema로 변환하는 task를 시작한다.
```
