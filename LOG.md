# LOG

## 현재 상태

- 제품 기준: `docs/PRD.md`
- 생산 스택: ADR-0002 — React+TypeScript+Vite / Supabase(로컬 CLI+Docker). 구현은 아직 시작 전
- 구현 상태: `prototype/index.html`, `prototype/styles.css`로 만든 정적 HTML·CSS 프로토타입
- 구현 범위: 실제 AI, 저장소, 배민 연동, 자동 게시 없이 화면 흐름만 시연
- 하네스 상태: 기능 단위 Phase(00 공통 기반 + 01~05 MVP 기능 + 06 통합 검증)로 재설계함. 기준 문서는 `HARNESS/phases/PHASE_PLAN.md`, phase.json 재생성과 실행은 Codex 대기. 제품 구현 자체는 아직 시작 전

## 최근 작업

### 2026-07-23

- 화면 배정 점검에서 ① 홈 대시보드(PRD 4.2)와 공통 사이드바 6메뉴 셸이 어느 Phase Step에도 없던 갭을 발견해 반영했다. 홈은 새 도메인 기능이 아니라 리뷰·분류·분석 데이터를 모으는 종합 대시보드이므로, 데이터가 모두 준비되는 Phase 4에 전용 Step `home-dashboard`를 신설했다(⑤ 리포트 `report-ui`와 분리). Phase 4는 Step 3개가 됐다.
- 공통 앱 셸(좌측 사이드바 6메뉴 + 상단바 매장명 + 라우팅)을 Phase 0 `stack-scaffold` 골격에 명시했다. 모든 화면이 이 셸의 라우트에 연결되고 홈이 기본 진입 화면이 된다. 이로써 화면 7개가 모두 Phase Step에 배정돼 빈 자리가 없다.
- 갱신 파일: `HARNESS/phases/PHASE_PLAN.md`(Phase 목록·Phase 0·Phase 4), `00-foundation/prompt.md`, `04-review-analysis/prompt.md`, `docs/CODE_MAP.md`(features 트리 `home/`, `shared` 앱 셸).
- 역할 결정(사용자): 프론트엔드는 Claude가 하네스 Step 2 방식으로 담당한다 — 각 UI Step의 `prompt.md`를 Claude가 작성하고 Codex가 하네스로 실행·구현한다. 스택 React+TS+Vite, 스타일링은 프로토타입 CSS 이식, 데이터는 mock 먼저.
- 홈 반영 후 전체 md 정합성 점검: 홈·앱 셸은 계획/prompt/CODE_MAP/TODO에 일관 확인. 루트 README의 MVP 목록을 PRD 2.1~2.5 순서·명칭(톤앤매너)으로 정렬하고 하네스 소개의 "배포 인계" 잔재를 제거했다. HARNESS/README·CODE_MAP의 Phase 범위 표기에 06 검증을 반영하고, `run.py`·`tests/` 소스가 md 워크트리에 없다는 주석을 HARNESS/README·CODE_MAP·TEST_PLAN에 추가했다. LOG 열린 이슈를 현재 상태(스택 확정, LLM 공급자만 미정, 배포는 제품 Phase 2 이후)로 갱신했고, 홈→⑥ 대응 센터 링크가 Phase 5 완성 전까지 자리표시자 라우트임을 04 prompt에 명시했다.
- 외부 지적 검증: `config.local.json`의 `worker.argv`(`python -B HARNESS/local_worker.py`)가 저장소에 없는 파일을 가리키는 죽은 참조임을 확인했다(전체 검색 0건, `run.py`·`tests/`와 같은 계열의 워크트리 누락). JSON 수정은 역할 분담상 Codex 몫이므로 파일은 건드리지 않고 `TODO.md`의 Codex 마이그레이션 목록에 사전 작업 2번으로 명시했다.

### 2026-07-22

- 하네스 Phase 구조를 라이프사이클(00 탐색~08 프로덕션 인계)에서 기능 단위(00 공통 기반 + 01~05 MVP 기능 5개)로 재설계했다. 단일 기준 문서로 `HARNESS/phases/PHASE_PLAN.md`를 추가하고 새 Phase 폴더에 `prompt.md`를 작성했다.
- MVP 5개 기능(리뷰 유형 분류, 톤앤매너, 답글 초안 생성, 리뷰 분석, 블랙컨슈머 대응)을 PRD 2.1~2.5와 1:1로 Phase 1~5에 대응시켰다. 리뷰 수동 입력과 앱 골격은 기능이 아닌 Phase 0 공통 기반으로 정리했다.
- S1~S4 통합 검증을 Phase 5의 마지막 step에서 분리해 전용 Phase 6(`06-mvp-verification`)으로 재구성했다. Phase 6은 `backend`/`frontend`를 `allowed_paths`에 두지 않아 기능 코드를 직접 고칠 수 없고, 결함 발견 시 해당 기능 Phase(1~5)로 돌아가 수정하도록 명시했다. "완주(00~06) = 실행 가능한 프로젝트 완성"은 이제 Phase 6 통과로 보장된다.
- `AGENTS.md`를 개정했다(규칙 1~16): MVP 5개 기능 명시, 기능 1개 = Phase 1개, 기능 위주 폴더 트리, 완주 시 프로젝트 완성 규칙을 추가했다.
- `docs/CODE_MAP.md`에 기능 위주 폴더 트리(backend/frontend `features/<기능>` + 최소 `shared`)를 Phase 대응과 함께 확정했다.
- 배포(스테이징·프로덕션) Phase는 현재 계획에서 제외하고 제품 Phase 2 이후로 미뤘다. HARNESS 운영 문서(README, context, done, gates, roles, router)의 구 Phase(00~08) 참조를 전부 새 구조로 갱신했다.
- phase.json·index.json 재생성(00~06 총 7개 Phase), 구 Phase 폴더 9개 삭제, 하네스 실행은 역할 분담에 따라 Codex 작업으로 `TODO.md`에 남겼다. 그때까지 구·신 Phase 폴더가 함께 있는 과도기 상태는 의도된 것이다.
- 생산 스택을 사용자 결정으로 확정하고 `docs/adr/ADR-0002-생산-스택.md`를 작성했다: React+TypeScript+Vite / Supabase(로컬 CLI+Docker) / LLM 호출은 Edge Functions에서만 / 이메일 로그인+RLS 매장 격리 포함. ADR-0001은 대체됨으로 표시했다.
- `PHASE_PLAN.md`와 Phase prompt 7개를 새 스택 기준으로 다시 썼다: FastAPI·PostgreSQL·pytest 기준을 제거하고 Edge Functions(`classify-review`/`generate-reply`/`assess-risk`), `supabase/migrations`+RLS, Vitest·fake LLM 모드 중심으로 재정의했다. `docs/ARCHITECTURE.md`, `docs/CODE_MAP.md`, `docs/TEST_PLAN.md`도 같은 기준으로 갱신했다.
- 저장소 정리(사용자 지시): 구 라이프사이클 Phase 폴더 9개와 구 `phases/index.json`을 삭제했다(로컬 전용 json은 세션 스크래치패드에 백업 후). 빈 `.writetest`, `.pytest_cache/`, `__pycache__` 3곳(소스가 남아 있지 않은 `HARNESS/tests/` 포함)도 제거했다. `phases/`에는 새 Phase 7개와 `PHASE_PLAN.md`만 남았다.
- 보존한 것: `HARNESS/bin/`·`worker_steps/`(빈 폴더), `config.local.json`, `inputs.local.json`, `runs/`의 실행 기록 1건(20260716T100652Z) — Codex 영역. 참고로 `HARNESS/run.py` 진입점과 `tests/` 소스는 현재 md 워크트리에 없다(엔진 소스는 있음). 실행 브랜치 쪽 상태는 Codex가 확인한다.

### 2026-07-17

- 문서 정리: 구버전 Stitch 디자인 프롬프트 아카이브(`docs/stitch_design_PRD.md`)를 저장소에서 제거하고(사용자가 폴더 밖으로 이동) `docs/CODE_MAP.md`, `HARNESS/context.md`의 관련 참조를 삭제했다.
- `README.md`의 깨진 `docs/기획서.md` 링크를 `docs/PRD.md`로 고치고, 저장소 구조 트리와 "하네스 구조 초안(작성 중)" 문구를 현재 상태에 맞게 갱신했다.
- HARNESS 운영 문서의 중복을 제거했다. validate/plan/status/approval 명령 블록과 target 범위 표는 `HARNESS/README.md` 3·4장을 단일 기준으로 두고 `router.md`, `loop.md`, `done.md`는 참조로 바꿨다. 읽기 순서는 `HARNESS/README.md`, 작업별 Context 표는 `context.md`, 실행 기록 구조는 `runs/README.md`가 각각 단일 기준이다.
- 파일 단위 통합·삭제는 하지 않았다. HARNESS 7개 운영 문서 구조는 유지했고, `docs/domain/`·`docs/implementation/`·`docs/adr/`는 하네스 Phase 계약(`phase.json`의 artifact·acceptance check)이 경로·내용을 참조하므로 건드리지 않았다.

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

- LLM 공급자가 아직 확정되지 않았다. 하네스 입력 `llm-provider`로 주입하며, 확정 전에는 `fake` 모드로 전체 루프를 돌릴 수 있어야 한다. 나머지 스택은 ADR-0002로 확정됐다.
- 현재 프로토타입은 `:target` 기반 화면 전환만 제공하므로 실제 상태 저장·입력 처리·분석 로직은 Phase 0~5의 구현 대상이다.
- phase.json·index.json 생성과 하네스 실행 준비(Docker Desktop, supabase CLI, Provider 명령, `HARNESS_JOURNAL_KEY`, 입력·capability)가 남았다. `run.py` 진입점과 `tests/` 소스가 현재 md 워크트리에 없어 하네스 진입점 위치 확인도 필요하고, `config.local.json`의 `worker.argv`도 삭제된 `local_worker.py`를 가리키는 죽은 참조라 교체가 필요하다.
- 배포(스테이징·프로덕션)와 전용 배포 adapter·signed receipt는 제품 Phase 2 이후로 미뤘다.
- 하네스는 OS 수준 sandbox가 아니므로 Provider의 파일·명령·네트워크 권한 제한을 별도로 적용해야 한다.
