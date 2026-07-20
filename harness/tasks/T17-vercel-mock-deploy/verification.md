# 검증 보고서: T17 — 실행 환경·Vercel 세팅 + 목 1차 배포

> 상태: 보류
>
> 검증일: 2026-07-12, 2026-07-15, 2026-07-16, 2026-07-20
>
> 관련 계획: [`plan.md`](plan.md)
>
> 검증 대상: origin(Catsmanager/hub) 원격 설정 + Vercel 프로젝트 설정 (코드 변경 없음)

## 1. 변경·범위 요약

- 목표 대비 결과: 보완 필요 — GitHub–Vercel 연동, Production Branch 배포와 공개 Production Domain, 비프로덕션 `t17-preview-t19`의 Preview deployment `5516596997 / success`를 확인했다. 현재 커밋 트리에 `ci.yml`이 없어 AC-2를 다시 열었고 Production·Preview의 클라이언트 S0 실물 확인도 남아 있다.
- 변경한 파일: 현재까지 T17 문서만 보정. CI 워크플로는 구조 변경 승인 전이라 수정·추적하지 않음.
- 변경하지 않은 경계: 앱 코드, ci.yml·auto-merge.yml 내용, upstream 저장소, 유료 플랜.
- 시작 시 기존 변경 보존 여부: 시작 시 작업트리 깨끗함 — 해당 없음.
- 허용 범위와 실제 diff 비교 결과: 현재까지 원격 main 보호와 T17 기록뿐이며 앱 코드·워크플로는 변경하지 않음. 최종 비교는 배포 검증 종료 시 수행.

## 2. 완료조건 추적

| ID | 검증 방법 | 결과 | 근거 |
| --- | --- | --- | --- |
| AC-1 | CI run에서 npm ci→검증 재현 | 통과 (선행 완료) | `.nvmrc` 22.12.0, run 29193570731 성공 |
| AC-2 | CI 설치·성공 실행 | 미통과·재설치 승인 대기 | 과거 run 29193570731은 성공했지만 `0bb4e6e`에서 `ci.yml` 추적 제거. SHA `86d5b9f` Actions run 0건 |
| AC-3 | `gh api` 설정 후 재조회 | 설정 통과·운영 보완 필요 | main protection `required_status_checks.contexts=["verify"]`는 유지되나 현재 check producer가 없어 AC-2 복원 필요 |
| AC-4 | auto-merge 경로와 보호 규칙 교차 분석 | 통과 | auto-merge.yml 규칙 1이 main 타겟 PR을 머지하지 않고 스킵 → 보호 대상(main)과 자동 머지 경로 비교차. REST merge API는 보호 미충족 시 405로 차단되어 우회 불가 |
| AC-5 | 프로덕션 URL에서 목 상태 S0 렌더 확인 | 부분 통과·수동 확인 대기 | 최신 deployment `5454481013` `success`, SHA=`e5d52ef`. 고유 URL은 Standard Protection 대상이지만 Production Domain `https://dabnyang.vercel.app/`은 HTTP 200·답냥이 title/HTML 반환. 클라이언트 S0 화면은 Browser runtime 부재로 사용자 확인 대기 |
| AC-6 | 테스트 브랜치 push → 프리뷰 URL 확인 | 부분 통과·수동 확인 대기 | commit `86d5b9f`을 `t17-preview-t19`에 push, deployment `5516596997` environment=`Preview`, status=`success`, SHA 일치·고유 URL 확인. URL은 Standard Protection 로그인으로 이동해 앱 S0 실물은 미확인 |
| AC-7 | Vercel 문서·플랜 근거 기록 | 근거 확보 | custom events는 Hobby 미지원·Pro 전용(vercel.com/docs/analytics/limits-and-pricing). 계정 플랜이 Hobby인지 연동 시 확정 → T24는 "미지원 → 제약 기록 + T22 파일럿 대체" 경로 |
| AC-8 | 문서 게이트 + `git diff --check` | 대기 | 종료 시 |

## 3. 자동 검증

| 항목 | 명령 또는 방법 | 결과 | 근거·관찰 요약 |
| --- | --- | --- | --- |
| 관련 테스트 | 해당 없음 | 해당 없음 | 코드 변경 없는 설정·배포 작업 |
| 전체 테스트 | `npm test -- --reporter=dot` | 통과(로컬) | commit `86d5b9f`: 24파일 225개, 18.68초. 같은 SHA의 GitHub Actions run은 0건이라 원격 CI 근거로 사용하지 않음 |
| 린트 | `npm run lint` | 통과(로컬) | oxlint 오류 0건 |
| 빌드 | `npm run build` | 통과(로컬) | TypeScript/Vite production build 통과 |
| 변경 형식 | `git diff --check` | 통과 | 공백 오류 0건 |
| 작업별 추가 검증 | CICD.md T17 체크리스트 1~7 대조 | 진행 중 | Node·Vercel·플랜 근거는 확보. CI 재설치와 Production·Preview S0 확인 대기 |

## 4. 수동 검증

| 시나리오 | 환경 | 기대 결과 | 실제 결과 | 상태·근거 |
| --- | --- | --- | --- | --- |
| 프로덕션 고유 deployment URL 접속 | 공개 HTTP | 배포 상태 확인 | Vercel 로그인 URL로 리디렉션된 후 HTTP 200 HTML | 정상 — Standard Protection 대상 |
| 공개 Production Domain 접속 | 공개 HTTP | 답냥이 앱·S0 렌더 | `https://dabnyang.vercel.app/` HTTP 200, 한국어 HTML·답냥이 title 확인 | 부분 통과 — S0 실물은 사용자 확인 대기 |
| 프리뷰 URL 접속 | 데스크톱 브라우저 | 비프로덕션 브랜치 push의 고유 URL 배포 | `5516596997` success, 공개 요청은 Vercel 로그인으로 이동 | 부분 통과 — 로그인된 브라우저 S0 확인 대기 |

## 5. 정본·규칙 확인

- 작업별 정본 정합성: docs/CICD.md와 CHECKLIST의 CI 상태를 현재 커밋 트리에 맞게 보정. 워크플로 파일은 승인 전 무변경.
- MVP 범위 준수: 예 — 배포 세팅만, 계측 구현(T24)·프록시(T18) 미포함.
- 코드 작업인 경우 `any` 미사용 확인 방법: 해당 없음(코드 변경 없음).
- 미치환 필수 항목 없음: 예.
- 남은 위험·알려진 한계: main required `verify`는 설정돼 있지만 현재 커밋 트리에 check를 생성할 CI 워크플로가 없다. Preview는 Standard Protection, Browser runtime은 `[]`라 S0 클라이언트 렌더 증거도 없다.

## 6. 완료 판정·인계

- 필수 AC 전부 통과: 아니오 — AC-2 CI 재설치, AC-5·6 S0 실물, AC-8 종료 문서 대기.
- 적용되는 자동·수동 검증 전부 통과: 진행 중.
- 미해결 차단사항 없음: 아니오 — CI 구조 변경 승인과 Browser runtime 또는 사용자 Production·Preview S0 확인이 필요하다.
- `docs/CHECKLIST.md` 갱신 여부와 근거: 미갱신 — `통과` 전 체크 금지.
- `docs/LOG.md` 기록 및 계획·검증 보고서 링크: 진행분 기록(2026-07-12).
- 후속 작업 또는 사용자 판단이 필요한 사항: `ci.yml` 재추적·`typecheck:api` 추가를 승인한 뒤 새 Preview SHA의 `verify`를 확인한다. 공개 Production Domain과 Standard Protection Preview에서도 S0를 확인한 뒤 AC-2·5·6·8과 CHECKLIST를 닫는다.

위 조건을 충족하지 못하면 상태를 `통과`로 기록하지 않는다.
