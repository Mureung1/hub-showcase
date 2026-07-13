# 2주차 핵심 시나리오 — 결정 이유를 다시 묻지 않는 팀

## 문제와 이번 주 결과

> 대학생 팀 프로젝트에서는 회의 결론만 남고 결정 이유가 기록 사이에 흩어져, 팀원이 나중에 “왜 이렇게 정했지?”라고 물을 때마다 같은 설명을 반복한다.

이번 주 결과는 로그인한 학생이 회의 기록을 저장하고 로컬 Agent의 `결정·이유·정확한 원문 근거`를 확인한 뒤, 새로고침해도 Supabase에서 같은 결과를 다시 읽는 한 수직 슬라이스를 증명하는 것이다.

## 60초 시연

1. 0–8초: `대학생 공모전 MVP` 프로젝트를 만든다.
2. 8–20초: 아래 고정 기록을 저장한다.
3. 20–32초: 기록을 선택하고 로컬 분석을 실행한다.
4. 32–44초: 가장 먼저 표시된 `결정 배경`에서 결정, 이유, 확정 상태를 확인한다.
5. 44–53초: `근거`를 열어 `첫 기획 회의`와 정확한 인용문을 확인한다.
6. 53–60초: 프로젝트 페이지를 새로고침하고 같은 결정·이유·근거를 다시 연다.

고정 기록:

> 공모전 팀은 7월 12일 기획 회의에서 MVP 범위를 논의했다. 사용자 인터뷰 8명 중 6명이 첫 화면에서 서비스 목적을 이해하지 못했고 발표까지 2주밖에 남지 않았기 때문에, 팀은 MVP 대상을 모든 협업팀이 아니라 대학생 팀 프로젝트로 좁히기로 결정했다. 민지는 저장된 기록을 새로고침 뒤에도 확인할 수 있어야 한다고 말했다. 다음 회의에서는 대학생 3명에게 새 소개 문구를 다시 검증한다.

## FE–BE–DB 증명 경로

| 계층 | 현재 계약 | 검증 증거 |
| --- | --- | --- |
| Frontend | 프로젝트·기록 생성, 로컬 분석, 결정·이유·상태, 근거 drawer, reload | `src/pages/ProjectPage.tsx`, `src/components/AnalysisHistory.tsx`, `src/components/DecisionList.tsx`, `src/components/EvidenceDrawer.tsx` |
| API | same-origin 인증 세션과 프로젝트·기록·분석 API | `server/apiV1.mjs`, `server/moduBrainRepository.mjs` |
| Database | 소유자 프로젝트·원문·실행·불변 스냅숏과 RLS | `supabase/migrations/`, `supabase/tests/database/` |
| Agent | 결정·이유·근거 구조화, 원문 부분 문자열 검증, 이유 부재 시 명시 | `server/contextAnalysisCore.mjs`, `server/analysisResultV2.mjs` |
| Browser proof | 한 실행과 두 실행 모두 reload 후 DB에서 재조회 | `tests/e2e/authenticated-flow.spec.ts` |

새 endpoint나 table을 추가하지 않는다. 이미 존재하는 왕복에서 사용자 결과와 검증 공백만 닫는다.

## P0 — 결정 이유와 영속 왕복

### [x] 기획·검증 Agent를 재사용 가능한 산출물로 고정

- 개인 Codex skill: `$plan-modu-brain`, `$verify-modu-brain`
- 저장소 계약: `agents/planning-agent.md`, `agents/verification-agent.md`
- 독립 Agent 반대 검토를 통해 새 기능 확장 대신 기존 인증 E2E 보강으로 범위를 축소했다.

### [x] 원문에 없는 이유를 만들지 않기

- 명시적 `때문`/`위해` 근거가 없으면 `원문에서 이 결정의 명시적 이유를 확인할 수 없습니다.`를 반환한다.
- 결정 자체가 확정된 경우 상태는 `confirmed`로 유지해 결정 상태와 이유 존재 여부를 혼동하지 않는다.
- 명시적 이유 보존과 이유 부재를 각각 단위 테스트로 고정했다.

검증:

```powershell
npx vitest run server/contextAnalysisCore.test.mjs tests/eval/korean-context-eval.test.mjs
```

### [x] 결정 이유를 분석 이력의 첫 정보로 배치

- 분석 이력 순서를 `결정 이유와 근거 → 관점 차이 → 미결 질문 → 변화 서사 → 요약`으로 맞췄다.
- 새 색·폰트·장식은 추가하지 않고 기존 warm paper, KoPub 돋움, semantic section 구조를 유지했다.

### [x] 잘못된 인용을 성공 결과로 저장하지 않기

- snapshot에 없는 provider 인용이 오면 `502 / EVIDENCE_VALIDATION_FAILED`를 반환한다.
- 실행은 `failed`로 끝나고 `result_jsonb`를 성공 값으로 쓰지 않는다.
- evidence validation 단계 이벤트도 `failed`와 안전한 코드만 기록한다.

검증:

```powershell
npx vitest run server/apiV1.test.mjs server/analysisResultV2.test.mjs
```

### [x] 인증 E2E에 결정·이유·근거 재조회 계약 추가

- 첫 분석 전후에 정확한 이유, 출처 제목, 인용문을 확인한다.
- 첫 reload 뒤 성공 실행 1건과 같은 이유·인용을 다시 확인한다.
- 두 번째 분석 뒤 reload에서도 기록 2건, 성공 실행 2건, 변화 서사를 확인한다.

코드는 준비됐지만 Docker 기반 로컬 Supabase가 없어 이 인증 시나리오의 실제 실행은 P2 미검증으로 남긴다.

## P1 — 근거 접근성

### [x] 근거 drawer 키보드 계약 고정

- 열리면 닫기 버튼으로 초점을 이동한다.
- `Tab`과 `Shift+Tab`이 dialog 내부에서 순환한다.
- `Escape`로 닫고, 닫힌 뒤 근거를 연 버튼으로 초점을 돌려준다.

검증:

```powershell
npx vitest run src/components/EvidenceDrawer.test.tsx src/pages/ProjectPage.test.tsx
```

## P2 — 로컬 Supabase 환경 증명

### [ ] migration·RLS·Auth E2E 실제 실행

저장소에는 PG17 설정, migration 7개와 rollback 7개, 13개 테이블의 RLS, policy 30개, pgTAP 92개가 준비돼 있다. 현재 Windows 호스트에는 Docker Desktop과 WSL이 없어 DB 프로세스를 시작할 수 없다. 따라서 이 항목은 구현 부족이 아니라 환경 검증 대기다.

Docker 엔진 준비 후 한 명령으로 local-only 검증한다.

```powershell
.\scripts\run-local-auth-e2e.ps1
```

스크립트는 Supabase CLI `2.109.1`로 `start → db reset → test db → authenticated Playwright`를 실행하고 키는 현재 프로세스에만 둔다. `supabase login`, `link`, `db push`, 원격 프로젝트는 사용하지 않는다. 완료 조건은 pgTAP 성공과 인증 E2E `1 passed, 0 skipped`다.

## 이번 범위에서 미룬 것

- 유료 OpenAI live call과 provider 품질 튜닝
- 팀 초대, 역할, 실시간 공동 편집
- Slack·Notion·Teams OAuth 직접 연동
- 새 DB table·endpoint와 백그라운드 queue
- 임의 두 분석 비교
- push, PR 변경, 배포, 원격 Supabase 변경

## Agent 반대 검토에서 반영한 결정

- 이미 구현된 이유 부재 처리를 다시 설계하지 않고 회귀 테스트와 사용자 우선순위만 보강했다.
- 기존 E2E의 넓은 기능 수보다 `결정·이유·인용의 동일성`을 reload 전후에 명시적으로 검증했다.
- 근거 drawer는 재설계하지 않고 이미 있는 focus trap 동작을 테스트로 고정했다.
- migration·RLS는 새로 구현했다고 주장하지 않고 Docker 준비 후 실제 실행해야 하는 환경 검증으로 분리했다.
