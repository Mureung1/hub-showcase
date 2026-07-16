# LOG

## 현재 상태

- 제품 기준: `docs/PRD.md`
- 구현 상태: `prototype/index.html`, `prototype/styles.css`로 만든 정적 HTML·CSS 프로토타입
- 구현 범위: 실제 AI, 저장소, 배민 연동, 자동 게시 없이 화면 흐름만 시연
- 하네스 상태: PRD 기반 Phase를 순차 실행·검증·기록하는 오케스트레이션과 정적 프로토타입 회귀 검증을 추가함. 제품 구현 자체는 아직 시작 전

## 최근 작업

### 2026-07-16

- 에이전트 공통 규칙을 `CLAUDE.md`에서 `AGENTS.md`로 옮겼다. Codex가 자동으로 읽는 표준 파일명에 맞춰 Claude와 Codex가 같은 규칙을 보게 했다.
- `CLAUDE.md`는 `@AGENTS.md` import 한 줄만 남겨 규칙이 한 곳에서만 관리되게 했다.
- 협업 규칙(9~14)을 추가했다: 문서는 Claude, 실행·로그는 Codex 담당 / GitHub에는 md만 푸시, 제품 빌드·실행 기록은 로컬 전용 / 하네스 실행은 푸시하지 않는 로컬 브랜치에서 / 커밋·푸시는 명시 요청 시에만.
- `HARNESS/README.md`, `HARNESS/context.md`의 CLAUDE.md 참조를 AGENTS.md로 갱신했다.
- `HARNESS/tests/test_prototype.py`를 추가해 필수 화면과 fragment 링크, 로컬 자산, 리뷰 입력·분류·답글 복사·직접 게시·완료 흐름을 자동 검증했다.
- 악성 대응 4단계와 법률 자문 아님 고지, 자동 신고·게시 금지, 매장 프로필과 Phase 2 비활성 경계, 본문 바로가기·반응형 breakpoint·인쇄 CSS 기본 조건을 회귀 테스트로 고정했다.
- `python -B HARNESS/run.py validate`가 통과했고, 전체 하네스 테스트는 55개 통과·1개 스킵이었다. 스킵 1개는 현재 Windows 환경에서 디렉터리 심볼릭 링크를 만들 수 없어 제외된 경로 탈출 테스트다.
- 자동 검증은 HTML·CSS의 정적 계약만 확인한다. 실제 브라우저의 시각 품질, 모바일 배치와 클릭 흐름 검증은 아직 남아 있다.
- 실제 앱·API·DB·AI 구현은 시작하지 않았다. 하네스 변경 실행 전 clean worktree, Worker 설정, `HARNESS_JOURNAL_KEY`, LLM 입력과 필요한 network capability 설정이 필요하다.

### 2026-07-15

- `HARNESS/engine/`에 Controller 소유 상태 전이, 독립 검증, 제한된 재시도, 정확한 경로의 Git 체크포인트를 추가했다.
- `HARNESS/phases/`에 탐색, 계약, 아키텍처, MVP 구현, AI 안전, UX, 운영 준비, 스테이징, 프로덕션 인계의 `00`~`08` 실행 순서를 정의했다.
- 실행별 상태, 이벤트, 승인, Attempt와 Failure를 `HARNESS/runs/{run-id}/`에 기록하고, 실패 현상·원인 가설·증거·조치·재검증·처분을 분리하도록 했다.
- 비밀정보 redaction, 서명된 이벤트·상태·승인, 실행 잠금, clean worktree, 보호 경로·명령 검증과 프로덕션 승인 게이트를 추가했다.
- 무단 Git commit/제어면 변경 후 재개 차단, Controller 예외 Failure 완결, 상태 이벤트 전 중단 복구와 bounded stdin/process-tree 종료 회귀 검증을 추가했다.
- 일반 Worker와 staging/production adapter를 분리하고, adapter 실행 파일 SHA-256·sandbox profile·승인 scope·signed receipt가 일치해야 배포가 통과하도록 계약을 강화했다.
- 기본 Worker 명령과 network·external side effects·production capability는 비활성 상태로 유지했다.
- 실제 제품 코드는 여전히 정적 프로토타입뿐이며, 하네스 구축을 앱·API·DB·AI 또는 배포 완료로 간주하지 않는다.

### 2026-07-10

- PRD를 기준으로 문서 구조를 정리했다.
- 실제 구현 스택이 아직 확정되지 않았으므로 앱 소스 폴더는 만들지 않았다.
- `docs/`에 아키텍처, 코드 맵, UI 기준, 테스트 계획, 용어, 주의사항, ADR 문서를 추가했다.
- `HARNESS/`에 작업 분류, 컨텍스트 선택, 루프, 역할, 게이트, 완료 기준 문서를 추가했다.

## 열린 이슈

- 생산용 프론트엔드·백엔드·DB·AI 연동 방식이 아직 결정되지 않았다.
- 현재 프로토타입은 `:target` 기반 화면 전환만 제공하므로 실제 상태 저장·입력 처리·분석 로직은 별도 구현이 필요하다.
- 하네스를 실행하려면 Agent Provider 명령, `HARNESS_JOURNAL_KEY`, 단계별 입력과 비밀 환경변수, 필요한 capability를 로컬에서 설정해야 한다.
- 스테이징·프로덕션 대상, 도메인, 모니터링·헬스체크, 롤백 및 운영 책임이 아직 결정되지 않았다.
- 선택한 플랫폼용 전용 배포 adapter와 signed receipt 저장소·검증 키가 아직 구현되지 않았다.
- 하네스는 OS 수준 sandbox가 아니므로 Provider의 파일·명령·네트워크 권한 제한을 별도로 적용해야 한다.
