# Behavior Test Manifest

동작 테스트 전에 아래 필드를 모두 한 줄 값으로 채운다. 합성 데이터가 처음
등장하는 `테스트 입력` 값은 반드시 `[TEST FIXTURE: SYNTHETIC]`으로 시작한다.

- 테스트 ID:
- 표시 라벨: `[TEST FIXTURE: SYNTHETIC]`
- 데이터 출처: `synthetic_test_fixture`
- 실행 환경: `dedicated_fixture | temporary_project_copy`
- 픽스처 원본:
- 실행 작업 경로: `/tmp/<isolated-test-directory>`
- 실제 프로젝트 복사 필요 이유: `없음 | 구체적인 이유`
- 허용된 쓰기: `실행 작업 경로 내부만`
- 원본 변경: `없음`
- 실제 프로젝트 사실로 채택: `아님`
- 테스트 입력: `[TEST FIXTURE: SYNTHETIC] <합성 입력>`
- 결과 보고: `데이터 출처, 실행 환경, 원본 변경, 실제 프로젝트 사실로 채택`

## Rules

- 기본 실행 환경은 `dedicated_fixture`다.
- `temporary_project_copy`는 실제 구조가 필요한 이유를 적은 경우에만 쓴다.
- 실행 전에 원본 비교 기준을 기록하고 실행 뒤 같은 기준으로 비교한다.
- 테스트 결과와 Specialist Task Packet에서도 표시 라벨과 데이터 출처를
  유지한다.
- 테스트 산출물을 실제 프로젝트 문서나 작업 기록에 저장하지 않는다.

