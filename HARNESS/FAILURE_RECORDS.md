# 실패 기록 원칙

실패 기록은 단순한 에러 메시지가 아니라 재현·수정·검증 가능한 작업 자산이다.

## 현상과 원인을 분리한다

- **관측**: 실제로 확인된 사실만 기록한다. 실행 명령, 종료 코드, 타임아웃, 실패한 테스트, HTTP 상태 등이 해당한다.
- **진단**: 관측을 해석한 원인 후보다. `hypothesis`, `confirmed`, `refuted`, `inconclusive`를 구분한다.
- **수정 행동**: 코드 변경, 설정 변경, 재시도, 롤백 등 실제 수행한 행동이다.
- **검증**: 수정 후 Controller가 독립적으로 수행한 검사 결과다.
- **처분**: 재시도, 대기, 차단, 롤백, 중단 중 다음 행동을 기록한다.

Agent의 설명만으로 원인을 `confirmed`로 승격하지 않는다. 재현 또는 독립 검증 증거가 있어야 한다.

## Attempt는 덮어쓰지 않는다

재시도는 항상 새 Attempt를 만든다. `attempt-001`에서 발생한 실패가 `attempt-002`에서 해결되더라도 첫 파일은 수정하지 않는다. 두 번째 Attempt와 `events.jsonl`에 해결 및 재검증 이벤트를 추가한다.

각 Attempt와 Failure는 Controller 전용 `HARNESS_JOURNAL_KEY`로 HMAC 서명한다. `state.json`은 현재 미해결 Failure 목록을 투영하고, 실제 과거 기록은 새 Attempt의 `failure_updates`와 이벤트를 추가하는 방식으로만 해소한다.

Worker 결과를 처리하는 중 Controller 자체 예외가 발생해도 in-flight Attempt 경계에서 `controller_exception` 현상과 정제된 예외를 서명된 Failure로 완결한다. Attempt가 먼저 완결되고 상태 이벤트 전에 중단된 경우에는 재개 시 서명된 Attempt와 실제 checkpoint blob을 대조해 상태를 복구한다.

## 최소 기록 항목

- run, phase, step, attempt 식별자
- 시작·종료 UTC와 실행 시간
- 정제된 명령·작업 디렉터리·환경변수 이름
- 종료 코드, signal, timeout 여부
- 정제된 stdout/stderr 증거 경로와 SHA-256
- 시작 commit, 변경 경로, diff 증거
- 관측된 현상과 원인 평가
- 수행한 수정과 결과
- 검증 결과와 다음 행동
- 재현 명령 또는 재현 절차

## 비밀정보

API 키, 토큰, 비밀번호, 인증 헤더, 원시 환경변수 값은 기록하지 않는다. 설정에 등록된 비밀값과 알려진 패턴은 디스크 기록 전에 정제하고, 비밀 환경변수는 해당 Step에 필요한 것만 전달한다. 자동 정제가 임의 형식의 비밀을 모두 식별하지는 못하므로 Provider sandbox와 환경 allowlist를 함께 적용한다.

Run 생성 전의 실패(무결성 키 없음, dirty worktree, 잘못된 입력)는 서명 원장을 만들기 전이므로 CLI의 구조화 오류로만 반환된다. Run이 생성된 뒤의 capability·승인·adapter 설정 부족과 모든 Step 실패는 Attempt·Failure·Event에 기록된다.
