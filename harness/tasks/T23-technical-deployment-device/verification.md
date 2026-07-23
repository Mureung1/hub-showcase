# 검증 보고서: T23 — 기술 배포·실기기 확인

> 상태: 통과
>
> 검증일: 2026-07-23
>
> 관련 계획: [`plan.md`](plan.md)
>
> 검증 대상: Production deployment `5564774983` / `b9d6b2563d666b57a39894d74c106090dc301329` + 미커밋 T23 문서 작업트리

## 1. 변경·범위 요약

- 목표 대비 결과: Production deployment 고정, 공개 HTML·asset, guided/manual 실 API, 자동 회귀, 클라이언트 비밀 비노출을 통과했다. 사용자가 실제 모바일·카카오톡 인앱 브라우저의 네 수동 시나리오도 모두 통과했다고 확인해 T23을 완료한다.
- 변경한 파일: T23 `plan.md`, `manual-checklist.md`, `verification.md`, T23 관련 `docs/LOG.md`.
- 변경하지 않은 경계: 제품 코드·API·DB·Vercel 설정·T22 기준·retrieval 운영 경로.
- 시작 시 기존 변경 보존 여부: ORCH-2·T22 구조 분리 변경과 사용자 소유 미추적 파일을 보존한다.
- 허용 범위와 실제 diff 비교 결과: 제품 코드·배포 설정을 바꾸지 않고 정본 분리와 T23 검증 기록에 한정했다.

## 2. 완료조건 추적

| ID | 검증 방법 | 결과 | 근거 |
| --- | --- | --- | --- |
| AC-1 | CHECKLIST·deployment 전후 조회 | 통과 | 직접 의존 8개 완료. 시작·종료 모두 deployment `5564774983`, SHA `b9d6b2563d666b57a39894d74c106090dc301329`, state `success`; 로컬 HEAD도 동일 |
| AC-2 | Production HTTP·HTML·asset | 통과 | `/` HTTP 200·한국어 HTML·답냥이 title. JS 351,097 bytes·CSS 33,955 bytes·CatCanvas 882,646 bytes 모두 HTTP 200 |
| AC-3 | Production guided/manual 합성 요청 | 통과 | 개인정보 없는 요청 각 1회가 모두 HTTP 200·`source=ai`·tone 1/2/3 정확히 3개 반환. guided는 임의 날짜·시간 없음, manual의 `[과목명]`은 허용 placeholder |
| AC-4 | App·generation 회귀 | 통과 | 전체 44파일 375테스트와 App+handler 집중 2파일 111테스트 통과. template API 0회, guided fallback, manual 보존 계약 포함 |
| AC-5 | 결과 다듬기 회귀·실브라우저 | 통과 | App RTL에서 재생성·이전 1세트·복원·직접 수정·복사·stale/실패 보존 통과. 사용자가 320×568 카드·guided·다듬기와 375×667 template/manual·키보드 시나리오 통과를 확인 |
| AC-6 | dist 비밀 문자열·정본 | 통과 | Production asset명이 로컬 build와 일치하고 `dist`의 `GEMINI_API_KEY|DATABASE_URL|VOYAGE_API_KEY` marker 0건. T22 `Pending`·주장 금지 정본 반영 |
| AC-7 | 320×568·375×667 실제 환경 | 통과 | 사용자가 두 viewport의 지정 흐름과 모바일 이메일 세 복사를 모두 통과했다고 2026-07-23 확인 |
| AC-8 | 카카오톡 인앱 복사 | 통과 | 사용자가 지정한 카카오톡 인앱 복사 fallback 시나리오를 통과했다고 2026-07-23 확인 |
| AC-9 | 전체 자동 gate | 통과 | 테스트·API 타입·templates·DB·lint·build·harness·diff 전부 통과 |

## 3. 자동 검증

| 항목 | 명령 또는 방법 | 결과 | 근거·관찰 요약 |
| --- | --- | --- | --- |
| 전체 테스트 | `npm test` | 통과 | 44파일 375테스트. 기존 jsdom `scrollTo` 미구현 로그만 비차단 |
| 집중 회귀 | App + generate handler | 통과 | 2파일 111테스트 |
| API 타입검사 | `npm run typecheck:api` | 통과 | 오류 없음 |
| 템플릿 drift | `npm run templates:check` | 통과 | 생성 자산 drift 없음 |
| DB schema | `npm run db:check` | 통과 | Drizzle `Everything's fine` |
| 린트 | `npm run lint` | 통과 | oxlint 오류 없음 |
| 빌드 | `npm run build` | 통과 | `tsc -b`·Vite build 통과. 기존 CatCanvas 500 kB 초과 경고만 비차단 |
| 하네스 | `npm run harness:check` | 통과 | 24개 작업 폴더(17 T항목·7 비-T) 정합성 통과 |
| 변경 형식 | `git diff --check` | 통과 | 공백 오류 없음 |
| Production | GitHub deployment + HTTP/API | 통과 | 배포·HTML·asset·guided/manual 자동 검증과 사용자 수동 실기기 확인 완료 |

## 4. 수동 검증

| 시나리오 | 환경 | 기대 결과 | 실제 결과 | 상태·근거 |
| --- | --- | --- | --- | --- |
| 카드·guided/manual·결과 다듬기 | 320×568 실제 브라우저/기기 | 가로 넘침 없이 키보드로 결과·수정·복사 완료 | 사용자가 지정 시나리오 전체 통과 확인 | 통과 — 2026-07-23 사용자 보고 |
| 동일 흐름 | 375×667 실제 브라우저/기기 | 초점·live 안내·복사 완료 | 사용자가 지정 시나리오 전체 통과 확인 | 통과 — 2026-07-23 사용자 보고 |
| 교수·조교 이메일 | 모바일 실제 환경 | 제목·본문·전체 복사와 fallback 완료 | 사용자가 제목·본문·전체 복사를 모두 통과했다고 확인 | 통과 — 2026-07-23 사용자 보고 |
| 카카오톡 인앱 | 실제 모바일 카카오톡 | clipboard 성공 또는 선택 fallback과 안내 | 사용자가 지정 fallback 시나리오 통과 확인 | 통과 — 2026-07-23 사용자 보고 |

## 5. 정본·규칙 확인

- 작업별 정본 정합성: PRD·MVP·CHECKLIST·PLAN·PRODUCT_REVIEW·COMPETITIVE_VALIDATION·CICD·AI_DESIGN·UX에서 T22 후속 가치 검증과 T23/T31 기술 트랙을 분리했다.
- MVP 범위 준수: 새 기능 없이 기술 배포·호환 검증만 수행.
- 코드 작업인 경우 `any` 미사용 확인 방법: 제품 코드 변경 없음. 최종 dist·전체 lint/build로 재확인.
- 미치환 필수 항목 없음: 예.
- 남은 위험·알려진 한계: 기기·OS·브라우저/카카오톡 버전과 원시 캡처는 별도로 수집하지 않았다. 따라서 수동 gate의 근거 수준은 사용자의 2026-07-23 완료 보고이며, 자동 검증과 Production deployment 관찰값은 별도 재현 가능 증거로 유지한다.

## 6. 완료 판정·인계

- 필수 AC 전부 통과: 예.
- 적용되는 자동·수동 검증 전부 통과: 예 — 자동·HTTP/API는 직접 관찰, 수동 네 시나리오는 사용자 완료 보고를 근거로 한다.
- 미해결 차단사항 없음: 예.
- `docs/CHECKLIST.md` 갱신 여부와 근거: 갱신. AC-1~AC-9 통과.
- `docs/LOG.md` 기록 및 계획·검증 보고서 링크: 자동·Production 결과, 수동 완료와 증거 한계를 기록한다.
- 후속 작업 또는 사용자 판단이 필요한 사항: 없음. T31 기술 MVP 통합 DoD로 인계한다.

위 조건을 충족하지 못하면 상태를 `통과`로 기록하지 않는다.
