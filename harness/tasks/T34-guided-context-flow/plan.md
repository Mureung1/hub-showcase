# 작업 계획: T34 — 구조화 카드 맥락·guided AI 흐름

> 상태: 완료
>
> 작성일: 2026-07-20
>
> 최종 갱신일: 2026-07-22
>
> 현재 단계: 모든 AC 통과·CHECKLIST 완료 반영
>
> 다음 행동: 없음
>
> CHECKLIST 항목: T34

## 1. 목표와 완료조건

- 해결할 사용자/제품 문제: 카드 선택이 곧 고정 문구가 되는 구조는 빠르지만 실제 맥락을 반영하지 못해 문구 모음집처럼 보이고 신뢰·반복 사용 가치가 낮다.
- 목표 결과: 카드는 상황 구조화의 시작점이 되고, 사용자는 정확히 한 번의 빠른 답변으로 검증 가능한 `GuidedContextSpec`을 만든다. 서버는 그 맥락으로 세 톤을 생성하며 템플릿은 즉시 보기·장애 fallback·품질 기준선으로 유지한다.

| ID | 검증 가능한 완료조건 | 검증 방법 | 필수 여부 |
| --- | --- | --- | --- |
| AC-1 | 4관계×6카드 24조합에 질문 정확히 1개와 질문당 빠른 답변 3개가 있고 ID·순서·관계/상황 coverage가 고정된다 | 카탈로그 전수 테스트 | 필수 |
| AC-2 | option은 사용자가 고른 사실·의도만 담고 날짜·이유·약속·상대 동의 같은 미입력 사실을 만들지 않는다 | 카탈로그 invariant·사람 검토 | 필수 |
| AC-3 | `template_fallback / guided_ai / manual_ai` 요청을 discriminated union으로 구분하고 금지 필드 조합·알 수 없는 question/option ID를 거절한다 | 공용 계약·handler 테스트 | 필수 |
| AC-4 | 카드 선택 후 질문 한 개의 빠른 답변 탭이 곧 `guided_ai` 생성 요청이 되고, `질문 없이 바로 초안 보기`와 직접 설명 경로도 같은 S2에서 유지된다. 기본 초안 결과는 같은 카드 context로, guided 실패 fallback은 같은 answer로 AI 재시작할 수 있다 | RTL·상태 전이 테스트 | 필수 |
| AC-5 | guided AI는 서버 정본 카탈로그에서 answer ID를 해석해 prompt 데이터 블록을 만들며 UI 문구·대화 transcript를 신뢰하거나 전송하지 않는다 | prompt·handler 테스트 | 필수 |
| AC-6 | guided AI 성공은 toneLevel 1·2·3 후보를 기존 structured output validator로 검증하고, 실패·timeout·provider 미설정에서는 같은 카드의 결정적 템플릿 fallback을 제공한다 | provider fake·RTL 테스트 | 필수 |
| AC-7 | 결과는 선택한 관계·상황·빠른 답변을 사용자 언어로 요약하고, fallback/AI를 의미 반영 완료로 과장하지 않는다. 템플릿 불만족 시 기존 선택을 버리지 않고 AI로 전환한다 | 카피·RTL·디자이너 검토 | 필수 |
| AC-8 | 받은 메시지·상황 원문·생성문구·UI transcript·영구 사용자 ID를 새 로그/DB에 저장하지 않는다 | schema/repository/metric 직렬화 테스트 | 필수 |
| AC-9 | 기존 직접 설명 AI·교수 이메일·복사·세션 만료/초기화·접근성 흐름이 회귀하지 않는다 | 관련·전체 테스트 | 필수 |
| AC-10 | `any` 없이 전체 테스트·API 타입검사·lint·build·diff가 통과한다 | 최종 게이트 | 필수 |

## 2. 의존성·정본 확인

- 의존: T2·T3·T5·T7~T9·T12·T18·T19·T20·T21·T25·T32가 완료되어 T34 착수·마감 조건을 충족한다. T33 이메일 회귀도 2026-07-22 완료했다.
- CHECKLIST 직접 참조: T7·T8·T12·T18·T19·T25·T32, SPEC 1~4장, SCREENS S2/S3, EDGE_CASES 1-3·1-5·2-3·2-5·2-6.
- 추가 정본: `docs/AI_DESIGN.md`, `docs/MVP.md`, `docs/PRD.md`.
- 변경하지 않는 계약: 자유 대화형 챗봇 아님, 자율 agent loop 없음, 후보 3개 toneLevel 순서, 서버 structured output·validator, 템플릿 런타임 어미 변환 금지, 원문 비저장.

## 3. 작업트리 기준선

- 재개 상태: T34 공유 계약·UI·서버·fallback 코드는 이미 존재하고 관련 7파일 165테스트가 통과한다. 중복 구현 없이 남은 검증 gate만 마감한다.
- 반드시 보존: `.agents/skills/continue-dabnyangi-task/`, `T25 대표 문구 평가 설문지(응답) - 설문지 응답 시트1.csv`, `tmp/`; `.github/workflows/`는 커밋 제외.
- PM 소유: AGENTS/CLAUDE 동기화, SPEC·SCREENS·MVP·PRD·AI_DESIGN·CHECKLIST, 공유 ContextSpec/request 계약, 하네스·LOG, 최종 통합.
- 제품 디자이너: 질문/option 카탈로그·신뢰 카피와 읽기 전용 최종 검토.
- 프론트엔드: 질문 UI·상태/세션·결과 요약·fallback 상호작용과 RTL/CSS.
- 백엔드·AI: guided request handler·prompt·metrics·fallback과 서버 테스트.

## 4. 5요소 계획

| 요소 | 계획 |
| --- | --- |
| 맥락 | React 19·TypeScript 6·Vite 8과 기존 서버 계약을 유지한다. 새 기능·라이브러리·`any`·구조 변경 없이 이미 구현된 guided 흐름이 실제 사용 가능하다는 증거를 완성한다. |
| 구체성 | `guidedContext.ts`의 24질문·72옵션을 사용자 검토표와 테스트로 동기화한다. 기존 `GenerationRequest`, `GuidedContextStep`, handler/prompt/fallback은 변경하지 않고 명확한 문구 결함이 발견될 때만 해당 문구·테스트를 최소 수정한다. |
| 역할·예시 | `groupwork + schedule + co.groupwork.schedule.ask_availability`는 ID만 서버에 보내고, 서버가 `상대가 가능한 시간을 질문하되 특정 후보 시간은 만들지 않는다`로 해석해 tone 1·2·3을 생성한다. UI label·transcript·받은 원문은 전송하지 않는다. |
| 단계화 | ① 현재 관련 회귀 기준선 → ② 검토표·동기화 검사 → ③ Production `guided_ai` 1회 정상 왕복 → ④ 전체 자동 gate → ⑤ 사용자 24질문·모바일·키보드·스크린리더 확인 → ⑥ CHECKLIST·LOG 마감. |
| 검증 | 24/72 coverage·review drift, unknown/mismatched ID 거절, option 탭 1회 호출, 같은 카드 fallback, 원문·UI 문구 비전송, 직접 설명·이메일·세션 회귀, 320/375 무넘침·option 전체 폭·초점·live status를 확인한다. 자동은 관련·전체 Vitest, 프론트/API 타입, `templates:check`, DB check, lint, build, diff·미러·대상 `any` 게이트를 적용한다. |

## 5. 변경 경계와 위험

- 허용: guided context 질문 정확히 1개·option 3개, 세 요청 경로, mock/실 provider 공통 서버 경계, 결정적 fallback, 결과 반영 요약, 관련 정본·테스트.
- 제외: 자유 대화, AI가 질문을 생성하는 기능, 로그인·히스토리·피드백, 사용자 원문 저장, 자동 전송, 결제, 런타임 agent loop.
- 별도 T35: pgvector retrieval·embedding ingestion·offline 비교 평가는 T35가 소유하며 T34는 selector interface와 static fallback만 소비한다.
- 위험: 질문 수가 늘어 카드의 속도를 잃지 않도록 질문 정확히 1개·옵션 3개를 hard limit으로 둔다. 옵션으로 표현할 수 없는 구체 사실은 추측하지 않고 직접 설명 경로로 보낸다.

## 6. 승인·범위 변경 기록

| 날짜 | 상태 | 승인 또는 변경 내용 | 근거 |
| --- | --- | --- | --- |
| 2026-07-20 | 승인됨 | 카드를 고정 템플릿의 최종 선택이 아니라 상황 구조화 시작점으로 전환하고 핵심 질문 1개 뒤 AI 세 톤 생성, 템플릿 fallback 유지 | 사용자 `진행합니다` 및 제품 설계 전수 검토 |
| 2026-07-22 | 재개 | 이미 구현된 T34를 중복하지 않고 실 provider·사람 문구·모바일 증거만 마감 | 사용자 `확인완료 진행`, 관련 7파일 165테스트 기준선 통과 |

## 7. 진행·인계

- 마지막으로 끝낸 단계: 정본과 byte 단위로 동기화되는 24질문·72옵션 사용자 검토표를 작성했다. Production `guided_ai` 합성 요청 1회가 HTTP 200·tone 1/2/3을 반환했고 특정 시간을 지어내지 않았다.
- 현재 작업 중인 단계: 없음. T34 완료.
- 다음 행동: 상위 CHECKLIST의 다음 착수 가능 항목으로 이동한다.
- 보류 사유와 재개 조건: 없음.

| 날짜 | 진행·결정 | 근거·영향 |
| --- | --- | --- |
| 2026-07-20 | T34 착수 | 사용자 신뢰·기술 완성도를 함께 높이는 구조 전환 승인 |
| 2026-07-20 | 질문 수 1개로 고정 | 3~4탭 기본 흐름과 모바일 인지 부담을 유지하는 제품 설계 결정 |
| 2026-07-20 | 템플릿 결과→AI 전환 추가 | 기본 초안이 마음에 들지 않아도 관계·카드·빠른 답변을 다시 선택하지 않도록 사용자 피드백 반영 |
| 2026-07-20 | 코드·자동 회귀 통과 | 질문 24개·option 72개, 세 route, 서버 정본 해석, fallback·재시도와 전체 35파일 289개 검증. 실 provider·실브라우저 gate는 유지 |
| 2026-07-22 | 마감 검증 재개 | 관련 7파일 165개 기준선과 검토표 동기화 테스트 통과. Production `guided_ai` 합성 요청은 HTTP 200으로 세 톤과 허용된 선택 메타데이터만 반환 |
| 2026-07-22 | 전체 자동 gate 통과 | 전체 43파일 369개, 프론트·API 타입, `templates:check`, `db:check`, lint, production build 통과. 기존 jsdom `scrollTo`·CatCanvas 500kB 경고만 비차단 |
| 2026-07-22 | 사용자 확인·완료 | 24질문·72옵션 문구와 320×568·375×667·키보드·스크린리더 확인 완료를 사용자가 보고. AC-2·7·9와 CHECKLIST T34 완료 |
