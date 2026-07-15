# 검증 보고서: T17 — 실행 환경·Vercel 세팅 + 목 1차 배포

> 상태: 보류
>
> 검증일: 2026-07-12, 2026-07-15
>
> 관련 계획: [`plan.md`](plan.md)
>
> 검증 대상: origin(Catsmanager/hub) 원격 설정 + Vercel 프로젝트 설정 (코드 변경 없음)

## 1. 변경·범위 요약

- 목표 대비 결과: 보완 필요 — GitHub–Vercel 연동과 Production 상태의 배포 성공은 확인했다. 다만 기본 `main`의 오래된 커밋이 배포됐고 URL이 Vercel SSO로 보호되어 답냥이 현재 브랜치의 공개 S0를 검증할 수 없다.
- 변경한 파일: 없음(저장소 코드·워크플로 무변경). 원격 설정만 변경(main 브랜치 보호).
- 변경하지 않은 경계: 앱 코드, ci.yml·auto-merge.yml 내용, upstream 저장소, 유료 플랜.
- 시작 시 기존 변경 보존 여부: 시작 시 작업트리 깨끗함 — 해당 없음.
- 허용 범위와 실제 diff 비교 결과: 현재까지 원격 main 보호와 T17 기록뿐이며 앱 코드·워크플로는 변경하지 않음. 최종 비교는 배포 검증 종료 시 수행.

## 2. 완료조건 추적

| ID | 검증 방법 | 결과 | 근거 |
| --- | --- | --- | --- |
| AC-1 | CI run에서 npm ci→검증 재현 | 통과 (선행 완료) | `.nvmrc` 22.12.0, run 29193570731 성공 |
| AC-2 | CI 설치·성공 실행 | 통과 (선행 완료) | 같은 run, verify 37s |
| AC-3 | `gh api` 설정 후 재조회 | 통과 | main protection `required_status_checks.contexts=["verify"]`(app_id 15368) — PUT 성공, GET 재확인. private 무료 저장소에서 403 없음 |
| AC-4 | auto-merge 경로와 보호 규칙 교차 분석 | 통과 | auto-merge.yml 규칙 1이 main 타겟 PR을 머지하지 않고 스킵 → 보호 대상(main)과 자동 머지 경로 비교차. REST merge API는 보호 미충족 시 405로 차단되어 우회 불가 |
| AC-5 | 프로덕션 URL에서 목 상태 S0 렌더 확인 | 보완 필요 | Vercel bot deployment `success`, URL `dabnyang-q36f41xut-jinhyunjis-projects.vercel.app`. 배포 SHA는 `main`의 `a44ede9`이고 HTTP HEAD는 Vercel SSO로 302 이동해 S0 확인 불가 |
| AC-6 | 테스트 브랜치 push → 프리뷰 URL 확인 | 대기 | GitHub deployments API에 현재 Production 1건만 존재. Production Branch 보정·별도 preview branch push 뒤 검증 |
| AC-7 | Vercel 문서·플랜 근거 기록 | 근거 확보 | custom events는 Hobby 미지원·Pro 전용(vercel.com/docs/analytics/limits-and-pricing). 계정 플랜이 Hobby인지 연동 시 확정 → T24는 "미지원 → 제약 기록 + T22 파일럿 대체" 경로 |
| AC-8 | 문서 게이트 + `git diff --check` | 대기 | 종료 시 |

## 3. 자동 검증

| 항목 | 명령 또는 방법 | 결과 | 근거·관찰 요약 |
| --- | --- | --- | --- |
| 관련 테스트 | 해당 없음 | 해당 없음 | 코드 변경 없는 설정·배포 작업 |
| 전체 테스트 | `npm test -- --reporter=dot` | 통과(로컬) | 2026-07-15 현재 작업트리 8파일 69개. 배포 SHA가 달라 배포 검증 근거로는 사용하지 않음 |
| 린트 | `npm run lint` | 통과(로컬) | oxlint 오류 0건 |
| 빌드 | `npm run build` | 통과(로컬) | Vite production build 통과. 배포 SHA 불일치 |
| 변경 형식 | `git diff --check` | 통과 | 공백 오류 0건 |
| 작업별 추가 검증 | CICD.md T17 체크리스트 1~7 대조 | 진행 중 | 1·2 완료, 5 근거 확보, 3·4·7 대기, 6은 T18 시점(범위 외) |

## 4. 수동 검증

| 시나리오 | 환경 | 기대 결과 | 실제 결과 | 상태·근거 |
| --- | --- | --- | --- | --- |
| 프로덕션 URL 접속 | 공개 HTTP | 목 상태 S0(답장/먼저 보내기 선택) 렌더 | HTTP 302 → `vercel.com/sso-api` | 보완 필요 — 공개 접근 불가 |
| 프리뷰 URL 접속 | 데스크톱 브라우저 | 비프로덕션 브랜치 push의 고유 URL 배포 | — | 대기 |

## 5. 정본·규칙 확인

- 작업별 정본 정합성: docs/CICD.md T17 체크리스트 순서대로 진행 중. 워크플로 파일 무변경.
- MVP 범위 준수: 예 — 배포 세팅만, 계측 구현(T24)·프록시(T18) 미포함.
- 코드 작업인 경우 `any` 미사용 확인 방법: 해당 없음(코드 변경 없음).
- 미치환 필수 항목 없음: 예.
- 남은 위험·알려진 한계: Vercel 프로젝트는 연결됐으나 기본 Production Branch `main`이 배포됐다. `main=a44ede9`, `N166_진현지` 원격=`f585627`, 로컬 HEAD=`fd20b15`이며 로컬은 원격보다 5커밋 앞이고 미커밋 변경도 많다. 현재 URL은 SSO 보호 상태라 외부 과업 URL로 쓸 수 없다.

## 6. 완료 판정·인계

- 필수 AC 전부 통과: 아니오 — AC-5·6·8 대기.
- 적용되는 자동·수동 검증 전부 통과: 진행 중.
- 미해결 차단사항 없음: 차단 3건 — Production Branch 보정, Production 공개 접근 설정, 최신 변경 커밋·푸시 여부에 대한 사용자 요청.
- `docs/CHECKLIST.md` 갱신 여부와 근거: 미갱신 — `통과` 전 체크 금지.
- `docs/LOG.md` 기록 및 계획·검증 보고서 링크: 진행분 기록(2026-07-12).
- 후속 작업 또는 사용자 판단이 필요한 사항: Vercel Production Branch=`N166_진현지` 및 공개 접근 설정 → 최신 변경을 배포하려면 커밋·푸시 요청 → 새 Production URL과 preview URL 검증.

위 조건을 충족하지 못하면 상태를 `통과`로 기록하지 않는다.
