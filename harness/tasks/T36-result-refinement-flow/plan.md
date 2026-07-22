# 작업 계획: T36 — 결과 중심 초안 다듬기·비식별 흐름 계측

> 상태: 완료
>
> 작성일: 2026-07-20
>
> 최종 갱신일: 2026-07-21
>
> 현재 단계: 구현·교차 검수·자동/로컬 Chrome 검증 완료
>
> 다음 행동: T24에서 Preview `waitUntil()`·실 DB write·보존 기간·집계 query를 운영 검증
>
> CHECKLIST 항목: T36

## 1. 목표와 완료조건

- 해결할 문제: 답냥이는 초안 도달까지 일반 guided 4탭으로 빠르지만 결과가 마음에 들지 않으면 이전 화면으로 이동하고 기존 초안을 잃는다. 직접 설명 생성 중 입력 변경은 오래된 요청 결과가 최신 입력을 덮을 수 있으며, 실제 이탈 지점은 원문 없는 집계로도 측정하지 못한다.
- 목표 결과: S0~S2와 세 생성 route를 유지하면서 S3를 안전한 다듬기 화면으로 만든다. 기존 초안을 보며 같은 카드 질문에 답하고, 성공 뒤 직전 한 세트를 비교·복원하며, 후보를 서버 전송 없이 직접 고칠 수 있다. 흐름 event는 콘텐츠·사용자/세션 ID 없이 best-effort로 집계한다.

| ID | 검증 가능한 완료조건 | 검증 방법 | 필수 여부 |
| --- | --- | --- | --- |
| AC-1 | template 결과의 `AI로 더 맞추기`는 S3 안에 같은 카드 질문 1개·option 3개를 펼치고 기존 후보를 유지한다 | RTL 상태 전이·API 호출 수 | 필수 |
| AC-2 | guided 결과는 같은 answer 재생성과 `선택한 답 바꾸기`를 구분하고, manual 결과는 입력 수정·상황 카드 복귀를 각각 1탭으로 제공한다 | RTL 탭 수·라벨 검증 | 필수 |
| AC-3 | 성공적으로 후보가 교체될 때만 직전 1세트를 탭 메모리에 보관하고 `현재/이전` 비교와 복원을 제공한다. 실패·로딩에서는 현재 후보를 잃지 않는다 | 성공·timeout·429·실패·복원 테스트 | 필수 |
| AC-4 | 후보별 직접 수정·원문 복원·복사는 현재 탭 로컬 상태에서만 동작하고 수정문을 AI·event API·DB로 보내지 않는다 | RTL·요청 body·schema 금지 필드 테스트 | 필수 |
| AC-5 | manual 입력·목적 변경 중 기존 요청을 취소해 오래된 결과가 최신 입력 화면을 덮지 않는다 | deferred promise 상태 경쟁 테스트 | 필수 |
| AC-6 | context option의 accessible name이 생성 동작을 말하고, 교수 답장/먼저 연락 카피·직접 설명 병렬 위계·카드 요약이 정본과 일치한다 | RTL·카피·접근성 검토 | 필수 |
| AC-7 | event 계약은 `result_shown/refinement_opened/regeneration_requested/copy_succeeded/situation_change`만 허용하고 route·mode·scenario·optional situation/tone만 받는다 | strict parser·unknown key 테스트 | 필수 |
| AC-8 | `interaction_events`는 위 allowlist metadata와 시각만 저장하며 원문·후보·편집문·IP·user/session/device ID 열이 없다. API/DB 실패는 UX를 막지 않는다 | schema/migration/repository/handler·클라이언트 실패 테스트 | 필수 |
| AC-9 | 기존 guided/template/manual/email·세션·복사·placeholder·초점 흐름이 회귀하지 않는다 | 관련·전체 테스트 | 필수 |
| AC-10 | `any` 없이 전체 테스트·API 타입검사·lint·build·Drizzle check·diff가 통과한다 | 최종 gate | 필수 |
| AC-11 | 자리 표시자가 남은 후보는 강조와 `빈칸 채우기` 행동을 함께 제공하고, 편집 진입 시 첫 자리 표시자를 선택해 즉시 대체할 수 있다 | placeholder 단위 테스트·RTL 편집/복사 테스트 | 필수 |
| AC-12 | guided 재생성은 추가 입력 없이 즉시 실행됨을 행동 앞에서 설명하고 `이 선택으로 새 초안 3개 만들기`로 결과를 예고한다. 성공 후에는 수정·복사·이전 초안 비교 안내를 화면에 보인다 | RTL 라벨·안내·로딩·성공 상태 테스트 | 필수 |

## 2. 의존성·정본

- 의존: T9·T10·T12·T18·T30 완료, T34 공유 route·guided context 코드 기반. T34의 실 provider·실브라우저 gate는 T36 자동 검증으로 대체하지 않는다.
- 직접 참조: `docs/SCREENS.md` S2-d/S3, `docs/SPEC.md` 1·2·6장, `docs/UX.md`, `docs/EDGE_CASES.md`, T34 계획·검증.
- 경쟁 흐름 근거: Apple Writing Tools Original/Undo/Revert, Outlook Keep/Discard/Regenerate, Grammarly Accept/Dismiss/Undo, Wordtune 복수 rewrite. 공식 기능 근거일 뿐 답냥이 효과 증거로 표현하지 않는다.
- 유지: 자유 대화형 챗봇 아님, 세 tone 후보, 자동 전송 없음, 로그인·영구 history 없음, 사용자 원문 비저장, 운영 retrieval 비활성.

## 3. 작업트리·소유권

- 시작 상태: T25/T26/T32/T34/T35와 DB·문서 변경이 미커밋 상태다. 모두 보존하고 T36 변경만 경계별로 검토한다.
- 반드시 보존: `.agents/skills/continue-dabnyangi-task/`, T25 설문 CSV, `tmp/`, 로컬 `.github/workflows/` 커밋 제외 규칙.
- PM: 공유 interaction 계약, 정본, harness/CHECKLIST/LOG, 최종 통합.
- 프론트엔드: `MessageFlow`, 결과·context 컴포넌트, CSS, App RTL.
- 백엔드/DB: interaction handler/entry, repository/schema/migration와 서버 테스트.
- 디자이너: 구현 뒤 읽기 전용으로 CTA 위계·카피·320/375·접근성 교차 검토.

## 4. 5요소 계획

| 요소 | 계획 |
| --- | --- |
| 맥락 | React 19+TypeScript/Vite, 새 UI 라이브러리 없음, `any` 금지. 앞단 탭을 억지로 줄이지 않고 결과 이후 반복과 손실을 줄인다. |
| 구체성 | S3 `ResultRefinementPanel`, 직전 `ResultSnapshot`, candidate local edits, stale request 취소, strict `InteractionEvent` parser, `interaction_events` additive migration과 best-effort endpoint를 구현한다. |
| 역할·예시 | template 결과에서 `AI로 더 맞추기`→`제출 시점도 물어보기`를 누르면 기존 template 세 문장은 로딩 동안 유지되고 AI 성공 뒤 이전 초안으로 남는다. `copy_succeeded` body는 `{eventName, mode, scenarioId, route, situationId?, toneLevel}`만 허용한다. |
| 단계화 | ① 정본·공유 event 계약 → ② S3 상태/편집/요청 취소 → ③ event API·DB → ④ 클라이언트 best-effort 연결 → ⑤ 교차 검토·전체 검증 순으로 진행한다. |
| 검증 | 결과 도달 4탭 유지, 반복 탭 감소, 이전 결과 성공 시에만 생성, 실패 보존, 편집문 비전송, event unknown/content key 거절, DB 금지 열, 기존 이메일·세션·복사 회귀와 320/375를 확인한다. |

## 5. 승인 범위·제외

- 승인됨: S3 인라인 같은 카드 질문, 직전 결과 1세트 비교·복원, 후보 로컬 직접 수정·원문 복원, CTA 위계·상태 오류·접근성 수정, 콘텐츠 없는 aggregate event API/DB.
- 제외: 자유 follow-up chat, 새 refinement AI intent/route, screenshot/OCR/clipboard 자동 감지, 계정·영구 history·custom voice 학습, 자동 send/share, 여러 버전 history, 원문·후보·편집문 event 저장.
- 별도 후속: `더 짧게/덜 딱딱하게/핵심 먼저` 같은 새 AI 수정 instruction은 prompt/API 품질 gate가 필요해 이번 범위에서 제외한다.

## 6. 승인·진행 기록

| 날짜 | 상태 | 내용 | 근거 |
| --- | --- | --- | --- |
| 2026-07-20 | 승인됨 | 경쟁 서비스 조사 뒤 결과 중심 인라인 다듬기·직전 결과·로컬 편집·비식별 event 구조 | 사용자 `승인` |
| 2026-07-21 | 완료 | 자리 표시자 후보의 행동명을 `빈칸 채우기`로 구체화하고 첫 빈칸 자동 선택을 추가 | 사용자 “수정해서 바로 보낼 수 있도록” 요청 |
| 2026-07-21 | 완료 | guided 재생성의 사전 행동 안내·즉시 실행 라벨·성공 후 다음 행동 안내를 명시 | 사용자 “구체적으로 어떻게 행동해야 다음 행동이 동작하는지 모를 것” 피드백 |
