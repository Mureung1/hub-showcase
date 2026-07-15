# GitHub Flow와 병합 기준

## 브랜치와 커밋

`main`은 항상 병합 가능하게 유지한다. `feature/`, `fix/`, `docs/`, `chore/`로
시작하는 짧은 브랜치에서 작업하고 장기간 살아 있는 `develop` 브랜치는 두지 않는다.
PR 제목은 squash commit이 되므로 Conventional Commit 형식을 사용한다.

## PR 완료 기준

- 연결 Issue와 Work Record, 필요한 ADR·TS·EXP가 있다.
- 문제, 목적, 선택 이유, 영향과 rollback을 설명한다.
- 자동 CI와 변경 범위에 필요한 수동 검증이 통과한다.
- AI 위임 결과를 사람이 검토했고 설명하지 못하는 코드가 남지 않는다.
- 최소 한 명의 승인 후 수동 squash merge한다.

예약 자동 병합이나 충돌 PR 자동 종료는 사용하지 않는다. 원격 저장소에서는
`main` 직접 push 금지, 필수 status check, 승인 1명, 대화 해결, force push·삭제
금지를 권장한다. 이 규칙은 관리자가 GitHub에서 적용해야 하며 workflow가 권한을
우회하지 않는다.
