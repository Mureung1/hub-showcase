# Task Packet: CI-001

## 1. Summary

```text
Task: LocalTwin CI를 개인 fork 전용으로 제한
Type: ci
Owner: Codex
Status: done
```

## 2. Goal

```text
docs, web, api CI가 HyunKN/hub의 main 또는 develop에서만 실행되게 한다.
원본 challenge 저장소와 N187_정현우 등 다른 branch에서는 실행하지 않는다.
```

## 3. Scope

포함:

```text
.github/workflows/ci.yml repository/branch scope
validation 문서와 checklist 설명
```

제외:

```text
원본 저장소의 Actions 설정
Auto Merge workflow
제출용 branch 자동 생성
```

## 4. Related Documents

```text
docs/development/validation.md
docs/development/checklist.md
```

## 5. Expected Changes

```text
pull_request base branch를 main/develop로 제한
모든 CI job에 HyunKN/hub repository guard 추가
개인 fork 전용 운영 범위 문서화
```

## 6. Acceptance Criteria

- [x] `HyunKN/hub`에서만 docs, web, api job이 실행된다.
- [x] push와 PR의 대상 branch가 main/develop로 제한된다.
- [x] 원본 challenge 저장소의 N187_정현우 대상 PR에서는 실행되지 않는다.
- [x] local 전체 검증이 통과한다.

## 7. Verification Plan

```powershell
python scripts/check_ci_scope.py
powershell -ExecutionPolicy Bypass -File scripts/check.ps1
```

## 8. Documentation Updates

- [x] validation 문서에 repository/branch scope 추가
- [x] checklist의 CI 항목을 개인 fork 전용으로 정정
- [x] 기능 spec과 data mapping 변경 없음 확인

## 9. Commit Plan

```text
ci: scope validation to the personal fork
```

## 10. Self-check

- [x] 원본 저장소의 workflow로 오해할 표현이 없는가?
- [x] 세 job에 동일한 repository guard가 있는가?
- [x] workflow 파일 자체를 PR에서 제외하는 문제와 실행 제한을 구분했는가?
- [ ] workflow 파일 자체를 upstream PR diff에서 제외하려면 제출용 branch 분리가 필요하다.
