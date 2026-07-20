# 작업 계획: T17 — 실행 환경·Vercel 세팅 + 목 1차 배포

> 상태: 보류
>
> 작성일: 2026-07-12
>
> 최종 갱신일: 2026-07-20
>
> 현재 단계: ② CI 재설치 승인 + ④ 공개 Production·보호된 Preview의 S0 수동 확인
>
> 다음 행동: 구조 변경 승인 뒤 `ci.yml` 재추적·원격 `verify` 확인, 로그인 가능한 브라우저에서 Production·Preview S0 확인
>
> CHECKLIST 항목: T17

## 1. 목표와 완료조건

- 해결할 사용자/제품 문제: 목(mock) 상태의 앱을 실제 URL로 배포해 머지 전 실물 확인(프리뷰)과 이후 T20(실 provider 전환)·T22(외부 과업)·T23(최종 배포)의 기반을 만든다. push마다 깨끗한 환경에서 검증이 강제되도록 CI를 원격 규칙까지 연결한다.
- 목표 결과: CI required status check(또는 플랜 제약 기록) + Vercel Git 연동으로 프로덕션(N166_진현지)·프리뷰 배포가 동작하는 상태.

| ID | 검증 가능한 완료조건 | 검증 방법 | 필수 여부 |
| --- | --- | --- | --- |
| AC-1 | Node 버전 고정(.nvmrc 22.12.0) + 깨끗한 환경 `npm ci`·전체 검증 재현 | 완료 근거 링크(CI run 29193570731 — npm ci→lint→build→test 성공) | 필수 (기완료) |
| AC-2 | CI 워크플로 설치·실제 성공 실행 | 현재 브랜치 커밋 트리의 `ci.yml` + 새 Preview SHA `verify` 성공 링크 | 필수 (재개) |
| AC-3 | origin 대상 브랜치에 required status check 지정, 불가 시(플랜 제약) 제약 실증 기록 + CICD.md 정본 갱신 제안 | `gh api`로 설정 후 조회 재확인, 실패 시 응답 원문 기록 | 필수 |
| AC-4 | auto-merge 워크플로와 required check 상호작용 확인 | auto-merge.yml 머지 경로가 보호 규칙을 우회하지 못함을 근거와 함께 기록 | 필수 |
| AC-5 | Vercel GitHub 연동, Vite 자동 감지, Production Branch=N166_진현지, 프로덕션 URL에서 목 상태 1차 배포 확인 | 배포 URL 접속해 S0 렌더 확인, 스크린샷/URL 기록 | 필수 |
| AC-6 | 프리뷰 배포 동작 확인(비프로덕션 브랜치 push 시 고유 URL) | 테스트 브랜치 push → 프리뷰 URL 접속 확인 | 필수 |
| AC-7 | 현재 Vercel 플랜의 custom events 지원 여부 기록(T24 판단 근거, 새 유료 플랜 자동 도입 금지) | Vercel 문서·대시보드 근거와 함께 verification.md에 기록 | 필수 |
| AC-8 | CICD.md 상태 갱신 + LOG.md 이력 + CHECKLIST T17 체크 | 문서 게이트: 로컬 링크·필수 항목 확인 + `git diff --check` | 필수 |

## 2. 의존성·정본 확인

- T항목과 의존성 상태: T17 의존 = T14(완료 체크 확인, 2026-07-12).
- CHECKLIST 본문이 직접 가리키는 문서·구간: docs/CICD.md 전체(특히 "T17 실행 체크리스트" 1~7).
- 추가로 확인한 정본: docs/MVP.md DoD(배포 관련), 추적 중인 `.github/workflows/auto-merge.yml`, 로컬 전용 `.github/workflows/ci.yml`, `.gitignore`.
- 이번 작업에서 바꾸지 않는 계약·범위: `ANTHROPIC_API_KEY` 등록(T20 시점), `api/` 함수 구현(T18 완료), 계측 구현(T24 — 여기선 지원 여부 기록만), auto-merge.yml 수정 금지(과제 제공 워크플로), 앱 코드 변경 없음.

## 3. 작업트리 기준선

- 시작 시 `git status --short` 요약: 깨끗함(변경 없음), 브랜치 N166_진현지.
- 기존 변경 중 반드시 보존할 파일·의도: 해당 없음.
- 이번 작업이 소유하는 경로: `harness/tasks/T17-vercel-mock-deploy/`, `docs/CICD.md`(상태 갱신), `docs/LOG.md`, `docs/CHECKLIST.md`(T17 체크), 필요 시 `vercel.json`(도입 전 승인).

## 4. 5요소 계획

| 요소 | 계획 |
| --- | --- |
| 맥락 | React+TS(Vite), origin=Catsmanager/hub(**private**, 개인 무료 계정). 과거 CI 성공 이력은 있지만 현재 `ci.yml`이 커밋 트리에서 제거되어 새 push의 run이 생성되지 않는다. 이 작업이 끝나면 실물 URL 리뷰·T20 착수·T22 고정 URL 과업이 가능해진다 |
| 구체성 | 승인 시 `.gitignore`의 워크플로 제외 규칙 제거, `ci.yml` 재추적과 API 타입검사 단계 추가, 새 Preview SHA의 `verify` 성공 확인. 기존 main required check·Vercel 설정과 문서 정본도 재검증 |
| 역할·예시 | required check 대상 = origin `main`(auto-merge가 머지하는 PR의 base 보호). 예: `gh api -X PUT repos/Catsmanager/hub/branches/main/protection` body에 `required_status_checks.contexts=["verify"]`. Vercel: Import Git Repository → Catsmanager/hub → Framework Preset: Vite(자동) → Production Branch: N166_진현지 |
| 단계화 | ① required status check 설정 시도·재조회 확인(플랜 거부 시 중단·보고) → ② auto-merge 상호작용 근거 확인·기록 → ③ Vercel 연동(사용자 대시보드)·Vite 감지·Production Branch 지정 → ④ 프로덕션 목 배포 확인 + 테스트 브랜치 push로 프리뷰 확인 → ⑤ custom events 플랜 근거 기록 → ⑥ 문서 갱신(CICD 상태·LOG·CHECKLIST)·verification.md 작성 |
| 검증 | 각 AC의 검증 방법 열 그대로. 최종 게이트(설정·배포 유형): CICD.md T17 체크리스트 전 항목 대조 + `npm run build` 로컬 재확인 + `git diff --check` |

## 5. 변경 경계와 위험

- 허용된 변경: GitHub origin 저장소 설정(브랜치 보호/ruleset), Vercel 프로젝트 생성·설정, 3절의 소유 경로 문서.
- 명시적으로 제외한 변경: 앱 런타임 코드·auto-merge.yml·upstream 저장소 설정·유료 플랜 결제.
- 구조·계약·의존성 승인이 필요한 지점: `ci.yml` 재추적과 원격 push/PR 자동 실행은 구조 변경 승인 후에만 적용한다. `vercel.json` 파일 추가가 필요해져도 도입 전 별도 승인한다.
- 예상 위험과 대응: (1) private+무료 플랜에서 branch protection API 403 → 응답 원문 기록 후 제약 보고, 공개 전환·플랜 변경은 사용자 결정. (2) Vercel 로그인·연동은 에이전트가 대신할 수 없음 → 단계 ③은 사용자 수행, 에이전트는 절차 제시·결과 검증. (3) 저장소 루트가 앱 루트이므로 Root Directory 추가 설정 불필요 예상 — 감지 실패 시 보고.

## 6. 승인·범위 변경 기록

| 날짜 | 상태 | 승인 또는 변경 내용 | 근거 |
| --- | --- | --- | --- |
| 2026-07-12 | 제안 | T17 착수 계획 제안(잔여 범위: required check·Vercel 연동·목 1차 배포·플랜 기록·문서 갱신) | 사용자 /task-start 요청 |
| 2026-07-12 | 승인됨 → 진행 중 | 사용자 "진행" 승인 — 제안 범위 그대로 착수 | 대화 승인 |
| 2026-07-20 | 제안 | 추적 제거된 `ci.yml` 재설치, `typecheck:api` 단계 추가, 새 Preview SHA 원격 실행 확인 | 커밋 트리·Actions run 감사 |

## 7. 진행·인계

- 마지막으로 끝낸 단계: required status 설정·auto-merge 상호작용, Production Branch 배포, 공개 Production Domain HTTP 200·답냥이 HTML, 비프로덕션 Preview deployment success, custom events 플랜 근거 조사
- 현재 작업 중인 단계: ② CI 재설치 승인, ④ Production·Preview S0 화면 수동 확인 대기
- 다음 행동: 승인 뒤 `ci.yml`과 API 타입검사를 원격에 복원해 `verify` 성공을 확인하고, 로그인 가능한 브라우저에서 Production·Preview S0를 확인한다.
- 보류 사유와 재개 조건: 현재 커밋 트리에 CI가 없고 Browser runtime도 `[]`다. CI 구조 변경 승인과 Production·Preview S0 사용자 확인이 모두 필요하다.

| 날짜 | 진행·결정 | 근거·영향 |
| --- | --- | --- |
| 2026-07-12 | 계획 작성, T14 완료·잔여 범위 확인 | CHECKLIST 43행, CICD.md 상태 주석 |
| 2026-07-12 | AC-3 통과: origin main에 required_status_checks `verify`(app_id 15368=GitHub Actions) 설정·재조회 확인. private 무료 저장소에서 403 없이 성공 | `gh api PUT/GET .../branches/main/protection` 응답 |
| 2026-07-12 | AC-4 근거: auto-merge.yml 규칙 1이 main 타겟 PR을 머지하지 않고 스킵(코멘트만) → main 보호와 자동 머지 경로가 교차하지 않음. 비-main 타겟 머지는 보호 미적용 브랜치라 기존 동작 유지. REST merge API는 보호 규칙을 우회할 수 없음(405 반환) | auto-merge.yml rules 배열, GitHub REST 문서 |
| 2026-07-12 | AC-7 근거: Vercel Web Analytics custom events는 Hobby 미지원·Pro 전용(Hobby는 pageview 5만/월). 유료 전환 금지 규칙에 따라 T24는 "미지원 → 제약 기록 + T22 파일럿 대체" 경로 확정 | vercel.com/docs/analytics/limits-and-pricing |
| 2026-07-15 | 다음 작업 재개 감사: 로컬 `vercel` CLI와 `.vercel/project.json`이 없고, 기존 계획대로 사용자 대시보드 Import가 선행되어야 함 | T28 완료 뒤 실행 가능 항목 대조, 로컬 경로·명령 확인 |
| 2026-07-15 | GitHub–Vercel 연동과 Production deployment success 확인. 그러나 deployment SHA `a44ede9`는 기본 `main`이며 사용자 브랜치 원격 `f585627`, 로컬 HEAD `fd20b15`와 다름 | GitHub deployments/statuses/branch API |
| 2026-07-15 | 제공 URL HEAD가 HTTP 302로 Vercel SSO에 이동 | 공개 S0 렌더 검증 불가, Deployment Protection 보정 필요 |
| 2026-07-16 | Vercel bot의 최신 Production deployment `5454481013`이 원격 `N166_진현지` HEAD `e5d52ef`를 배포하고 `success` 상태임을 GitHub Deployments API로 재확인 | Production Branch 불일치는 해소, 공개 접근·Preview만 남음 |
| 2026-07-16 | 실제 Production URL 접속이 HTTP 200인 Vercel 로그인 페이지로 종료되고 답냥이·S0 문구가 없음을 확인 | Deployment Protection 유지, AC-5 보류 |
| 2026-07-16 | Vercel 공식 문서에서 Standard Protection이 고유 deployment URL은 보호하지만 최신 Production Domain은 공개함을 확인하고 `https://dabnyang.vercel.app/` 접속 | HTTP 200, `<title>답냥이 — 대학생 메시지 작성 도우미</title>` 확인. Deployment Protection 변경 불필요 |
| 2026-07-20 | GitHub deployments 재조회 결과 Production 2건만 유지되고 Preview는 0건. 원격 `N166_진현지`는 `e5d52ef`, 로컬 HEAD는 `1b56224`이며 T30 미커밋 작업이 존재 | 사용자 요청 없는 commit/push 금지로 AC-6 계속 대기 |
| 2026-07-20 | 사용자 커밋·푸시 승인 후 T19 commit `5a2f408`을 원격 비프로덕션 `t17-preview-t19`로 push | Production Branch를 건드리지 않고 Preview 트리거 생성 |
| 2026-07-20 | Vercel deployment `5516452997`이 environment=`Preview`, SHA=`5a2f408`, status=`success`와 고유 URL을 반환 | AC-6 배포 생성은 통과. URL은 Standard Protection 로그인으로 이동해 S0 실물은 대기 |
| 2026-07-20 | repository Actions는 enabled지만 SHA `5a2f408`의 workflow run 0건 | 과거 CI 성공·required check는 유지하되 현재 Preview SHA의 원격 CI 근거로 사용하지 않음 |
| 2026-07-20 | 원인 감사에서 `0bb4e6e`의 `ci.yml` 추적 제거와 `.github/workflows/` ignore를 확인. 기본·Preview 커밋 트리에는 `auto-merge.yml`만 존재 | AC-2 재개. main의 required `verify`는 현재 check producer가 없어 CI 재설치 전 완료 근거가 아님 |
| 2026-07-20 | 테스트 안정화 commit `86d5b9f` push 뒤 deployment `5516596997`이 Preview/success, Actions run은 0건 | Vercel 자동 배포는 재현, CI 부재도 재현 |
