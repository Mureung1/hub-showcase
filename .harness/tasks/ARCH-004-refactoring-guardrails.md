# Task Packet: ARCH-004

## 1. Summary

```text
Task: 리팩터링 기준선과 구조 규칙 자동 검사
Backlog ID: ARCH-004
Parent Epic: EPIC-08 / GitHub #63
Type: refactor
Owner: HyunKN
Status: done
```

## 2. Goal

현재 구조 부채는 명시적인 budget으로만 허용하고 새로운 과대 함수, runtime fixture, 중복 catalog와
계층 위반은 commit 전에 자동으로 차단한다.

## 3. Scope

포함:

```text
리팩터링 기준 문서
Web/Python 함수 budget ratchet
runtime fixture와 known hardcoding 검사
scripts/check.ps1와 pre-commit 연결
기존 formatting baseline 기록
```

제외:

```text
실제 구조 부채 전체 제거
사용자 기능 변경
외부 linter dependency 추가
```

## 4. Related Documents

```text
docs/development/refactoring-standards.md
docs/development/validation.md
.harness/tasks/REFACTOR-001-full-code-boundaries.md
GitHub #64
```

## 5. Expected Changes

예상 변경 영역:

```text
api: 없음
web: lint/check script entry
data: 없음
docs: refactoring standards와 backlog
tests: checker 자체 정상/실패 fixture
scripts: code structure check와 harness 연결
```

## 6. Acceptance Criteria

- [x] 기존 budget보다 함수가 커지면 검사가 실패한다.
- [x] 새 production fixture import와 신규 고정 period/catalog 중복이 실패한다.
- [x] allowlist에는 symbol, 현재 budget과 유지 이유가 있다.
- [x] 현재 허용 코드와 checker 자체 test가 통과한다.
- [x] `scripts/check.ps1`에서 우회 없이 실행된다.

## 7. Verification Plan

실행할 검증 명령:

```powershell
python scripts/check_code_structure.py --root .
python scripts/test_code_structure_check.py
powershell -ExecutionPolicy Bypass -File scripts/check.ps1
```

수동 확인:

```text
임시 위반 fixture를 checker test에 넣어 실패 메시지와 해결 위치를 확인한다.
```

## 8. Documentation Updates

- [x] 코드/스크립트 변경 시 관련 문서 또는 `.harness` 기록을 같은 커밋에 포함
- [x] README 링크 필요 여부 확인
- [ ] 기능 spec 갱신
- [ ] data mapping 갱신
- [x] checklist 갱신
- [x] decision/failure log 필요 여부 확인

## 9. Commit Plan

예상 커밋 메시지:

```text
chore(arch): enforce refactoring structure budgets

why:
- prevent new responsibility and fixture boundary regressions

verify:
- python scripts/test_code_structure_check.py
- powershell -ExecutionPolicy Bypass -File scripts/check.ps1
```

## 10. Self-check

- [x] 한 기능/한 버그/한 문서 단위인가?
- [x] 관련 없는 파일을 변경하지 않았는가?
- [x] 검증 결과를 기록했는가?
- [x] 문서와 체크리스트가 실제 변경과 일치하는가?
- [x] known limitation이 있으면 적었는가?
