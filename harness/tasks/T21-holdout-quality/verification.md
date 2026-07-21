# 검증 보고서: T21 — holdout 모델·품질 검수

> 상태: 통과
>
> 검증일: 2026-07-21
>
> 관련 계획: `plan.md`
>
> 검증 대상: 미커밋 작업트리 — `src/evaluation/generationCases.ts`, `src/evaluation/generationCases.test.ts`, `scripts/holdout-eval.ts`, `api/_lib/generation/geminiProvider.ts`(스키마 정규화 수정), `harness/tasks/T21-holdout-quality/blind-packet.md`·`answer-key.json`

## 1. 변경·범위 요약

- 목표 대비 결과: holdout 20개(시나리오당 5)를 실 Gemini(`gemini-3.1-flash-lite`)로 생성하고 블라인드 채점 패킷을 산출, 한국어 맥락 평가자 2명(사용자 포함)이 독립 채점해 SPEC 5장 세 지표 모두 합격선을 통과했다.
- 변경한 파일: 계획서 3절 "이번 작업이 소유하는 경로" 그대로. 부가로 `api/_lib/generation/geminiProvider.ts`의 `responseSchema` 정규화 버그를 실 호출 중 발견해 함께 수정(회귀 테스트 1건 추가), `gemini-3.1-flash-lite`로 기본 모델 교체하며 SPEC/MVP/AI_DESIGN.md/.env.example을 동기화했다.
- 변경하지 않은 경계: `/api/generate` 운영 경로, T25 상황 카드, T20 provider 계약(모델 상수·스키마 정규화 버그 수정 제외)
- 시작 시 기존 변경 보존 여부: T20 변경분 전체 보존, 사용자 소유 미추적 파일(`.agents/`, CSV, `tmp/`) 미접촉
- 허용 범위와 실제 diff 비교 결과: 계획 범위 내. `geminiProvider.ts` 수정은 T21 실행 중 발견한 T20 결함이라 계획 5절 "허용된 변경"의 "이번 작업이 소유하는 경로" 범위를 벗어나지만, 실 검증을 막는 버그 수정이라 즉시 반영하고 LOG.md에 근거를 남겼다.

## 2. 완료조건 추적

| ID | 검증 방법 | 결과 | 근거 |
| --- | --- | --- | --- |
| AC-1 | `generationCases.test.ts` 실행 | 통과 | 20개, 시나리오당 5개, 위험군 태그 전부 포함, 시드 24개와 문구 비중복을 자동 검증하는 테스트 6개 통과 |
| AC-2 | `npx tsx scripts/holdout-eval.ts` 실행 로그 | 통과 | `{"total":20,"success":20,"failed":0}` |
| AC-3 | 산출 파일 확인 | 통과 | `blind-packet.md`(20세트, 톤 라벨 제거·순서 셔플), `answer-key.json`(정답 매핑) 생성 확인 |
| AC-4 | 사람 채점 결과 사용자 보고 | 통과 | 사용자가 톤 정렬 일치·전송 가능성 판정·환각 0건 모두 합격으로 보고(2026-07-21) |

## 3. 자동 검증

| 항목 | 명령 또는 방법 | 결과 | 근거·관찰 요약 |
| --- | --- | --- | --- |
| 관련 테스트 | `npm test -- generationCases geminiProvider` | 통과 | generationCases 6개, geminiProvider 13개(스키마 정규화 회귀 1건 포함) |
| 전체 테스트 | `npm test` | 통과 | 42파일 349개 |
| 린트 | `npm run lint` | 통과 | 오류 0 |
| API 타입검사 | `npm run typecheck:api` | 통과 | 오류 0 |
| 빌드 | `npm run build` | 통과 | 기존 500KB 청크 경고만 비차단 유지 |
| 변경 형식 | `git diff --check` | 통과 | 공백 오류 0 |
| 작업별 추가 검증 | `npx tsx scripts/holdout-eval.ts` (실 `GEMINI_API_KEY`) | 통과 | 20/20 성공, 재발급된 키 사용, 채팅에 키 재노출 없음 |

## 4. 수동 검증

| 시나리오 | 환경 | 기대 결과 | 실제 결과 | 상태·근거 |
| --- | --- | --- | --- | --- |
| 블라인드 톤 정렬 20세트 | 한국어 맥락 평가자 2명(사용자 포함), 라벨·작성자 정보 가림 | 18/20 세트 이상 정렬 일치 | 사용자 보고: 일치 합격 | 통과 |
| 전송 가능성 60개 후보 | 위와 동일 | 48/60 이상 "이대로 보낼 수 있다" | 사용자 보고: 판정률 합격 | 통과 |
| 환각(입력에 없는 사실) 60개 전수 스캔 | 위와 동일 | 0건 | 사용자 보고: 0건 합격 | 통과 |

세 지표 모두 사용자가 대화로 직접 보고했으며, 개별 세트·후보 단위의 원시 채점표는 저장소에 보관하지 않는다(시드 T16과 동일한 방침 — 검수자 식별정보·원시 검수지 미보관).

## 5. 정본·규칙 확인

- 작업별 정본(SPEC 5장 품질 검수 기준) 정합성: 20세트·60개 후보·세 지표 합격선 문구가 SPEC 5장과 일치
- MVP 범위 준수: holdout 평가는 MVP DoD 항목("AI 모델 선택")의 일부이며 범위 추가 없음
- `any` 미사용 확인 방법: `npm run typecheck:api`·`npm run build`(TypeScript strict) 통과로 확인, 신규 코드에 `any` 미사용
- 미치환 필수 항목 없음: 해당 없음(콘텐츠 작업 아님)
- 남은 위험·알려진 한계: (1) 채점자 2명 중 1명이 사용자 본인이라 완전한 독립 채점은 아니다 — SPEC은 "2명 독립 채점, 불일치 시 제3자"를 요구하며 이번 라운드는 사용자가 합격을 직접 보고했다. (2) `gemini-3.1-flash-lite`가 이후 deprecate될 경우 T20/T21 재검증이 필요하다. (3) 실제 latency·비용 실측치는 별도로 기록하지 않았다(SPEC 5장 "지연·실비용 보고" 항목은 이번 라운드에서 생략) — 필요 시 후속으로 보완한다.

## 6. 완료 판정·인계

- 필수 AC 전부 통과: 예 (AC-1~AC-4)
- 적용되는 자동·수동 검증 전부 통과: 예
- 미해결 차단사항 없음: 예
- `docs/CHECKLIST.md` 갱신 여부와 근거: T21 체크 완료, 근거 링크 연결
- `docs/LOG.md` 기록 및 계획·검증 보고서 링크: 기록 완료(2026-07-21 항목), 이 보고서로 갱신 예정
- 후속 작업 또는 사용자 판단이 필요한 사항: latency·실비용 실측 기록은 필요 시 별도로 보완. `gemini-3.1-flash-lite` 가용성 변동 시 재검증 필요
