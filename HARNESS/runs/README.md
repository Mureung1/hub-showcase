# runs

이 디렉터리는 하네스 실행 기록을 로컬에 보관한다. 실행 기록에는 로그와 환경 정보가 포함될 수 있으므로 Git에 커밋하지 않는다.

각 실행은 다음 구조를 사용한다.

```text
runs/{run_id}/
├─ plan.json
├─ state.json
├─ events.jsonl
├─ approvals.json
├─ attempts/{phase_id}/{step_id}/attempt-001/
│  ├─ started.json
│  ├─ attempt.json
│  ├─ worker.stdout.log
│  ├─ worker.stderr.log
│  ├─ checkpoint.stdout.log
│  ├─ checkpoint.stderr.log
│  └─ checks/*.log
└─ failures/failure-*.json
```

- `plan.json`: 시작 시점의 Phase·Step·지시문 계약을 고정한 스냅샷이다.
- `state.json`: 현재 상태를 빠르게 조회하기 위한 HMAC 서명 투영본이다.
- `events.jsonl`: 순서·이전 이벤트 해시·HMAC으로 연결된 append-only 원장이다.
- `attempt.json`: 한 번의 실행·변경·검증·처분을 담는 HMAC 서명 기록이며 완료 후 덮어쓰지 않는다.
- `failure-*.json`: 관측된 현상, 원인 평가, 증거와 다음 처분을 분리한 HMAC 서명 기록이다.
- `transaction.json`은 이벤트 append와 상태 교체 사이의 중단을 복구할 때만 잠시 존재하는 서명된 WAL이다.
- 로그는 디스크에 쓰기 전에 등록된 비밀값과 알려진 비밀 패턴을 제거한다. 임의의 비밀을 자동으로 모두 식별할 수는 없으므로 Provider sandbox와 최소 환경변수 전달이 함께 필요하다.
