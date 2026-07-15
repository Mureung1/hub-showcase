# loop

하네스의 기본 루프는 `validate → plan → preflight → execute → verify → checkpoint → retry/approval → complete`다. Worker는 구현하고 Controller는 상태와 증거를 소유한다.

## 1. Validate와 Plan

```bash
python HARNESS/run.py validate
python HARNESS/run.py plan --target <passed|deployed|observed>
```

`validate`는 설정과 Phase 구조를 읽고 Phase·Step 수, 미설정 worker, 기본 차단 capability를 보고한다. `plan`은 target까지 선택되는 Phase, 요구 입력, approval과 현재 capability를 보여 준다. 이 두 명령은 제품 변경을 시작하지 않는다.

## 2. Preflight와 Run 생성

`start`는 저장소 전역 lock을 획득한 뒤 다음을 확인한다.

1. worktree가 tracked/untracked 변경 없이 깨끗한가
2. target에 필요한 `inputs.local.json` 값이 모두 있는가
3. 비밀 입력이 환경변수 참조이고 allowlist·redaction 목록에 등록됐는가
4. Phase 의존 순서, 경로와 acceptance check 계약이 유효한가

통과하면 run id를 만들고 현재 commit·branch, plan snapshot과 hash, 초기 state를 기록한 다음 `events.jsonl`에 `run.created`를 추가한다.

## 3. Phase와 Step 실행

Controller는 `phases/index.json` 순서대로 target에 포함된 Phase를 실행한다. 각 Step에서 다음 순서를 지킨다.

1. 필요한 capability가 로컬 설정에서 명시적으로 허용됐는지 확인한다.
2. immutable Attempt 디렉터리와 `started.json`을 만든다.
3. 일반 Step은 Worker Provider, 외부 변경은 staging adapter, production 권한은 production adapter를 허용 환경변수와 UTF-8 stdin prompt로 실행한다.
4. timeout이면 프로세스 트리를 종료하고, stdout/stderr를 제한된 크기로 redaction해 저장한다.
5. Worker가 HEAD를 바꾸지 않았는지, 변경이 `allowed_paths` 안에만 있는지 검사한다.
6. 필수 artifact와 acceptance check를 Controller가 별도 프로세스로 실행한다.
7. 모두 통과하면 승인된 변경 경로만 stage하고 Controller가 Step commit을 만든다.
8. `attempt.json`, Failure update, Event와 `state.json`을 원자적으로 기록한다.

Worker stdout의 JSON 보고와 success claim은 기록만 한다. Step 통과 여부는 Controller 검증 결과로만 결정한다.

## 4. 상태 전이

```text
Run:  pending → running → passed | deployed | observed
                    ├→ retry_wait → running
                    ├→ blocked → resume → running
                    ├→ interrupted → resume → running
                    └→ failed

Step: pending → running → passed
                    ├→ retry_wait → running
                    ├→ blocked
                    ├→ interrupted
                    └→ failed
```

- `passed`: 필요한 구현·품질 Phase가 독립 검증을 통과했다.
- `deployed`: 스테이징 Phase까지 통과했다.
- `observed`: 승인된 프로덕션 배포와 관찰 인계까지 통과했다.
- `blocked`: 설정, capability, approval, 범위 위반이나 남은 변경처럼 사람이 먼저 해결할 일이 있다.
- `failed`: 자동 재시도 한도를 소진했거나 재개 대상이 아닌 최종 실패다.

## 5. Retry와 Failure 기록

재시도는 Phase의 `retry_policy`를 따른다. timeout, network, rate limit 등 허용 category이고 Worker가 파일이나 HEAD를 바꾸지 않은 경우에만 자동 재시도한다. 외부 부작용 Step은 outcome 불명확과 중복 실행을 막기 위해 자동 재시도하지 않는다. 각 시도는 `attempt-001`, `attempt-002`처럼 새 기록을 만들고 이전 Attempt와 Failure를 수정하지 않는다.

Failure는 관측 사실, 원인 평가, 증거, 처분을 분리한다. 후속 Attempt가 통과하면 새 Attempt의 `failure_updates`와 Event로 해결 사실을 추가한다. Agent 설명만으로 원인을 confirmed 처리하지 않는다.

## 6. Resume

```bash
python HARNESS/run.py status --run <run-id>
python HARNESS/run.py resume --run <run-id>
```

중단 시 먼저 `state.json`의 `blocked`, `safe_to_resume`, `open_failure_ids`와 해당 Failure를 확인한다. 설정·입력·capability·approval blocker는 해결 후 같은 Run을 resume한다. Controller는 시작됐지만 완료 기록이 없는 Attempt를 `interrupted` 기록으로 만들고, Attempt가 먼저 서명된 경우에는 checkpoint blob과 대조해 상태를 복구한다.

Controller는 남은 변경을 stash, reset, 삭제하지 않는다. `safe_to_resume:false`, 범위 위반, 무단 HEAD·Git 제어면 변경이나 부분 변경으로 막혔다면 증거와 diff를 보존하고 원인을 수정한 뒤 새 `start`로 실행한다. `failed`도 최종 상태다.

## 7. Production approval과 완료

Phase 08 직전에는 commit·plan·artifact·target·adapter digest에 묶인 `production-release` approval이 필요하다. challenge 확인, approve, resume 순서를 지킨다. Production adapter receipt도 같은 scope를 증명해야 한다. 마지막 Phase까지 통과하면 Controller가 current pointer를 비우고 target stage를 Run 최종 상태로 기록한다.
