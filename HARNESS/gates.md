# gates

게이트는 문서 체크리스트가 아니라 Controller가 실행을 중단시킬 수 있는 계약이다. required gate 하나라도 실패하면 Step과 Phase는 완료되지 않는다.

## 1. 계약 게이트

- `python HARNESS/run.py validate`가 config, Phase index, manifest, 의존 순서, 경로와 check 형식을 읽을 수 있어야 한다.
- Phase와 Step id는 중복되지 않고 의존 대상은 앞선 항목이어야 한다.
- 각 Step은 instruction, 한 개 이상의 allowed path와 acceptance check를 가져야 한다.
- 절대 경로, `..`, ADS, 저장소 밖 경로를 계약에 넣지 않는다.
- shell command와 Python/Node inline eval을 acceptance check로 사용하지 않는다.

`worker.argv`가 비어 있거나 capability가 꺼져 있어도 `validate`는 계획 검토를 위해 warning을 낼 수 있다. 실행 전 `plan` 결과로 반드시 확인한다.

## 2. Preflight 게이트

- `start`와 `resume`, 각 Worker Attempt 시작 시 worktree가 깨끗해야 한다.
- Controller는 `require_clean_worktree` 비활성화를 허용하지 않는다.
- 대상 stage의 필수 입력이 모두 있어야 한다.
- 비밀 입력은 환경변수 참조만 허용하며 worker allowlist, redaction 목록, 실제 환경 값을 모두 요구한다.
- 저장소 전역 lock이 이미 있으면 새 변경 실행을 시작하지 않는다.
- 재개 시 HEAD와 Git config·index·refs·hooks·attributes가 마지막 Controller checkpoint의 HMAC baseline과 같아야 한다.

## 3. Capability 게이트

기본값은 모두 deny다.

| capability | 기본 | 필요한 작업 예 |
|---|---:|---|
| `network` | `false` | 의존성 설치, LLM 평가, 원격 health check |
| `external_side_effects` | `false` | 스테이징·프로덕션 배포 변경 |
| `production` | `false` | Phase 08 프로덕션 작업 |

Step이 요구한 capability를 `config.local.json`에서 명시적으로 열지 않으면 Controller가 Failure를 남기고 차단한다. network 또는 외부 작업은 실제 Provider·OS sandbox profile 증명도 요구한다. capability는 승인과 다르다. 프로덕션은 capability, 전용 adapter와 사용자 approval을 모두 요구한다.

## 4. 실행 범위 게이트

- Worker는 `allowed_paths` 밖을 수정할 수 없다.
- `.git`, `.env*`, harness config·inputs·runs는 항상 보호한다.
- Worker가 HEAD나 Git 제어면을 변경하면 차단하고 해당 Run의 자동 재개를 허용하지 않는다.
- Git status 밖의 ignored 파일도 keyed content digest 전후 비교로 감시한다.
- 범위 위반 뒤에는 자동 재시도하지 않는다. 변경을 보존해 검토한 뒤 새 Run으로 시작한다.

## 5. 독립 검증 게이트

Worker 종료 코드가 0이어도 다음을 Controller가 직접 확인한다.

- `required_artifacts`가 모두 존재하는가
- `path_exists` 대상이 존재하는가
- `content_contains`의 필수 값이 실제 파일에 있는가
- `json_valid` 대상이 UTF-8 JSON으로 읽히는가
- `command`가 timeout 없이 허용 종료 코드로 끝나는가

required check가 하나라도 실패하면 통과하지 않는다. Worker JSON의 success claim, 자체 테스트 설명, 문서상 체크 표시는 증거를 대체하지 않는다. 검증 stdout/stderr는 redaction 후 Attempt 증거로 저장한다.

## 6. Git 체크포인트 게이트

- 검증 뒤 Controller가 변경된 정확한 경로만 `git add -- <paths>`로 stage한다.
- staged path 집합이 승인된 변경 집합을 벗어나면 commit하지 않는다.
- required artifact는 실제 Git index에 있어야 하며, 검증 전후·index·HEAD blob OID가 모두 같아야 한다.
- 알려진 비밀값이나 비밀 패턴이 승인 경로에 있으면 stage 전에 차단한다.
- Step commit이 성공하고 worktree가 다시 깨끗해야 `passed`로 전이한다.
- commit 실패나 남은 변경은 checkpoint Failure로 차단한다.
- `git add -A`, 자동 stash/reset, auto-push는 사용하지 않는다.

## 7. 제품 안전 게이트

- PRD에 없는 자동 리뷰 수집·자동 답글 게시·알림·멀티 플랫폼을 임의로 추가하지 않는다.
- 악성 의심 리뷰에 자동 답글, 자동 신고, 자동 법적 판단을 만들지 않는다.
- 보상·환불 약속과 확인되지 않은 사실을 답글에 넣지 않는다.
- 법적 안내는 일반 정보로 제한하고 필요한 “법률 자문 아님” 고지를 유지한다.
- 닉네임, 주문 기록, 증거 파일과 자격증명은 최소 수집·보관 원칙을 따른다.
- UI는 한국어 존댓말, 명확한 다음 행동, 색상 외 텍스트 위험 표시, 모바일 가독성을 지킨다.

## 8. Release·Production 게이트

- `deployed`는 Phase 07의 배포와 스테이징 검증이 모두 통과해야 한다.
- 외부 부작용 Step은 1회만 실행하며 자동 retry category를 갖지 않는다.
- Phase 08은 `production` capability, SHA-256으로 고정한 production adapter와 commit·plan·source tree·artifact·target·adapter에 묶인 `production-release` approval을 모두 요구한다.
- production receipt의 revision·artifact·target/domain/monitoring·adapter·`approval_scope_digest`가 승인 challenge와 같아야 한다.
- 승인은 유효 시간 안에서만 사용하며 commit이 바뀌면 다시 받는다.
- `observed`는 프로덕션 배포뿐 아니라 health, smoke, 관찰·rollback 인계 check까지 통과해야 한다.

## 9. 기록 게이트

- Attempt와 Failure는 덮어쓰지 않는다.
- `events.jsonl`은 sequence와 이전 HMAC을 포함하는 append-only 체인이다.
- `verify-journal`이 event HMAC, 순서와 signed state tail을 검증할 수 있어야 한다.
- 비밀정보는 디스크 기록 전에 redaction하며 환경변수 이름만 허용 범위로 전달한다.
