# 검증 보고서: T17 — 실행 환경·Vercel 세팅 + 목 1차 배포

> 상태: 통과
>
> 검증일: 2026-07-12, 2026-07-15, 2026-07-16, 2026-07-20, 2026-07-21, 2026-07-22
>
> 관련 계획: [`plan.md`](plan.md)
>
> 검증 대상: origin(Catsmanager/hub) 원격 설정 + Vercel 프로젝트 설정 (코드 변경 없음)

## 1. 변경·범위 요약

- 목표 대비 결과: 통과 — Node·로컬 전체 검증, GitHub–Vercel 연동, Production Branch, 공개 Production과 비프로덕션 Preview success 및 S0 실물을 확인했다. `ci.yml`은 최종 사용자 지시에 따라 로컬 전용으로 유지하며 원격 CI를 완료 근거로 사용하지 않는다.
- 변경한 파일: T17·CICD·CHECKLIST·LOG 기록과 로컬 전용 `.github/workflows/ci.yml`/`.gitignore` 상태. 공유 저장소에는 `ci.yml`을 추적하지 않는다.
- 변경하지 않은 경계: 앱 코드, ci.yml·auto-merge.yml 내용, upstream 저장소, 유료 플랜.
- 시작 시 기존 변경 보존 여부: 시작 시 작업트리 깨끗함 — 해당 없음.
- 허용 범위와 실제 diff 비교 결과: 배포·설정·문서와 로컬 전용 CI 경계에 한정했으며 앱 기능 코드는 T17 범위에서 변경하지 않았다.

## 2. 완료조건 추적

| ID | 검증 방법 | 결과 | 근거 |
| --- | --- | --- | --- |
| AC-1 | CI run에서 npm ci→검증 재현 | 통과 (선행 완료) | `.nvmrc` 22.12.0, run 29193570731 성공 |
| AC-2 | 로컬 전용 CI 경계·로컬 전체 검증 | 통과 | 사용자 지시에 따라 `ci.yml` 비추적·로컬 전용 유지, CHECKLIST·CICD에 원격 CI 미사용 명시 |
| AC-3 | `gh api` 설정 후 재조회·제약 기록 | 통과 | main protection의 `verify` 설정은 남지만 check producer가 없음을 CICD에 공개하고 원격 강제로 표현하지 않음 |
| AC-4 | auto-merge 경로와 보호 규칙 교차 분석 | 통과 | auto-merge.yml 규칙 1이 main 타겟 PR을 머지하지 않고 스킵 → 보호 대상(main)과 자동 머지 경로 비교차. REST merge API는 보호 미충족 시 405로 차단되어 우회 불가 |
| AC-5 | 프로덕션 URL에서 S0 렌더 확인 | 통과 | Production Domain HTTP 200·답냥이 HTML과 사용자 S0 실물 확인(2026-07-21) |
| AC-6 | 테스트 브랜치 push → 프리뷰 URL 확인 | 통과 | deployment `5516596997` Preview/success·SHA 일치와 사용자 S0 실물 확인(2026-07-21) |
| AC-7 | Vercel 문서·플랜 근거 기록 | 근거 확보 | custom events는 Hobby 미지원·Pro 전용(vercel.com/docs/analytics/limits-and-pricing). 계정 플랜이 Hobby인지 연동 시 확정 → T24는 "미지원 → 제약 기록 + T22 파일럿 대체" 경로 |
| AC-8 | 문서 게이트 + `git diff --check` | 통과 | CICD·CHECKLIST·LOG 최종 상태 반영, 당시 diff 검사 통과 |

## 3. 자동 검증

| 항목 | 명령 또는 방법 | 결과 | 근거·관찰 요약 |
| --- | --- | --- | --- |
| 관련 테스트 | 해당 없음 | 해당 없음 | 코드 변경 없는 설정·배포 작업 |
| 전체 테스트 | `npm test -- --reporter=dot` | 통과(로컬) | commit `86d5b9f`: 24파일 225개, 18.68초. 같은 SHA의 GitHub Actions run은 0건이라 원격 CI 근거로 사용하지 않음 |
| 린트 | `npm run lint` | 통과(로컬) | oxlint 오류 0건 |
| 빌드 | `npm run build` | 통과(로컬) | TypeScript/Vite production build 통과 |
| 변경 형식 | `git diff --check` | 통과 | 공백 오류 0건 |
| 작업별 추가 검증 | CICD.md T17 체크리스트 1~7 대조 | 통과 | Node·Vercel·Production/Preview·실물 근거 확보, 원격 CI는 사용자 결정으로 적용 제외 |

## 4. 수동 검증

| 시나리오 | 환경 | 기대 결과 | 실제 결과 | 상태·근거 |
| --- | --- | --- | --- | --- |
| 프로덕션 고유 deployment URL 접속 | 공개 HTTP | 배포 상태 확인 | Vercel 로그인 URL로 리디렉션된 후 HTTP 200 HTML | 정상 — Standard Protection 대상 |
| 공개 Production Domain 접속 | 공개 HTTP·사용자 브라우저 | 답냥이 앱·S0 렌더 | HTTP 200·한국어 HTML·답냥이 title과 사용자 S0 실물 확인 | 통과 |
| 프리뷰 URL 접속 | 사용자 로그인 브라우저 | 비프로덕션 브랜치 push의 고유 URL 배포 | `5516596997` success와 S0 실물 확인 | 통과 |

## 5. 정본·규칙 확인

- 작업별 정본 정합성: docs/CICD.md와 CHECKLIST의 CI 상태를 현재 커밋 트리에 맞게 보정. 워크플로 파일은 승인 전 무변경.
- MVP 범위 준수: 예 — 배포 세팅만, 계측 구현(T24)·프록시(T18) 미포함.
- 코드 작업인 경우 `any` 미사용 확인 방법: 해당 없음(코드 변경 없음).
- 미치환 필수 항목 없음: 예.
- 남은 위험·알려진 한계: main required `verify`는 설정돼 있지만 공유 커밋 트리에 check producer가 없다. 이는 사용자 지시에 따른 로컬 전용 CI 경계이며 원격 CI 강제로 표현하지 않는다. Preview 고유 URL은 Standard Protection 대상이다.

## 6. 완료 판정·인계

- 필수 AC 전부 통과: 예 — AC-2는 2026-07-22 사용자 결정에 맞춰 로컬 전용 CI 경계로 정정.
- 적용되는 자동·수동 검증 전부 통과: 예.
- 미해결 차단사항 없음: 예 — 원격 CI 미설치는 알려진 제약이며 T17 완료조건에서 제외.
- `docs/CHECKLIST.md` 갱신 여부와 근거: 2026-07-21 사용자 S0 확인으로 T17 완료 반영.
- `docs/LOG.md` 기록 및 계획·검증 보고서 링크: 2026-07-21 완료와 2026-07-22 CI 추적 정정 기록.
- 후속 작업 또는 사용자 판단이 필요한 사항: 최종 배포·실기기는 T23, 전체 통합은 T31에서 검증.

위 조건을 충족하지 못하면 상태를 `통과`로 기록하지 않는다.
