# TODO

## 현재 작업

- 하네스를 기능 단위 Phase(0 공통 기반 + 1~5 MVP 기능 + 6 통합 검증)로 재구성하는 중이다. Phase 계획(`HARNESS/phases/PHASE_PLAN.md`)과 새 Phase 7개의 `prompt.md`는 Claude가 작성 완료했고, phase.json 마이그레이션과 실행이 남았다.
- 생산 스택은 ADR-0002로 확정됐다: React+TypeScript+Vite / Supabase(로컬 CLI+Docker) / LLM은 Edge Functions에서만 / 이메일 로그인+RLS 포함. 계획·prompt·docs에 반영 완료.
- 화면 배정 갭이던 ① 홈(→ Phase 4 `home-dashboard`)과 공통 사이드바 셸(→ Phase 0 `stack-scaffold`)을 계획·prompt·CODE_MAP에 반영 완료(2026-07-23). 화면 7개 모두 배정됐고 Phase 4는 Step 3개가 됐다.

## Codex 다음 작업 (하네스 마이그레이션)

1. 사전 준비: Docker Desktop, supabase CLI, Node.js(npm) 설치를 확인하고 `supabase start`가 동작하는지 점검한다.
2. **worker.argv 죽은 참조 해소(사전 작업)**: `config.local.json`의 `worker.argv`가 저장소에 없는 `HARNESS/local_worker.py`를 가리킨다(2026-07-23 확인, 저장소 전체에 해당 파일 없음). Worker 진입점을 복원하거나 argv를 실제 비대화형 Worker 명령으로 교체하기 전에는 `start`가 실패한다.
3. `HARNESS/phases/PHASE_PLAN.md`대로 새 Phase 7개(00~06)의 `phase.json`과 `phases/index.json`을 생성한다 (`HARNESS/contracts/phase.schema.json` 준수). 구 Phase 폴더 9개와 구 index.json은 2026-07-22에 삭제 완료됐다.
4. 하네스 `validate` 통과를 확인한다. 현재 md 워크트리에는 `run.py` 진입점과 `tests/` 소스가 없으므로(엔진 소스만 있음) 실행 브랜치 쪽 하네스 진입점을 확인해서 쓴다.
5. `config.local.json`(Worker argv, allowlist/redaction), `HARNESS_JOURNAL_KEY`, `inputs.local.json`(llm-provider, llm-api-key 환경변수 참조)을 준비한다. `llm-provider`에 `fake`를 지정하면 LLM 없이 결정적 모드로 전체 루프를 돌릴 수 있어야 한다.

## Codex 이후 작업 (Phase 순차 실행)

- 로컬 전용 브랜치의 clean worktree에서 `plan --target passed` 확인 후 `start --target passed`로 실행한다.
- 개발 루프: 기능(Phase) 1개 통과 → 실제 동작 확인 → 다음 기능. Phase 0(기반) → 1(분류) → 2(톤앤매너) → 3(답글 초안) → 4(분석) → 5(블랙컨슈머 대응) → 6(S1~S4 통합 검증).
- 실패는 Failure 기록으로 남기고 임의로 acceptance check를 완화하지 않는다. Phase 06에서 발견된 기능 결함은 해당 기능 Phase(01~05)로 돌아가 고친다.

## Claude 다음 작업 (문서)

- 프론트엔드 UI는 Claude가 하네스 Step 2 방식으로 담당한다: 각 UI Step(Phase별 Step 2와 Phase 4 `home-dashboard`)의 `prompt.md`를 Claude가 쓰고 Codex가 실행한다. 스택 React+TS+Vite, 프로토타입 CSS 이식, mock 데이터 먼저.
- 각 Phase 통과 시 `LOG.md`에 결과를 기록한다.
- 배포 방식 ADR은 제품 Phase 2 이후 결정 시 작성한다.

## 제품 Phase 2 이후로 미룬 것

- 스테이징·프로덕션 배포 Phase, 전용 배포 adapter와 signed receipt
- 자동 리뷰 수집, 자동 답글 게시, 챗봇 알림, 멀티 플랫폼, 정기 리포트

## 완료된 기반 작업

- Provider-independent Controller(`HARNESS/engine/`)와 실행 기록·검증·재시도·승인 체계 구축
- `HARNESS/tests/`의 Controller 안전 장치·정적 프로토타입 회귀 테스트 (55 통과·1 스킵)
- 정적 HTML·CSS 프로토타입(`prototype/`)과 PRD·docs 문서 체계
- 하네스 Phase 구조의 기능 단위 재설계 (2026-07-22, `PHASE_PLAN.md`), MVP 통합 검증을 Phase 06으로 분리
