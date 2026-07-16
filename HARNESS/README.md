# HARNESS

이 폴더는 PRD에서 출발해 설계, 구현, 품질 검증, 스테이징, 프로덕션 관찰까지 이어지는 작업을 재현 가능하게 실행하는 로컬 하네스다. 제품 코드가 아니라 Provider-independent Controller, Phase 계약, 실행 기록과 운영 규칙을 담는다.

Worker Agent의 “완료했습니다”라는 응답은 참고 정보일 뿐이다. 최종 상태, 검증, Git 체크포인트와 재시도 여부는 `HARNESS/engine/controller.py`가 결정한다.

## 문서 우선순위

작업을 시작할 때 다음 순서로 읽는다.

1. `AGENTS.md` — 모든 에이전트 공통의 짧고 변하지 않는 최상위 규칙
2. `docs/PRD.md` — 제품 목표, MVP, 제외 범위, 완료 조건
3. `docs/ARCHITECTURE.md` — 도메인 구조와 데이터 흐름
4. `docs/CODE_MAP.md` — 현재 코드와 향후 코드 책임
5. 작업 성격에 맞는 세부 문서
   - UI: `docs/UI_GUIDE.md`
   - 검증: `docs/TEST_PLAN.md`
   - 리스크: `docs/GOTCHAS.md`
   - 용어: `docs/GLOSSARY.md`
6. 이 폴더의 하네스 문서와 해당 Phase의 `phase.json`, `prompt.md`

## 폴더 구조

```text
HARNESS/
├─ run.py                    # validate/plan/start/resume/status/approval CLI
├─ config.json               # 커밋되는 안전 기본값
├─ config.local.example.json # 로컬 Provider 설정 예시
├─ inputs.example.json       # 입력 작성 참고 자료
├─ engine/
│  ├─ controller.py          # 상태 전이, 실행, 검증, 재시도, 체크포인트
│  ├─ specs.py               # Phase·경로·명령·입력 계약 검증
│  └─ io.py                  # 원자적 기록, 잠금, redaction, HMAC 이벤트 체인
├─ contracts/                # Phase, Run state, Attempt, Failure, Event JSON 계약
├─ phases/
│  ├─ index.json             # 00~08 Phase 실행 순서
│  └─ {phase-id}/
│     ├─ phase.json          # Step, 권한, 허용 경로, AC, retry, approval
│     └─ prompt.md           # Worker에게 전달할 작업 지시
├─ tests/                    # Controller 안전 장치와 프로토타입 계약 회귀 테스트
├─ runs/                     # Git에 넣지 않는 로컬 실행 기록
└─ FAILURE_RECORDS.md        # 실패 관측·진단·처분 기록 원칙
```

각 실행은 `HARNESS/runs/{run-id}/` 아래에 `plan.json`, `state.json`, `events.jsonl`, `approvals.json`, `attempts/{phase}/{step}/attempt-NNN/`, `failures/failure-*.json`을 남긴다. `state.json`은 현재 투영본이고 Attempt와 Failure는 완료 후 덮어쓰지 않는다.

## 1. Provider 설정

`HARNESS/config.json`은 직접 완화하지 않는다. `HARNESS/config.local.example.json`을 참고해 Git에서 제외되는 `HARNESS/config.local.json`을 만든다.

```json
{
  "integrity": {
    "environment_key": "HARNESS_JOURNAL_KEY",
    "key_id": "journal-v1"
  },
  "worker": {
    "argv": ["agent-cli", "--non-interactive"],
    "credential_environment": ["AGENT_API_TOKEN"],
    "environment_allowlist": ["AGENT_API_TOKEN", "LLM_API_KEY"]
  },
  "adapters": {
    "staging": {
      "argv": ["reviewjigi-deploy-adapter", "staging"],
      "adapter_id": "reviewjigi-deploy-adapter-v1",
      "executable_sha256": "sha256:<64-hex>"
    },
    "production": {
      "argv": ["reviewjigi-deploy-adapter", "production"],
      "adapter_id": "reviewjigi-deploy-adapter-v1",
      "executable_sha256": "sha256:<64-hex>"
    }
  },
  "execution_boundary": {
    "provider_sandbox_attested": true,
    "profile": "provider-specific-sandbox-profile-id"
  },
  "capabilities": {
    "network": false,
    "external_side_effects": false,
    "production": false
  },
  "redaction": {
    "environment_secret_names": ["AGENT_API_TOKEN", "LLM_API_KEY"]
  }
}
```

- `worker.argv`는 shell 문자열이 아니라 실행 파일과 인자를 분리한 배열이다. Provider는 비대화형 실행과 UTF-8 stdin prompt를 지원해야 한다.
- Worker에는 allowlist에 적은 환경변수만 전달된다. 비밀 환경변수는 반드시 redaction 목록에도 등록한다.
- 일반 Agent와 배포 실행을 분리한다. 외부 변경 Step은 `staging` adapter, production 권한 Step은 `production` adapter만 실행하며 일반 Worker credential은 adapter에 전달하지 않는다.
- adapter는 범용 Python/Node interpreter가 아닌 전용 실행 파일이어야 한다. Controller는 실행 전 실제 파일 SHA-256을 `executable_sha256`과 비교한다.
- `HARNESS_JOURNAL_KEY`에는 32바이트 이상의 무작위 비밀값을 넣고 Worker allowlist에는 절대 포함하지 않는다. Run state, Event, Attempt, Failure, Approval과 복구 트랜잭션의 변조 탐지에 쓰인다.
- `network`, `external_side_effects`, `production`은 기본 `false`다. `plan`을 확인한 뒤 필요한 capability만 로컬 설정에서 명시적으로 연다.
- `provider_sandbox_attested`는 실제 sandbox를 대신하는 기능이 아니라 운영자의 명시적 증명이다. 해당 profile에서 저장소 밖 파일, 허용되지 않은 명령과 네트워크 권한을 Provider·OS가 실제로 차단해야 network/외부 Step이 열린다.

## 2. 실행 입력

`python HARNESS/run.py plan --target <stage>`가 보고하는 `missing_inputs`를 기준으로 Git에서 제외되는 `HARNESS/inputs.local.json`을 만든다. key는 Phase 계약에 정의된 이름을 최상위에 둔다.

```json
{
  "llm-provider": "configured-provider",
  "llm-api-key": {"environment": "LLM_API_KEY"}
}
```

비밀값을 JSON에 직접 쓰지 않는다. `{"environment":"ENV_NAME"}` 참조만 쓰며, 해당 이름은 worker allowlist와 redaction 목록에 모두 있어야 하고 실행 환경에도 실제 값이 설정돼 있어야 한다. `deployed`와 `observed`는 스테이징·프로덕션 대상 및 자격증명을 추가로 요구한다.

## 3. 기본 명령

저장소 루트에서 실행한다.

```bash
python HARNESS/run.py validate
python HARNESS/run.py plan --target passed
python -B -m unittest discover -s HARNESS/tests -v
python HARNESS/run.py start --target passed

python HARNESS/run.py status --run <run-id>
python HARNESS/run.py resume --run <run-id>
python HARNESS/run.py verify-journal --run <run-id>
```

| target | 포함 범위 | 성공 상태 |
|---|---|---|
| `passed` | 00~06: 탐색, 계약, 구현, 안전·UX·production readiness | `passed` |
| `deployed` | `passed` + 07 스테이징 배포·검증 | `deployed` |
| `observed` | `deployed` + 08 프로덕션 배포·관찰 인계 | `observed` |

`validate`는 Phase·설정 계약을 확인하고, `unittest discover`는 Controller 회귀와 `prototype/index.html`·`prototype/styles.css`의 정적 MVP 계약을 확인한다. 프로토타입 자동 검사는 실제 브라우저의 시각·클릭·반응형 검증을 대체하지 않는다.

`start`와 `resume`은 tracked/untracked 변경이 하나도 없는 clean worktree만 허용한다. Controller는 사용자 변경을 stash, reset하거나 실행 변경에 흡수하지 않는다. 한 번에 하나의 변경 실행만 가능하며 각 성공 Step은 승인된 정확한 경로만 자동 commit한다.

## 4. 프로덕션 승인

`observed` 실행은 `08-production-handoff` 직전에 `production-release` 승인을 요구한다. 먼저 challenge의 run, commit, artifact digest를 확인한 뒤 승인한다.

```bash
python HARNESS/run.py approval-challenge --run <run-id> --approval-id production-release
python HARNESS/run.py approve --run <run-id> --approval-id production-release --approved-by <name>
python HARNESS/run.py resume --run <run-id>
```

승인은 기본 120분 동안 유효하며 현재 commit, 고정된 plan snapshot, source tree, immutable artifact digest, target/domain/monitoring, production adapter ID·실행 파일 digest와 receipt 검증 키·저장소에 묶인다. Production adapter가 남긴 receipt의 동일 필드와 `approval_scope_digest`가 다르면 Controller가 배포 성공을 거부한다. 승인 없이 프로덕션 capability만 켜도 Phase 08은 진행되지 않는다.

## 실행 원칙

- `validate → plan → start` 순서로 시작하고, 중단 뒤에는 `status`와 Failure 기록을 확인한 후 `resume`한다.
- Worker는 commit, push, 승인, 하네스 상태 수정을 하지 않는다.
- Controller가 worker 종료 코드, HEAD 변경, 허용 경로, 필수 산출물과 acceptance check를 독립 검증한다.
- Run은 마지막 Controller-owned HEAD와 Git config·index·refs·hooks·attributes 해시에 묶인다. Worker가 commit하거나 Git 제어면을 바꾼 실행은 자동 reset하지 않고 재개를 거부한다.
- 재시도는 기존 Attempt를 고치지 않고 새 Attempt를 만든다. 모든 상태 전이는 HMAC 해시 체인 `events.jsonl`에 추가하며, 이벤트와 상태 사이의 중단은 서명된 WAL로 복구한다.
- 외부 부작용 Step은 outcome 불명확 시 중복 실행하지 않도록 항상 1회이며 자동 retry가 없다.
- 원시 비밀정보를 입력·prompt·로그·Failure 기록에 남기지 않는다.

## 알려진 v1 제약

- 하네스는 OS 수준 sandbox가 아니다. 로컬 Provider의 도구 승인, 파일 경로, shell, 네트워크 권한은 Provider 설정에서 별도로 제한해야 한다.
- 저장소에는 실제 배포 adapter 구현이 포함되어 있지 않다. 대상 클라우드·호스팅을 정한 뒤 receipt 계약을 구현한 전용 adapter를 별도로 공급하고 digest를 설정해야 `deployed`/`observed`가 진행된다.
- 알려진 비밀값과 일반적인 비밀 패턴은 저장 전에 정제하지만 임의 형식의 비밀을 모두 자동 탐지한다고 보장하지 않는다. Worker에는 단계에 필요한 최소 비밀만 전달한다.
- Controller는 정확한 경로의 로컬 auto-commit만 수행한다. auto-push, PR 생성, merge는 하지 않는다. `config.json`의 `auto_push`도 기본 `false`다.

세부 책임은 `router.md`, 컨텍스트 구성은 `context.md`, 실행 상태 전이는 `loop.md`, 역할 분리는 `roles.md`, 강제 검증은 `gates.md`, 완료 판정은 `done.md`를 따른다.
