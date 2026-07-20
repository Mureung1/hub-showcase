# 검증 보고서: T19 — 프롬프트 구성

> 상태: 통과
>
> 검증일: 2026-07-15, 2026-07-20
>
> 관련 계획: `plan.md`
>
> 검증 대상: 미커밋 작업트리의 T19 최종 프롬프트 계층

## 1. 변경·범위 요약

- 목표 대비 결과: provider 비종속 프롬프트 계층과 검수 시드 24개 typed 카탈로그·관계별 자동 조립을 완료했다. 실제 provider 통합은 T20으로 분리했다.
- 변경한 파일: `api/_lib/prompt/` 구현 8개·테스트 5개, `docs/SEEDS.md`, `docs/SEEDS_REVIEW.md`, `docs/AI_DESIGN.md`, `docs/CHECKLIST.md`, `docs/LOG.md`, T19 계획·검증 기록. 전체 빌드에서 발견된 기존 T29 에셋 테스트의 Node 내장 모듈 타입 누락은 `src/entities/message/message.test.ts`의 파일 한정 타입 참조로 보정했다.
- 변경하지 않은 경계: 실제 provider·키·DB·프론트 연결·배포.
- 시작 시 기존 변경 보존 여부: 보존. 대규모 미커밋 작업트리의 기존 파일을 되돌리거나 일괄 정리하지 않았다.
- 허용 범위와 실제 diff 비교 결과: 신규 prompt 경계·정본/하네스 기록과 검증을 막던 기존 테스트의 타입 참조 1건 안에 있다. 제품 UI·공용 생성 계약·generation handler/provider는 변경하지 않았다.

## 2. 완료조건 추적

| ID | 검증 방법 | 결과 | 근거 |
| --- | --- | --- | --- |
| AC-1 | API 타입검사 + 구조·참조 검색 | 통과 | 정본의 6개 모듈 책임대로 구현. `src`에서 prompt 모듈 참조 0건이고 React/브라우저 계층 import 0건 |
| AC-2 | 단위 테스트 + 소스 검토 | 통과 | 한국 대학생 조력자, 입력 밖 사실·허위 사유·협박/강요 금지, 자리 표시자, 예시 사실 전이 금지, 데이터 내부 지시 무시를 system에 명시 |
| AC-3 | TypeScript 타입검사 + 규칙 테스트 | 통과 | `Record<ScenarioId, string>` 4종과 `Record<PurposeId, string>` 6종 누락 없이 타입검사·키/말투 테스트 통과 |
| AC-4 | 스키마 단위 테스트 + 공식 문서 대조 | 통과 | `output_config.format.type=json_schema`, 후보 min/max 3, tone enum 1/2/3, 길이, 모든 객체의 `additionalProperties:false` 검증. 톤 중복은 런타임 validator가 차단 |
| AC-5 | 예시 검증 테스트 | 통과 | 정확히 2세트, 동일 관계, 상황/받은 메시지 길이, 후보 3개·톤 1/2/3·중복·유해 표현을 공용 validator로 검증. 불일치 케이스 거절 |
| AC-6 | XML·조립 테스트 + 참조 검색 | 통과 | 예시/current input 분리, `& < > " '` 이스케이프, 받은 메시지 생략/포함, `source`·transcript 비전송 검증 |
| AC-7 | 후처리 테스트 | 통과 | `end_turn`+정상 JSON만 통과. `max_tokens`·`stop_sequence`·`tool_use`·`pause_turn`·`refusal`·context 초과, 잘못된 JSON, 톤 중복, 협박 결과 거절 |
| AC-8 | 운영 시드 카탈로그 + 조립 테스트 | 통과 | 사용자 제3자 검수 완료 승인 기록, 4관계·8세트·24후보 typed 카탈로그, 관계별 답장/먼저 보내기 각 1세트·톤 1/2/3과 자동 builder 조립 검증 |
| AC-9 | 전체 자동 검증 | 통과 | 관련 5파일 38개·전체 24파일 225개 테스트, API 타입검사, lint, build, DB migration check, tracked/untracked diff, 명시적 `any` 검사 통과 |

## 3. 자동 검증

| 항목 | 명령 또는 방법 | 결과 | 근거·관찰 요약 |
| --- | --- | --- | --- |
| 관련 테스트 | `npm test -- api/_lib/prompt --reporter=dot` | 통과 | 5파일 38개 통과 |
| API 타입검사 | `npm run typecheck:api` | 통과 | `tsc -p tsconfig.api.json` 오류 0건 |
| 전체 테스트 | `npm test -- --reporter=dot` | 통과 | 24파일 225개 통과. 기존 jsdom `scrollTo` 미구현 로그만 발생 |
| 린트 | `npm run lint` | 통과 | oxlint 오류 0건 |
| 빌드 | `npm run build` | 통과 | main 265.38kB/77.76kB gzip, lazy CatCanvas 882.64kB/234.53kB gzip. 기존 lazy chunk 500kB 경고만 발생 |
| migration 검사 | `npm run db:check` | 통과 | Drizzle `Everything's fine` |
| 변경 형식 | `git diff --check` + 신규 경로 `git diff --no-index --check` | 통과 | tracked와 untracked 신규 파일 공백 오류 0건 |
| 작업별 추가 검증 | 명시적 `any`·`console`·클라이언트 참조·검수 전 시드·provider 연결·deprecated `output_format` 검색 | 통과 | 대상 명시적 `any`/console 0건, `src` prompt 참조 0건, 운영 코드의 시드/source/transcript/`output_format` 0건, generation handler 연결 0건 |

## 4. 수동 검증

| 시나리오 | 환경 | 기대 결과 | 실제 결과 | 상태·근거 |
| --- | --- | --- | --- | --- |
| 검수 시드 조립 | 서버 단위 테스트 | 관계별 검수 예시 2세트·후보 1/2/3이 현재 입력과 분리되어 조립됨 | 4관계 각각 예시 2세트, 현재 입력과 별도 블록 조립 | 통과 |

## 5. 정본·규칙 확인

- 작업별 정본 정합성: SPEC 1·3장 관계/톤/안전/예시/XML/구조화 출력, EDGE_CASES 1-5·1-6·5-1·5-2, AI_DESIGN 서버 전용 구조와 일치한다. 현재 공식 structured output 필드와 stop reason은 Anthropic 공식 문서에 재대조했다.
- MVP 범위 준수: 실제 호출 없이 직접 설명 AI 경로의 프롬프트 골격만 대상.
- 코드 작업인 경우 `any` 미사용 확인 방법: 대상 TypeScript와 전체 `api` 명시적 `any` 검색.
- 미치환 필수 항목 없음: 예.
- 남은 위험·알려진 한계: 시드는 톤 정렬·전송 가능성 검수를 통과했지만 실 provider 생성 품질·주입 내성은 아직 검증하지 않았다. T20 provider 통합과 T21 holdout에서 확인한다.

## 6. 완료 판정·인계

- 필수 AC 전부 통과: 예 — AC-1~9 통과.
- 적용되는 자동·수동 검증 전부 통과: T19 범위의 시드 검수 승인·자동 검증 통과. 실 provider 수동 검증은 T20 범위다.
- 미해결 차단사항 없음: T19 범위에는 없음.
- `docs/CHECKLIST.md` 갱신 여부와 근거: 2026-07-20 체크 완료. T16·T18 의존 충족과 AC-1~9 통과를 근거로 한다.
- `docs/LOG.md` 기록 및 계획·검증 보고서 링크: 2026-07-15 골격과 2026-07-20 T16 승인·T19 완료 기록 추가.
- 후속 작업 또는 사용자 판단이 필요한 사항: T17 Preview 기반이 준비되면 T20에서 provider adapter·키·클라이언트 HTTP 전환·Preview 검증을 수행한다.

위 조건을 충족하지 못하면 상태를 `통과`로 기록하지 않는다.
