# context

Context는 Worker가 임의로 저장소 전체를 읽게 하는 목록이 아니라, Phase 계약에 선언하고 Controller가 해시로 고정하는 실행 입력이다. 제품 기준은 항상 `docs/PRD.md`가 우선한다.

## 사람이 먼저 읽을 기준 문서

모든 제품 관련 작업은 다음부터 확인한다.

- `CLAUDE.md`
- `docs/PRD.md`
- `HARNESS/README.md`

작업별 추가 문서는 다음과 같다.

| 작업 | 추가 Context |
|---|---|
| 아키텍처·도메인 설계 | `docs/ARCHITECTURE.md`, `docs/GLOSSARY.md`, `docs/GOTCHAS.md`, 관련 ADR |
| UI·문구·프로토타입 | `docs/UI_GUIDE.md`, `docs/CODE_MAP.md`, `prototype/index.html`, `prototype/styles.css` |
| 테스트·검증 | `docs/TEST_PLAN.md`, `docs/CODE_MAP.md`, 관련 테스트 |
| ADR | `docs/adr/README.md`, 관련 기존 ADR |
| 블랙컨슈머 대응 | `docs/PRD.md` 2.5, `docs/GOTCHAS.md`, `docs/UI_GUIDE.md` |
| 배포·운영 | Phase 06~08 계약, 배포·rollback·관찰 문서 |

`docs/stitch_design_PRD.md`는 초기 디자인 프롬프트 기록이다. 현재 기준과 다르면 `docs/PRD.md`를 따른다.

## Controller가 고정하는 Context

`start` 시 선택된 Phase와 instruction을 `runs/{run-id}/plan.json`에 snapshot하고 SHA-256을 기록한다. 각 Step은 `phase.json`의 다음 필드로 실행 범위를 고정한다.

- `instruction_file`: Worker에게 전달할 구체적 작업 지시
- `context_files`: 필요할 때 읽을 수 있는 참조 파일과 시작 시점 hash
- `allowed_paths`: Worker가 수정할 수 있는 유일한 경로 집합
- `required_artifacts`: 완료 시 반드시 존재해야 할 산출물
- `acceptance_checks`: Controller가 직접 실행할 검증
- `required_inputs`: 대상 stage에 필요한 공개 입력 또는 비밀 환경변수 참조

Worker prompt에는 instruction 본문, context 경로·hash, 허용 경로, 비밀이 아닌 입력만 포함된다. Context 파일 본문 전체를 무조건 주입하지 않으므로 Worker는 필요한 참조만 읽는다. 실행 중 원본 Phase 파일이 바뀌어도 해당 Run은 고정된 snapshot을 기준으로 재개한다.

## 입력과 비밀정보

- `HARNESS/inputs.local.json`은 Git에 넣지 않는다.
- 일반 입력은 top-level JSON 값으로 기록한다.
- 비밀 입력은 `{"environment":"ENV_NAME"}` 형식으로만 참조한다.
- `ENV_NAME`은 `config.local.json`의 worker allowlist와 redaction 목록에 모두 등록한다.
- Controller는 secret 원문 대신 사용한 input key와 전체 입력의 hash만 Run state에 기록한다.

## 읽거나 수정하지 않을 영역

기본적으로 다음은 Worker 수정 금지 영역이다.

- `.git/`
- `.env`, `.env.*`
- `HARNESS/config.json`, `HARNESS/config.local.json`, `HARNESS/inputs.local.json`
- `HARNESS/runs/`
- 현재 Step의 `allowed_paths` 밖에 있는 모든 파일

`.agents/`, 생성물, 캐시, 빌드 산출물은 Step context나 검증에 명시된 경우가 아니면 읽지 않는다. `.github/`는 CI·PR·release 작업일 때만 Context에 넣는다.

Controller는 Git status뿐 아니라 허용 경로 밖의 ignored 파일을 Controller 전용 키 기반 content digest로 전후 비교한다. 같은 크기·mtime으로 내용을 바꿔도 감지하며, Worker가 allowed path 밖을 건드리면 성공 응답과 무관하게 scope violation으로 차단한다.

## Context 변경 규칙

- 먼저 `python HARNESS/run.py validate`로 계약과 경로를 확인한다.
- `plan --target <stage>`에서 선택 Phase, 요구 입력, capability를 검토한다.
- 관련 파일을 읽기 전에는 추측으로 수정하지 않는다.
- 실행 도중 Context나 Phase 계약을 바꿔야 하면 현재 Run을 억지로 이어가지 말고 변경을 별도 검토한 뒤 새 Run을 시작한다.
