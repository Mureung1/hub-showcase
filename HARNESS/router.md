# router

요청을 받으면 제품 작업 유형과 하네스 target을 함께 분류한다. HARNESS의 `00~08`은 개발 실행 순서이며 PRD의 “제품 Phase 2”와는 다른 번호 체계다.

## 요청 유형

| 유형 | 판단 기준 | 기본 처리 |
|---|---|---|
| 답변·설명 | 코드 변경 없이 설명, 비교, 판단을 요청 | 근거 문서를 읽고 답변 |
| 질문 정리 | 요구사항이나 외부 결정이 실제로 없으면 진행 불가 | 필요한 결정과 안전한 기본값 보고 |
| 문서·ADR | PRD, README, 설계, 의사결정 기록 변경 | 관련 문서와 검증 |
| UI | 화면, 문구, 레이아웃, 접근성 변경 | UI Context와 브라우저 검증 |
| 기능 구현 | 입력, 분류, 답글, 분석 등 실제 동작 | `passed` 계획과 코드·테스트 |
| 품질·리스크 | 테스트, 보안, 개인정보, AI 안전 진단 | Phase 04·06 수준의 독립 검증 |
| 스테이징 릴리스 | 배포 가능한 환경과 E2E 확인 | `deployed` target |
| 서비스 완성 | 처음부터 프로덕션 배포·관찰까지 요청 | `observed` target + 명시 승인 |

작은 읽기 전용 답변은 전체 Run을 만들 필요가 없다. 여러 Phase에 걸친 구현, 자동 재개, 릴리스 증거가 필요한 요청은 하네스를 사용한다.

## Target 라우팅

| 사용자 의도 | target | 실행 범위 |
|---|---|---|
| “구현과 production readiness까지” | `passed` | Phase 00~06 |
| “스테이징에 배포하고 검증” | `deployed` | Phase 00~07 |
| “처음부터 서비스 완성·운영 확인” | `observed` | Phase 00~08 |

시작 전 항상 다음을 먼저 실행한다.

```bash
python HARNESS/run.py validate
python HARNESS/run.py plan --target <target>
```

`plan`의 missing input, worker 설정, capability와 approval을 검토한 뒤 clean worktree에서 `start`한다.

## 제품 범위 라우팅

### PRD와 충돌할 때

- `docs/PRD.md`를 우선한다.
- 사용자가 의도적으로 제품 기준 변경을 요청한 경우에만 PRD와 관련 계약을 함께 바꾼다.
- 자동 게시, 법률 판단, 개인정보 확대처럼 위험한 충돌은 합리적 가정으로 넘기지 않는다.

### MVP와 제품 Phase 2가 섞일 때

- MVP 요청이면 제품 Phase 2 기능을 제외한다.
- 자동 수집, 자동 게시, 알림, 멀티 플랫폼은 기본적으로 제품 Phase 2다.
- 명시 요청이 있어도 플랫폼 약관, 자격증명, 개인정보, rollback 전제부터 검토한다.

### 악성 리뷰·법률·개인정보가 포함될 때

- `docs/GOTCHAS.md`, `docs/UI_GUIDE.md`, 관련 ADR을 Context에 넣는다.
- 자동 신고, 자동 게시, 자동 법적 판단과 법률 자문처럼 보이는 문구를 만들지 않는다.
- 필요한 capability와 외부 side effect를 Phase 계약에 드러내고 기본 deny를 유지한다.

## 실행 문제 라우팅

| 상태·Failure | 처리 |
|---|---|
| worker 미설정 | `config.local.json`에 비대화형 Provider argv를 설정한 뒤 `resume` |
| 필수 입력 누락 | `inputs.local.json`과 환경변수를 보완한 뒤 `resume` |
| capability 차단 | 위험을 검토하고 필요한 항목만 로컬 설정에서 연 뒤 `resume` |
| production approval | challenge의 commit·digest를 확인하고 approve한 뒤 `resume` |
| timeout/network/rate limit | 변경이 없고 retry policy가 허용하면 Controller가 자동 재시도 |
| adapter/sandbox 미설정 | 전용 실행 파일 digest와 실제 sandbox profile을 설정한 뒤 안전한 blocker만 `resume` |
| scope/HEAD/Git control/checkpoint 위반 | diff와 Failure를 보존·검토하고 원인을 수정한 뒤 새 `start` |
| `interrupted` | `resume`이 미완료 Attempt를 기록하고 새 Attempt로 계속 |
| 최종 `failed` | 원인을 수정한 뒤 새 `start`; 완료 Run으로 간주하지 않음 |

Controller는 blocker를 해결하기 위해 사용자 변경을 삭제, stash, reset하거나 capability를 스스로 열지 않는다.

## Approval 라우팅

프로덕션은 capability와 approval을 구분한다. `production: true`는 SHA-256으로 고정된 production adapter 종류를 로컬에서 허용한다는 뜻일 뿐 배포 승인이 아니다. 일반 Worker에는 production credential이나 배포 권한을 주지 않는다.

```bash
python HARNESS/run.py approval-challenge --run <run-id> --approval-id production-release
python HARNESS/run.py approve --run <run-id> --approval-id production-release --approved-by <name>
python HARNESS/run.py resume --run <run-id>
```

승인은 특정 Run, approval id, Phase, commit, plan, artifact, target과 adapter digest에만 유효하며 signed receipt가 같은 scope를 증명해야 한다. v1 Controller는 성공 후 자동 push, PR 또는 merge를 하지 않으므로 필요한 Git 전달 작업은 별도 승인된 절차로 라우팅한다.
