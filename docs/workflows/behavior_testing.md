# Behavior Testing Workflow

## Purpose

에이전트의 호출, 분기, 승인 경계와 결과 보고를 동작 테스트할 때 합성 문장을
실제 사용자 발화나 프로젝트 사실로 오인하지 않도록 출처와 실행 환경을
고정한다. 단위 테스트와 정적 검증은 이 문서의 불변 조건을 자동으로 검사한다.

## Required Provenance

동작 테스트를 시작하기 전에
`docs/templates/behavior_test_manifest.md`를 작성한다. 테스트 데이터는 처음
등장하는 곳, Specialist Task Packet, 전문 에이전트 handoff와 최종 결과
보고에서 모두 `[TEST FIXTURE: SYNTHETIC]`으로 표시한다.

Task Packet의 사실·입력에는 다음 출처 유형 중 하나를 항목별로 기록한다.

- `current_user_input`: 현재 사용자 발화에서 직접 확인한 정보
- `prior_user_input`: 이전 사용자 발화에서 직접 확인한 정보
- `confirmed_document`: 대상 프로젝트의 확정 문서에서 확인한 정보
- `proposal_input`: 사용자가 입력으로 허가한 미확정 제안
- `synthetic_test_fixture`: 동작 테스트를 위해 만든 합성 데이터

`synthetic_test_fixture`는 `테스트 픽스처 가정`에만 둘 수 있다. 이를 사용자
제공 사실, 확정 사실, 정사 또는 적용 후보라고 부르지 않는다. 출처가 없거나
출처 유형과 분류가 충돌하면 전문 에이전트를 호출하지 않고
`blocked_test_provenance`를 반환한다. 이미 호출된 전문 에이전트도 같은
상태로 중단하며 Draft, 대안 또는 검수 판정을 만들지 않는다.

테스트용 문장과 산출물은 Approval Queue, 임시 아이디어, Decision Log,
Version History 또는 `design/`에 승격하지 않는다. 사용자가 테스트와 별도로
같은 내용을 실제 제안으로 명시하더라도 새 사용자 입력으로 다시 출처를
기록하고 일반 승인 흐름을 처음부터 따른다.

## Two-Tier Isolation

### Tier 1: Dedicated Synthetic Fixture

기본 동작 테스트는 `tests/fixtures/behavior/sample-game/`을 원본으로 사용한다.
픽스처는 등록 프로젝트가 아니며 모든 프로젝트 정보에
`[TEST FIXTURE: SYNTHETIC]` 표시를 유지한다.

1. `mktemp -d`로 `/tmp` 아래 실행 디렉터리를 만든다.
2. 전용 픽스처를 실행 디렉터리에 복사한다.
3. 쓰기는 실행 디렉터리 내부에서만 허용한다.
4. 테스트 종료 후 저장소 원본과 실제 프로젝트 변경이 없음을 확인한다.
5. 실행 디렉터리는 결과 확인 후 제거한다.

### Tier 2: Temporary Project Copy

실제 프로젝트의 구조나 기존 링크가 꼭 필요한 스모크 테스트에서만 사용한다.
사용 이유를 매니페스트에 적고, 대상 프로젝트를 `/tmp`의 새 디렉터리에
복사한다.

1. 원본 프로젝트의 비교 기준을 테스트 전에 기록한다.
2. 복사본의 모든 합성 입력을 `[TEST FIXTURE: SYNTHETIC]`과
   `synthetic_test_fixture`로 표시한다.
3. 테스트 중 원본 경로 쓰기를 금지한다.
4. 테스트 뒤 같은 기준으로 원본을 비교하고 변경이 있으면 테스트 실패로
   처리한다.
5. 원본이 바뀌었다면 자동으로 되돌리거나 숨기지 말고 즉시 사용자에게
   변경 경로와 미완료 복구 범위를 알린다.

실행 중 생성한 대화, 로그, 임시 승인 항목과 산출물은 실제 프로젝트의 근거가
아니다. `/tmp` 복사본에서 만들어졌다는 이유만으로 출처 표시를 생략하지
않는다.

## Required Result Report

동작 테스트 결과는 성공과 실패 모두 아래 네 필드를 그대로 포함한다.

- 데이터 출처: `synthetic_test_fixture` 또는 실제 사용한 출처 유형
- 실행 환경: `dedicated_fixture` 또는 `temporary_project_copy`
- 원본 변경: `없음` 또는 변경된 정확한 경로
- 실제 프로젝트 사실로 채택: `아님`

합성 입력 때문에 발생한 출력은 “사용자가 제공한 설정”이 아니라 “테스트
픽스처 가정에 대한 출력”이라고 설명한다. 기능 오류와 테스트 도구·환경
오류를 분리해 보고하고, 실패한 테스트를 통과했다고 표현하지 않는다.

## Completion Check

- 매니페스트의 모든 필수 필드가 채워졌다.
- 합성 입력이 처음부터 끝까지 같은 표시와 출처 유형을 유지했다.
- 전문 에이전트 호출이 필요하면 완성된 Specialist Task Packet에 출처 표가
  포함되었다.
- 모든 쓰기가 `/tmp`의 선언된 실행 작업 경로 안에서만 발생했다.
- 테스트 전후 원본 비교 결과가 기록되었다.
- 네 가지 필수 결과 보고 필드가 사용자 안내에 포함되었다.

