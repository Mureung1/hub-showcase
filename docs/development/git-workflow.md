# Git 작업 규칙

## 1. 원칙

LocalTwin 개발은 작은 단위로 진행한다.

```text
한 기능 구현 -> 검증 -> 커밋
한 버그 수정 -> 재현/검증 -> 커밋
한 문서 정리 -> 확인 -> 커밋
```

커밋은 작업 기록이 아니라 의사결정과 검증 기록이다. 나중에 포트폴리오, 회고, 디버깅에서 다시 읽을 수 있어야 한다.

## 2. 커밋 단위

### 좋은 커밋 단위

```text
상권 반경 분석 API 추가
입지 점수 계산식 추가
지도 업종 필터 UI 추가
person bbox metadata 저장 버그 수정
개발 체크리스트 문서 추가
```

### 피해야 할 커밋 단위

```text
여러 기능을 한 번에 구현
기능 구현과 대규모 포맷팅을 함께 커밋
버그 수정과 새 기능을 함께 커밋
검증 없이 "작업 중"으로 커밋
의미 없는 메시지로 커밋
```

## 3. 커밋 전 체크

커밋 전에는 항상 다음을 확인한다.

```text
1. 이번 커밋의 목적이 한 문장으로 설명되는가?
2. 기능 구현, 버그 수정, 문서 변경, 리팩터링이 섞이지 않았는가?
3. 관련 없는 파일이 staged 상태에 들어가지 않았는가?
4. 최소 검증을 수행했는가?
5. 커밋 메시지에 변경 이유와 검증 내용을 남겼는가?
```

## 4. 커밋 메시지 형식

커밋 메시지는 Conventional Commit에 가깝게 작성한다.

```text
type(scope): summary

why:
- 왜 이 변경이 필요한지

verify:
- 어떤 검증을 했는지
```

허용 type:

```text
feat
fix
docs
refactor
test
chore
build
ci
perf
```

예시:

```text
feat(market-analysis): add radius competition summary

why:
- 선택 위치 기준 동일 업종 경쟁 강도를 계산해야 한다.

verify:
- sample store fixture로 100m/300m/500m 집계 결과를 확인했다.
```

```text
fix(anonymization): exclude frames with large person bbox

why:
- 사람이 장면 중심을 크게 가리면 3D 복원 품질이 떨어진다.

verify:
- sample frames에서 large bbox frame이 output exclude list에 기록되는지 확인했다.
```

## 5. Hook으로 강제할 수 있는 것

Git hook으로 강제할 수 있는 항목:

```text
staged file 개수 상한
staged 변경 영역 개수 상한
커밋 메시지 type 형식
summary 길이
why 섹션 존재
verify 섹션 존재
```

Git hook만으로 완전히 강제하기 어려운 항목:

```text
정말 한 기능만 담겼는지
정말 한 버그만 수정했는지
검증 내용이 실제로 충분한지
변경 의도가 제품 범위에 맞는지
```

따라서 이 프로젝트는 다음 조합으로 운영한다.

```text
pre-commit hook:
너무 큰 커밋과 여러 영역을 동시에 건드리는 커밋 차단

commit-msg hook:
커밋 메시지 형식 강제

개발 체크리스트:
작업 단위와 검증 항목 추적

작업 습관:
한 기능/한 버그 단위로 stage 후 commit
```

## 6. 여러 기능 동시 구현 방지 규칙

완전한 의미 판별은 자동화하기 어렵다. 예를 들어 어떤 변경이 "하나의 기능"인지 "두 기능을 섞은 것"인지는 코드 의미와 작업 의도를 봐야 한다.

대신 LocalTwin은 다음 규칙으로 강하게 제한한다.

```text
1. pre-commit hook은 staged file이 10개를 넘으면 차단한다.
2. pre-commit hook은 staged 변경 영역이 3개를 넘으면 차단한다.
3. commit-msg hook은 why/verify 섹션을 요구한다.
4. 커밋 메시지 scope는 작업 대상 기능과 맞춰 적는다.
5. 체크리스트 항목 1개 또는 밀접한 하위 항목 묶음만 한 커밋에 담는다.
```

이 규칙은 "실수로 여러 기능을 한 번에 stage 하는 상황"을 막기 위한 것이다. 의미상 정말 하나의 기능인데 파일이 많이 바뀌는 경우에도 먼저 더 작은 커밋으로 나눌 수 있는지 확인한다.

주의:

```text
local hook은 git commit --no-verify로 우회할 수 있다.
팀/원격 저장소에서 강제하려면 branch protection, required CI, PR review 규칙이 필요하다.
```

## 7. Hook 설정

이 저장소에는 hook 샘플을 `.githooks/pre-commit`과 `.githooks/commit-msg`에 둔다.

Git 저장소를 초기화한 뒤 다음 명령으로 활성화한다.

```powershell
git config core.hooksPath .githooks
```

설정 확인:

```powershell
git config --get core.hooksPath
```

기대 출력:

```text
.githooks
```

## 8. 작업 루프

기능 구현 루프:

```text
1. 체크리스트에서 작업 1개를 고른다.
2. 관련 파일만 수정한다.
3. 최소 검증을 수행한다.
4. 관련 파일만 stage 한다.
5. 커밋 메시지에 why/verify를 남긴다.
6. 체크리스트를 갱신한다.
```

버그 수정 루프:

```text
1. 버그를 재현한다.
2. 원인을 좁힌다.
3. 최소 수정으로 고친다.
4. 원래 실패 케이스가 통과하는지 확인한다.
5. 가능하면 회귀 테스트 또는 재현 체크를 남긴다.
6. fix 커밋으로 분리한다.
```

## 9. 권장 명령

현재 변경 확인:

```powershell
git status --short
```

파일 단위 stage:

```powershell
git add path/to/file
```

부분 stage:

```powershell
git add -p
```

커밋:

```powershell
git commit
```

최근 커밋 확인:

```powershell
git log --oneline -5
```
