# LocalTwin Validation Guide

이 문서는 LocalTwin 개발 중 어떤 검증을 수행해야 하는지 정의한다.

## 1. 검증 원칙

```text
작업 단위에 맞는 가장 작은 의미 있는 검증을 선택한다.
명령 성공과 문제 해결을 구분한다.
수치 개선 주장은 baseline과 비교한다.
검증하지 않은 것은 검증했다고 말하지 않는다.
```

## 2. 기본 검증 명령

전체 검증 진입점:

```powershell
scripts/check.ps1
```

현재 P0 포함 항목:

```text
task packet 형식 검사
README/docs 주요 링크 존재 확인
문서 링크 검사
docs HTML 문법과 그래프 문서 대상 존재 확인
Web·Python 함수 budget, runtime literal과 FastAPI boundary 구조 검사
구조 checker의 실패 self-test
web Prettier / typecheck / lint / unit test / production build
api Ruff lint / format check / pytest
```

## 3. 작업 유형별 검증

| 작업 유형 | 최소 검증 |
| --- | --- |
| docs | 링크 확인, 문서 경로 확인 |
| web | `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, 화면 변경 시 screenshot |
| api | `uv run --directory product/apps/api ruff check .`, `pytest`, endpoint smoke |
| data | sample fixture 변환 확인, schema check |
| DB migration | Alembic upgrade/downgrade, canonical SQLite 대비 row count·대표 query 비교, secret diff 점검 |
| deploy boundary | 제품 artifact와 문서 artifact 파일 목록 검사, 각 build·route smoke |
| security containment | 기본 설정의 Scene route 비노출, market·score API 회귀 test |
| bug | 재현 케이스 확인, 수정 후 동일 케이스 재검증 |
| harness | check script 자체 통과, 실패 케이스 수동 확인 |
| refactor | characterization test, 구조 budget 감소, 관련 smoke와 전체 check |

GitHub Actions CI는 사용하지 않는다. 검증은 개발자가 로컬에서 필요한 범위만 실행하고, PR 설명에 실제 실행 결과를 기록한다.

## 4. Run Report에 남길 내용

```text
실행한 명령
명령 결과
수동 확인 결과
남은 한계
다음 작업
```

## 5. 검증 부족 상태

다음은 완료로 보지 않는다.

```text
빌드는 통과했지만 요구 기능을 확인하지 않음
문서 링크를 추가했지만 실제 파일 존재를 확인하지 않음
테스트 없이 버그 수정 완료라고 말함
화면 변경 후 screenshot 또는 수동 확인이 없음
```

## 6. 관련 문서

- [개발환경](./environment.md)
- [개발 컨벤션](./conventions.md)
- [개발 전 결정 Gate](./pre-development-decisions.md)
- [Git 작업 규칙](./git-workflow.md)
