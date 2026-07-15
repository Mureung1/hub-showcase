# 작업 계획: T17 — 실행 환경·Vercel 세팅 + 목 1차 배포

> 상태: 보류
>
> 작성일: 2026-07-12
>
> 최종 갱신일: 2026-07-15
>
> 현재 단계: ③ Vercel Production Branch·Deployment Protection 보정
>
> 다음 행동: Vercel Settings → Environments → Production → Branch Tracking을 `N166_진현지`로 변경하고 공개 검증이 가능하도록 Production Deployment Protection 설정 확인
>
> CHECKLIST 항목: T17

## 1. 목표와 완료조건

- 해결할 사용자/제품 문제: 목(mock) 상태의 앱을 실제 URL로 배포해 머지 전 실물 확인(프리뷰)과 이후 T18(프록시)·T22(외부 과업)·T23(최종 배포)의 기반을 만든다. push마다 깨끗한 환경에서 검증이 강제되도록 CI를 원격 규칙까지 연결한다.
- 목표 결과: CI required status check(또는 플랜 제약 기록) + Vercel Git 연동으로 프로덕션(N166_진현지)·프리뷰 배포가 동작하는 상태.

| ID | 검증 가능한 완료조건 | 검증 방법 | 필수 여부 |
| --- | --- | --- | --- |
| AC-1 | Node 버전 고정(.nvmrc 22.12.0) + 깨끗한 환경 `npm ci`·전체 검증 재현 | 완료 근거 링크(CI run 29193570731 — npm ci→lint→build→test 성공) | 필수 (기완료) |
| AC-2 | CI 워크플로 설치·실제 성공 실행 | 완료 근거 링크(같은 run) | 필수 (기완료) |
| AC-3 | origin 대상 브랜치에 required status check 지정, 불가 시(플랜 제약) 제약 실증 기록 + CICD.md 정본 갱신 제안 | `gh api`로 설정 후 조회 재확인, 실패 시 응답 원문 기록 | 필수 |
| AC-4 | auto-merge 워크플로와 required check 상호작용 확인 | auto-merge.yml 머지 경로가 보호 규칙을 우회하지 못함을 근거와 함께 기록 | 필수 |
| AC-5 | Vercel GitHub 연동, Vite 자동 감지, Production Branch=N166_진현지, 프로덕션 URL에서 목 상태 1차 배포 확인 | 배포 URL 접속해 S0 렌더 확인, 스크린샷/URL 기록 | 필수 |
| AC-6 | 프리뷰 배포 동작 확인(비프로덕션 브랜치 push 시 고유 URL) | 테스트 브랜치 push → 프리뷰 URL 접속 확인 | 필수 |
| AC-7 | 현재 Vercel 플랜의 custom events 지원 여부 기록(T24 판단 근거, 새 유료 플랜 자동 도입 금지) | Vercel 문서·대시보드 근거와 함께 verification.md에 기록 | 필수 |
| AC-8 | CICD.md 상태 갱신 + LOG.md 이력 + CHECKLIST T17 체크 | 문서 게이트: 로컬 링크·필수 항목 확인 + `git diff --check` | 필수 |

## 2. 의존성·정본 확인

- T항목과 의존성 상태: T17 의존 = T14(완료 체크 확인, 2026-07-12).
- CHECKLIST 본문이 직접 가리키는 문서·구간: docs/CICD.md 전체(특히 "T17 실행 체크리스트" 1~7).
- 추가로 확인한 정본: docs/MVP.md DoD(배포 관련), .github/workflows/ci.yml·auto-merge.yml 현행 내용.
- 이번 작업에서 바꾸지 않는 계약·범위: `ANTHROPIC_API_KEY` 등록(T18 시점), `api/` 함수 구현(T18), 계측 구현(T24 — 여기선 지원 여부 기록만), auto-merge.yml 수정 금지(과제 제공 워크플로), 앱 코드 변경 없음.

## 3. 작업트리 기준선

- 시작 시 `git status --short` 요약: 깨끗함(변경 없음), 브랜치 N166_진현지.
- 기존 변경 중 반드시 보존할 파일·의도: 해당 없음.
- 이번 작업이 소유하는 경로: `harness/tasks/T17-vercel-mock-deploy/`, `docs/CICD.md`(상태 갱신), `docs/LOG.md`, `docs/CHECKLIST.md`(T17 체크), 필요 시 `vercel.json`(도입 전 승인).

## 4. 5요소 계획

| 요소 | 계획 |
| --- | --- |
| 맥락 | React+TS(Vite), origin=Catsmanager/hub(**private**, 개인 무료 계정), CI 설치·첫 성공 완료 상태. 이 작업이 끝나면 실물 URL 리뷰·T18 착수·T22 고정 URL 과업이 가능해진다 |
| 구체성 | 코드 변경 없음. GitHub 원격 설정(gh api: ruleset 또는 branch protection로 `verify` job을 required로), Vercel 대시보드 설정(사용자 수행, 에이전트가 절차 안내·결과 검증), 문서 3건 갱신 |
| 역할·예시 | required check 대상 = origin `main`(auto-merge가 머지하는 PR의 base 보호). 예: `gh api -X PUT repos/Catsmanager/hub/branches/main/protection` body에 `required_status_checks.contexts=["verify"]`. Vercel: Import Git Repository → Catsmanager/hub → Framework Preset: Vite(자동) → Production Branch: N166_진현지 |
| 단계화 | ① required status check 설정 시도·재조회 확인(플랜 거부 시 중단·보고) → ② auto-merge 상호작용 근거 확인·기록 → ③ Vercel 연동(사용자 대시보드)·Vite 감지·Production Branch 지정 → ④ 프로덕션 목 배포 확인 + 테스트 브랜치 push로 프리뷰 확인 → ⑤ custom events 플랜 근거 기록 → ⑥ 문서 갱신(CICD 상태·LOG·CHECKLIST)·verification.md 작성 |
| 검증 | 각 AC의 검증 방법 열 그대로. 최종 게이트(설정·배포 유형): CICD.md T17 체크리스트 전 항목 대조 + `npm run build` 로컬 재확인 + `git diff --check` |

## 5. 변경 경계와 위험

- 허용된 변경: GitHub origin 저장소 설정(브랜치 보호/ruleset), Vercel 프로젝트 생성·설정, 3절의 소유 경로 문서.
- 명시적으로 제외한 변경: 앱 코드·CI 워크플로 내용·auto-merge.yml·upstream 저장소 설정·유료 플랜 결제.
- 구조·계약·의존성 승인이 필요한 지점: `vercel.json` 파일 추가가 필요해지면 도입 전 별도 승인. AC-3에서 플랜 제약으로 required check 불가 판명 시 CICD.md "통과 기준" 정본 갱신을 제안·승인 후 반영.
- 예상 위험과 대응: (1) private+무료 플랜에서 branch protection API 403 → 응답 원문 기록 후 제약 보고, 공개 전환·플랜 변경은 사용자 결정. (2) Vercel 로그인·연동은 에이전트가 대신할 수 없음 → 단계 ③은 사용자 수행, 에이전트는 절차 제시·결과 검증. (3) 저장소 루트가 앱 루트이므로 Root Directory 추가 설정 불필요 예상 — 감지 실패 시 보고.

## 6. 승인·범위 변경 기록

| 날짜 | 상태 | 승인 또는 변경 내용 | 근거 |
| --- | --- | --- | --- |
| 2026-07-12 | 제안 | T17 착수 계획 제안(잔여 범위: required check·Vercel 연동·목 1차 배포·플랜 기록·문서 갱신) | 사용자 /task-start 요청 |
| 2026-07-12 | 승인됨 → 진행 중 | 사용자 "진행" 승인 — 제안 범위 그대로 착수 | 대화 승인 |

## 7. 진행·인계

- 마지막으로 끝낸 단계: ① required status check 설정 완료, ② auto-merge 상호작용 확인, ⑤ custom events 플랜 근거 조사
- 현재 작업 중인 단계: ③ Vercel 연동 — 사용자 대시보드 수행 대기
- 다음 행동: 사용자가 Vercel Import 완료하면 ④ 프로덕션·프리뷰 배포 검증
- 보류 사유와 재개 조건: GitHub Import는 완료됐지만 기본 `main`의 오래된 커밋이 Production으로 배포됐고 URL은 Vercel SSO로 보호된다. Production Branch를 `N166_진현지`로 바꾸고 공개 접근 가능한 새 URL을 제공하면 AC-5~8을 재개한다. 최신 로컬 변경 배포에는 별도 커밋·푸시 요청이 필요하다.

| 날짜 | 진행·결정 | 근거·영향 |
| --- | --- | --- |
| 2026-07-12 | 계획 작성, T14 완료·잔여 범위 확인 | CHECKLIST 43행, CICD.md 상태 주석 |
| 2026-07-12 | AC-3 통과: origin main에 required_status_checks `verify`(app_id 15368=GitHub Actions) 설정·재조회 확인. private 무료 저장소에서 403 없이 성공 | `gh api PUT/GET .../branches/main/protection` 응답 |
| 2026-07-12 | AC-4 근거: auto-merge.yml 규칙 1이 main 타겟 PR을 머지하지 않고 스킵(코멘트만) → main 보호와 자동 머지 경로가 교차하지 않음. 비-main 타겟 머지는 보호 미적용 브랜치라 기존 동작 유지. REST merge API는 보호 규칙을 우회할 수 없음(405 반환) | auto-merge.yml rules 배열, GitHub REST 문서 |
| 2026-07-12 | AC-7 근거: Vercel Web Analytics custom events는 Hobby 미지원·Pro 전용(Hobby는 pageview 5만/월). 유료 전환 금지 규칙에 따라 T24는 "미지원 → 제약 기록 + T22 파일럿 대체" 경로 확정 | vercel.com/docs/analytics/limits-and-pricing |
| 2026-07-15 | 다음 작업 재개 감사: 로컬 `vercel` CLI와 `.vercel/project.json`이 없고, 기존 계획대로 사용자 대시보드 Import가 선행되어야 함 | T28 완료 뒤 실행 가능 항목 대조, 로컬 경로·명령 확인 |
| 2026-07-15 | GitHub–Vercel 연동과 Production deployment success 확인. 그러나 deployment SHA `a44ede9`는 기본 `main`이며 사용자 브랜치 원격 `f585627`, 로컬 HEAD `fd20b15`와 다름 | GitHub deployments/statuses/branch API |
| 2026-07-15 | 제공 URL HEAD가 HTTP 302로 Vercel SSO에 이동 | 공개 S0 렌더 검증 불가, Deployment Protection 보정 필요 |
