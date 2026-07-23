# done

완료는 Worker가 파일을 만들거나 성공을 보고한 순간이 아니다. Controller가 범위, 필수 산출물, acceptance check와 Git 체크포인트를 독립 검증하고 요청한 target stage에 도달한 상태다.

## Target stage

| target | 완료 의미 |
|---|---|
| `passed` | Phase 00(공통 기반)~05(MVP 기능 5개) 구현 + Phase 06(MVP 통합 검증) 완료. 현재 계획의 전체 범위 |
| `deployed` | `passed` + 스테이징 배포 Phase 완료 — 현재 계획에 배포 Phase 없음(제품 Phase 2 이후) |
| `observed` | `deployed` + 승인된 프로덕션 배포·관찰 인계 완료 — 현재 계획에 해당 Phase 없음 |

현재 계획의 기본 target은 `passed`다. 배포 Phase를 추가한 뒤 서비스 운영 확인까지 요청하면 `observed`를 쓴다. 프로덕션 side effect는 자동으로 추정하지 않으며 명시 capability, 입력과 사용자 approval이 필요하다.

## Step 완료 기준

다음을 모두 만족해야 `passed`다.

- 선택된 Worker 또는 배포 Adapter가 timeout 없이 성공 종료했다.
- Worker가 Git HEAD와 보호 경로를 변경하지 않았다.
- 모든 변경이 Step의 `allowed_paths` 안에 있다.
- 필수 artifact가 존재한다.
- 모든 required acceptance check가 Controller 실행에서 통과했다.
- 승인된 정확한 경로의 Step commit이 생성됐다. 변경이 필요 없는 Step은 빈 checkpoint가 기록됐다.
- worktree가 다시 깨끗하다.
- immutable `attempt.json`, 증거 hash와 상태 Event가 기록됐다.

Worker의 success claim이나 자체 검토만으로는 어느 항목도 생략할 수 없다.

## Phase와 Run 완료 기준

- Phase의 모든 Step이 통과해야 해당 `completion_stage`로 전이한다.
- 이전 Phase 의존성이 순서대로 완료돼야 한다.
- Run은 선택된 모든 required Phase를 통과하고 current phase·step·attempt pointer가 비워져야 한다.
- 해결되지 않은 Failure가 있으면 target 완료로 간주하지 않는다.
- `blocked`, `retry_wait`, `interrupted`, `failed`는 완료 상태가 아니다.
- `events.jsonl` journal integrity를 검증할 수 있어야 한다.

`blocked`는 필요한 설정·입력·승인 또는 사람이 검토할 변경이 남았다는 뜻이다. `safe_to_resume`이 false가 아니고 Git baseline이 유지된 설정 blocker만 같은 Run을 `resume`한다. 범위·HEAD·Git 제어면 위반과 `failed`는 원인을 수정하고 새 Run으로 다시 시작한다.

## 제품 완료 기준

- 결과가 `docs/PRD.md`의 MVP 범위와 충돌하지 않는다.
- 문서와 코드, API·도메인 계약이 서로 모순되지 않는다.
- 악성 리뷰, 법률 안내, 개인정보, 자동화 금지 규칙을 우회하지 않는다.
- 실패, 빈 상태, 확인 필요 상태가 테스트 가능하다.
- 기능·정책·구조 결정이 바뀌면 관련 문서, `TODO.md`, `LOG.md`, 필요한 ADR을 갱신한다.
- 관련 없는 사용자 변경을 흡수하지 않는다.

## 최종 확인과 보고

`status`와 `verify-journal` 명령(`README.md` 3장)으로 최종 상태와 journal 무결성을 확인한 뒤 보고한다.

최종 보고에는 다음만 명확히 남긴다.

- 도달한 target stage와 run id
- 구현·배포된 결과와 주요 commit
- Controller가 통과시킨 검증
- 해결된 Failure와 아직 열린 blocker
- v1에서 자동화하지 않는 push, PR, merge 또는 후속 운영 행동
