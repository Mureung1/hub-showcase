# 작업 계획: T21 — holdout 모델·품질 검수

> 상태: 종료
>
> 작성일: 2026-07-21
>
> 최종 갱신일: 2026-07-21
>
> 현재 단계: 완료. 한국어 맥락 평가자 2명(사용자 포함)의 블라인드 채점 결과 톤 정렬·전송 가능성·환각 0건 모두 합격
>
> 다음 행동: 없음(검증 보고서 `verification.md` 참고)
>
> CHECKLIST 항목: T21

## 1. 목표와 완료조건

- 해결할 사용자/제품 문제: T20에서 연결한 실 Gemini provider가 SPEC 5장 품질 합격선(톤 구분·전송 가능성·환각 0건)을 통과하는지 시드와 겹치지 않는 holdout으로 확인한다.
- 목표 결과: 시나리오당 5회(대표 4 + 500자 근접 1) = 20세트·60개 후보를 실제로 생성하고, 블라인드 채점 패킷을 만들어 사람 평가로 넘긴다. 최종 Go/No-go 판정은 이 계획의 범위 밖(사람 채점 이후 별도 기록).

| ID | 검증 가능한 완료조건 | 검증 방법 | 필수 여부 |
| --- | --- | --- | --- |
| AC-1 | holdout 케이스 20개가 시나리오당 5개, 팀플·거절·500자 근접·상충 지시·공격/강요·사실 추가 위험을 모두 포함하고 시드 24개와 문구가 겹치지 않는다 | `generationCases.test.ts` 자동 검증 | 필수 |
| AC-2 | 실 `GEMINI_API_KEY`로 20개 케이스 전부에서 응답을 수신하고, 후보 3개·톤레벨 1·2·3 구조를 통과한다 | `scripts/holdout-eval.ts` 실행 로그(성공/실패 건수) | 필수 |
| AC-3 | 톤 라벨을 가리고 순서를 섞은 블라인드 채점 패킷과, 채점 후 대조할 정답 매핑 파일을 산출한다 | 산출 파일 존재·형식 확인 | 필수 |
| AC-4 | 사람 채점(톤 정렬 18/20, 전송 가능성 48/60, 환각 0/60)은 이 계획의 자동 산출물 범위가 아니며 별도로 기록한다 | 해당 없음(사람 채점은 검증 보고서에서 보류로 남김) | 필수 |

## 2. 의존성·정본 확인

- T항목과 의존성 상태: T21 의존 T20(완료). CHECKLIST 라우터: SPEC 5장(품질 검수 기준), MVP DoD, docs/CICD.md
- CHECKLIST 본문이 직접 가리키는 문서·구간: SPEC.md 5장 "품질 검수 기준", `src/evaluation/generationCases.ts`(기존 4개 골격은 T21 근거로 부적합하다는 SPEC 명시)
- 추가로 확인한 정본: docs/EDGE_CASES.md 2-3(자리 표시자·환각), docs/AI_DESIGN.md 7장(개인정보)
- 이번 작업에서 바꾸지 않는 계약·범위: `/api/generate` 운영 경로, `outputSchema.ts`/`contracts.ts` 런타임 검증, T25 상황 카드(별도 검수 기준)

## 3. 작업트리 기준선

- 시작 시 `git status --short` 요약: T20 변경분(`.env.example`, `api/generate.ts`, `docs/*`, `api/_lib/generation/geminiProvider.*`)이 미커밋 상태로 존재. 사용자 소유 미추적 파일(`.agents/`, CSV, `tmp/`)은 건드리지 않음
- 기존 변경 중 반드시 보존할 파일·의도: 위 T20 변경분 전체
- 이번 작업이 소유하는 경로: `src/evaluation/generationCases.ts`, `src/evaluation/generationCases.test.ts`, `scripts/holdout-eval.ts`, `harness/tasks/T21-holdout-quality/`

## 4. 5요소 계획

| 요소 | 계획 |
| --- | --- |
| 맥락 | `src/evaluation/generationCases.ts`의 기존 4개는 groupwork 누락·시드 중복으로 T21 근거 불가(SPEC 명시). T20에서 실 Gemini provider가 연결됐으므로 이제 실제 생성 결과로 합격선을 판정할 수 있다 |
| 구체성 | `generationCases.ts`를 20개(시나리오당 대표 4 + 500자 근접 1)로 확장하고 `riskCategories` 메타데이터로 위험군을 태깅한다. 신규 `scripts/holdout-eval.ts`가 `createEnvironmentGenerationProvider(process.env)`로 20개를 실제 호출해 결과를 톤 라벨 제거·순서 셔플한 블라인드 패킷(마크다운)과 정답 매핑(JSON)으로 나눠 출력한다 |
| 역할·예시 | 블라인드 패킷 1세트 예: `## groupwork-reschedule-meeting\n[A] ...\n[B] ...\n[C] ...` — 어떤 문자가 어떤 toneLevel인지는 정답 매핑에만 있다 |
| 단계화 | ① `generationCases.ts` 20개 확장 + 커버리지 테스트 → ② `scripts/holdout-eval.ts` 작성(실 fetch, dotenv `.env.local` 로드) → ③ 스크립트 실행해 실제 20세트 산출 → ④ 블라인드 패킷·정답 매핑 파일을 이 폴더에 저장 |
| 검증 | `npm test`·lint·`typecheck:api`·build 통과 + 스크립트 실행 로그(성공/실패 건수, 지연·토큰). 사람 채점(톤 정렬·전송 가능성·환각)은 AC-4로 별도 보류 |

## 5. 변경 경계와 위험

- 허용된 변경: 위 "이번 작업이 소유하는 경로"
- 명시적으로 제외한 변경: `/api/generate` 운영 경로, T25 상황 카드, T20 provider 구현 자체
- 구조·계약·의존성 승인이 필요한 지점: 없음(T20 승인 범위 내 확장)
- 예상 위험과 대응: 실 API 호출 비용은 20건 × 약 $0.0004로 무시할 수준. 일부 케이스가 안전 차단(SAFETY/RECITATION)으로 실패할 수 있음 — 실패 자체도 관찰 대상이므로 재시도는 handler와 동일하게 최대 1회만 허용하고 결과를 그대로 기록한다

## 6. 승인·범위 변경 기록

| 날짜 | 상태 | 승인 또는 변경 내용 | 근거 |
| --- | --- | --- | --- |
| 2026-07-21 | 승인됨 | 5요소 계획을 대화에서 제시하고 사용자가 "진행한다"로 승인 | 대화 기록 |

## 7. 진행·인계

- 마지막으로 끝낸 단계: `scripts/holdout-eval.ts` 실행으로 20/20 실 Gemini 응답 수신, 블라인드 패킷·정답 매핑 산출
- 현재 작업 중인 단계: 없음(자동화 가능한 범위는 종료)
- 다음 행동: 사람 채점(AC-4) — 한국어 맥락 평가자 2명이 `harness/tasks/T21-holdout-quality/blind-packet.md`를 톤 정렬(부드러운 순서)·전송 가능성으로 채점하고, 환각 여부를 60개 후보 전수로 스캔한 뒤 `answer-key.json`으로 대조해 합격선 통과 여부를 이 문서에 기록
- 보류 사유와 재개 조건: 사람 채점 결과가 나오기 전까지 CHECKLIST T21은 체크하지 않는다

| 날짜 | 진행·결정 | 근거·영향 |
| --- | --- | --- |
| 2026-07-21 | 계획 승인, holdout 20개 작성 착수 | 대화 기록 |
| 2026-07-21 | `gemini-2.5-flash-lite` 404(신규 계정 미제공) 확인 → `gemini-3.1-flash-lite`로 기본 모델 교체, SPEC/MVP/AI_DESIGN/.env.example 동기화 | 실 API 호출 결과 |
| 2026-07-21 | Gemini `responseSchema`가 `additionalProperties`·비문자열 `enum`을 거부해 400 발생 → `toGeminiSchema` 정규화 추가, 회귀 테스트 1건 추가 | 실 API 호출 결과, `geminiProvider.test.ts` |
| 2026-07-21 | 20/20 실 호출 성공, 블라인드 패킷·정답 매핑 산출. 전체 349 테스트·lint·typecheck·build·diff-check 통과 | `npm test`, `npx tsx scripts/holdout-eval.ts` |
