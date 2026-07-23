# roles

하네스는 한 Agent 안에서 관점을 바꾸는 수준이 아니라 실행 권한과 판정 권한을 분리한다. 최소 역할은 사용자, Controller, Worker, 배포 Adapter, Verifier다.

## 사용자·운영 책임자

책임:

- PRD 변경, target stage와 배포 대상을 결정한다.
- `config.local.json`에서 Provider와 필요한 capability만 명시적으로 연다.
- `inputs.local.json`에는 비밀 원문 대신 환경변수 참조를 제공한다.
- scope violation이나 남은 변경을 직접 검토해 clean worktree를 복원한다.
- 프로덕션 challenge의 commit과 artifact digest를 확인하고 본인 이름으로 승인한다.

사용자 승인 없이는 Controller도 프로덕션 Phase를 통과시킬 수 없다.

## Controller

`HARNESS/engine/controller.py`가 갖는 유일 권한:

- Run, Phase, Step, Attempt 상태 전이
- 저장소 전역 실행 lock과 clean worktree 확인
- target별 Phase 선택과 고정 plan snapshot 생성
- Worker 환경·timeout·출력 크기 제한
- 변경 경로, ignored 파일 변화와 HEAD 변경 감시
- acceptance check 실행과 결과 판정
- 검증된 정확한 경로의 stage와 Step commit
- retry, blocked, failed, resume과 interruption 복구
- redaction된 로그, HMAC 서명 Failure·Event·상태와 복구 트랜잭션 기록

Controller는 사용자 변경을 stash/reset하지 않으며 push, PR, merge도 하지 않는다.

## Worker Agent

Worker는 `config.local.json`의 `worker.argv`로 실행되는 Provider다.

책임:

- 전달받은 instruction과 필요한 context를 읽는다.
- 해당 Step의 `allowed_paths` 안에서만 구현한다.
- commit, push, 승인, 하네스 state·config·run 기록 수정을 하지 않는다.
- stdout에는 간결한 JSON 보고를 남긴다.

Worker의 성공 보고는 advisory다. Worker가 자체 테스트를 실행했어도 Controller의 독립 검증을 대신하지 않는다.

## Verifier

Verifier는 Controller 내부의 독립 판정 역할이다.

- Worker 종료 코드와 timeout을 확인한다.
- HEAD가 바뀌지 않았고 변경 경로가 허용 범위인지 확인한다.
- 필수 artifact 존재와 `path_exists`, `content_contains`, `json_valid`, `command` check를 실행한다.
- required check 하나라도 실패하면 Step을 통과시키지 않는다.
- 성공 claim이 아니라 기록된 증거를 기준으로 `step.passed` Event를 만든다.

검증 command는 argv 배열로 실행되며 shell interpreter와 inline eval은 허용하지 않는다.

## 배포 Adapter·외부 시스템

배포 Phase를 도입하면 외부 변경 Step은 `staging` adapter, production 권한 Step은 `production` adapter로만 실행한다(현재 기능 단위 계획에는 배포 Phase가 없다). 일반 Worker 명령이나 credential을 재사용하지 않는다. Adapter는 전용 실행 파일, 불변 ID와 실제 SHA-256으로 고정하고 Provider·OS sandbox profile을 실제 적용한 뒤에만 capability를 연다.

배포 결과는 승인 scope와 일치하는 signed receipt, 독립 health/E2E/관찰 check가 통과해야 인정된다. 외부 시스템 응답이나 Agent 설명만으로 `deployed` 또는 `observed`를 선언하지 않는다.

## 역할 경계

| 행동 | 사용자 | Controller | Worker | 배포 Adapter |
|---|---:|---:|---:|---:|
| 제품·배포 결정 | 책임 | 기록 | 금지 | 금지 |
| production 승인 | 책임 | challenge 검증 | 금지 | scope 소비만 |
| 코드 구현 | 지시·검토 | 범위 통제 | 수행 | 금지 |
| 외부 배포·관측 | 승인·운영 | adapter 선택·검증 | 금지 | 선언된 범위만 수행 |
| AC 최종 판정 | 확인 | 책임 | 참고 보고 | receipt 제공 |
| Git commit | 직접 작업 시 가능 | 하네스 Step만 수행 | 금지 | 금지 |
| push/PR/merge | 별도 절차 | v1 미지원 | 금지 | 금지 |
| Run state/Event 수정 | 금지 | 전담 | 금지 | 금지 |

한 역할의 결과를 같은 역할의 주장만으로 승인하지 않는 것이 핵심 원칙이다.
