# LocalTwin Failure Log

반복 가능한 실패, 사용자 피드백으로 수정된 방향, 검증 누락을 기록한다.

목적:

```text
실패를 개인 blame으로 남기지 않는다.
반복되는 문제를 harness guardrail로 바꾼다.
다음 개발자가 같은 실수를 피하게 한다.
```

## Template

```text
Date:
Task:
Issue:
Cause:
Fix:
Harness update:
Follow-up:
```

## Entries

### 2026-07-09

```text
Task:
Vercel 문서 허브와 PR 복구

Issue:
PR CI가 존재하지 않는 astral-sh/setup-uv@v8 tag에서 중단됐고,
local scripts/check.ps1는 pnpm check 실패 후에도 성공 문구와 exit code 0을 반환했다.

Cause:
setup-uv의 v8.1.0 release를 floating major tag v8로 가정했다.
PowerShell의 ErrorActionPreference가 native command의 non-zero exit code도 예외로 만든다고 가정했다.

Fix:
setup-uv v8.1.0의 공식 commit SHA를 pin했다.
check.ps1의 모든 native command를 Invoke-Checked로 실행해 non-zero exit code에서 즉시 실패시켰다.

Harness update:
CI action reference는 remote tag 또는 공식 release SHA 존재를 확인한다.
검증 entrypoint는 의도적인 실패 command로 non-zero propagation을 sanity check한다.

Follow-up:
GitHub required checks와 branch protection을 설정해 local hook 우회를 원격에서 차단한다.
```

현재 상태 (2026-07-10): 위 Follow-up은 당시 기록이다. Hub 제출 규칙에 따라 GitHub Actions workflow 파일을 제거했으며, 현재 검증 기준은 [Validation Guide](../development/validation.md)의 로컬 검사와 PR 리뷰다.

### 2026-07-08

```text
Task:
LocalTwin docs portal UI

Issue:
문서 사이트가 제안서형 랜딩 페이지처럼 보이고, 디자인 참고 링크가 너무 크게 노출됐다.

Cause:
문서 홈의 목적을 "각 문서로 들어가는 위키 홈"보다 "제안서/브리프" 중심으로 잡았다.

Fix:
문서 그룹 카드와 폴더 트리 중심의 홈으로 재구성하고, 디자인 참고는 footer details로 축소했다.

Harness update:
UI/문서 홈 변경 작업은 screenshot 검증과 사용자 목적 문장 확인을 task packet에 포함한다.

Follow-up:
문서 홈 task packet 템플릿에 "page role"과 "primary reader action" 항목 추가를 검토한다.
```
