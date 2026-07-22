# 검증 보고서: T36 — 결과 중심 초안 다듬기·비식별 흐름 계측

> 상태: 완료
>
> 검증일: 2026-07-20
>
> 관련 계획: [`plan.md`](plan.md)
>
> 판정: 통과

## 완료조건별 결과

| 완료조건 | 결과 | 근거 |
| --- | --- | --- |
| AC-1 | 통과 | template 결과에서 `AI로 더 맞추기`가 S3 안의 같은 카드 질문·option 3개를 펼친다. 선택·로딩·실패 중 기존 후보를 유지하는 RTL 통과 |
| AC-2 | 통과 | guided의 같은 선택 재생성과 답 변경, manual의 입력 수정과 1탭 상황 복귀를 원인별 CTA로 분리 |
| AC-3 | 통과 | 성공한 후보 교체에서만 직전 한 세트를 보관한다. 현재/이전 보기·복원 swap, 편집문 snapshot, 429·timeout·실패 보존 RTL 통과 |
| AC-4 | 통과 | 후보별 로컬 직접 수정·원문 복원, 600자·빈 문장 방어, textarea 복사 선택 fallback과 편집문 비전송 검증 |
| AC-5 | 통과 | manual 목적·말투·받은 메시지·상황 변경이 request ID를 무효화해 늦은 응답을 폐기하는 deferred 상태 경쟁 RTL 통과 |
| AC-6 | 통과 | option 동작 이름, 카드/선택 요약, 교수 모드별 카피, S2 두 경로 설명, 완료 live 안내와 패널·버전·편집 초점을 보완. 디자이너 재검수 승인, CTA 대비 8.61:1~9.82:1 |
| AC-7 | 통과 | 공용 strict parser가 event 5종과 route·mode·scenario·optional situation/tone만 허용한다. unknown/content/identifier key 거절 테스트 통과 |
| AC-8 | 통과 | `POST /api/interaction` 400/429/202와 DB·scheduler 실패 격리, 7열 allowlist repository·additive migration·DB CHECK 테스트 통과. 실제 Preview write는 T24로 분리 |
| AC-9 | 통과 | template/guided/manual/email·세션·복사·placeholder·초점 회귀를 포함한 전체 40파일 330개 테스트 통과 |
| AC-10 | 통과 | API 타입검사, lint, production build, Drizzle check, retrieval eval, diff check, AGENTS/CLAUDE 동기화, production TypeScript `any` 0건 통과 |
| AC-11 | 통과 | `[부탁할 내용]` 강조·`빈칸 채우기` 라벨·편집 진입 시 첫 자리 표시자 선택·완성문 복사를 단위 테스트와 App RTL로 검증 |
| AC-12 | 통과 | guided 결과에서 추가 입력 없이 즉시 실행됨을 설명하고 `이 선택으로 새 초안 3개 만들기`→생성 중 라벨→화면상 성공·수정/복사/비교 안내까지 App RTL로 검증 |

## 현재 판정

- T36 CHECKLIST: 완료
- S0~S2와 세 생성 route는 유지하고 S3의 결과 반복·손실·오래된 요청 문제만 개선했다.
- 생성문·직접 수정문·사용자/세션 식별자를 상호작용 event와 DB에 넣지 않는다. 식별자가 없으므로 event 수를 개인별 funnel·실제 전송·효과로 해석하지 않는다.

## 검증 명령과 결과

- `npm test -- src/app/App.test.tsx --run` → 77/77 통과
- interaction/backend 집중 테스트 → 7파일 36개 통과
- `npm test` → 40파일 330개 통과
- `npm run typecheck:api` → 통과
- `npm run lint` → 통과
- `npm run build` → 통과. 기존 lazy `CatCanvas` 500kB 초과 경고만 유지
- `npm run db:check` → 통과
- `npm run retrieval:eval` → 통과, 기존 정본대로 `productionEligible=false`
- `git diff --check` → 통과
- `cmp -s AGENTS.md CLAUDE.md` → 통과
- `rg -n "\\bany\\b" api src scripts --glob '*.ts' --glob '*.tsx'` → 일치 0건

## 로컬 Chrome·디자인 교차 검수

- headless Chrome에서 실제 S0→S3 template→인라인 질문을 클릭해 375×667과 320×568을 렌더했다.
- 375px은 viewport/document scroll width가 모두 375px, 320px은 모두 320px으로 가로 overflow가 없었다. 각 폭에서 결과 묶음과 인라인 패널의 좌우 경계가 viewport 안에 있었다.
- 인라인 생성 성공 뒤 active element가 결과 `H2`, live 문구가 `새 초안 3개가 준비됐어요.`, 이전 초안 제어가 생성됨을 확인했다.
- 이전 초안 전환 뒤 active element가 `이전 초안 후보` region, 복원 뒤 `현재 초안 후보` region으로 이동하고 두 상태 모두 가로 overflow가 없음을 확인했다.
- 320px 직접 수정 뒤 active element가 `기본 초안 직접 수정` textarea이고 textarea 높이 132px, 복사 버튼 높이 54px, 가로 overflow 없음으로 확인했다. 320px 보조 편집 버튼은 한 열로 보정했다.
- 제품 디자이너 재검수에서 CTA 대비·완료 안내·패널 닫기·버전 전환/복원·textarea 초점·S2 두 경로 설명이 승인됐다.

## 운영·수동 잔여 gate

- 실제 Neon migration/write는 실행하지 않았다. Preview same-origin 요청, `waitUntil()` 수명주기, 실 DB CHECK, 보존 기간과 집계 query는 T24에서 검증한다.
- VoiceOver/NVDA의 live·description 발화, 실제 모바일 가상 키보드, 카카오톡 인앱 브라우저 선택 복사는 별도 수동 호환성 확인이 남는다. 이는 구현 완료를 실제 접근성 사용자 검증이나 운영 호환 완료로 과장하지 않기 위한 잔여 gate다.
- jsdom의 기존 `Window.scrollTo not implemented` 로그는 실제 Chrome 검증과 별개인 비차단 경고다.
- 커밋·푸시는 수행하지 않았고 `.github` 경로를 수정하거나 포함하지 않았다.

## 2026-07-21 후속 UX 검증

- `findFirstPlaceholderRange`가 첫 `[...]`·`OO` 범위를 반환하고 빈칸이 없으면 `null`을 반환하는 단위 테스트를 추가했다.
- App RTL에서 빈칸 후보 3개의 `빈칸 채우기` 노출, 편집 진입 뒤 `[부탁할 내용]` 자동 선택, 사용자가 채운 완성문만 클립보드로 복사됨을 검증했다.
- 관련 2파일 82개·전체 41파일 344개 테스트, lint, production build, `git diff --check`가 통과했다. 기존 jsdom `scrollTo` 로그와 lazy `CatCanvas` 500kB 경고만 비차단으로 유지됐다.
- 인앱 브라우저는 이 세션에서 사용 가능한 브라우저가 없어 실제 화면 검증을 실행하지 못했다. 기존 카드 구조와 CSS 치수는 바꾸지 않았고, 실기기·인앱 브라우저 확인은 기존 T22·T23 수동 gate에 남긴다.

### guided 재생성 행동 안내

- 모호한 `같은 선택으로 다른 표현 만들기`를 `이 선택으로 새 초안 3개 만들기`로 바꾸고, 버튼 앞에 현재 답 유지·추가 입력 불필요·즉시 생성 결과를 설명했다. 버튼은 이 설명을 accessible description으로 참조한다.
- 생성 중에는 `새 초안 3개 만들고 있어요…`, 성공 뒤에는 화면에 `새 초안 3개가 준비됐어요.`와 수정·복사·이전 초안 비교 안내를 표시한다. 기존 결과 보존·직전 한 세트 복원 계약은 유지했다.
- App RTL 78개·전체 41파일 349개 테스트, lint, production build, `git diff --check`가 통과했다. 기존 jsdom `scrollTo` 로그와 lazy `CatCanvas` 500kB 경고만 비차단으로 유지됐다.
