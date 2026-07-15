# 검증 보고서: T19 — 프롬프트 구성

> 상태: 보류
>
> 검증일: 2026-07-15
>
> 관련 계획: `plan.md`
>
> 검증 대상: 미커밋 작업트리의 T19 코드 우선 프롬프트 골격

## 1. 변경·범위 요약

- 목표 대비 결과: provider 비종속 T19 프롬프트 골격과 자동검증을 완료했다. 실제 검수 시드와 provider 통합이 없어 T19 전체는 보류한다.
- 변경한 파일: `api/_lib/prompt/` 구현 6개·테스트 4개, `docs/AI_DESIGN.md`, `docs/CHECKLIST.md`, `docs/LOG.md`, T19 계획·검증 기록. 전체 빌드에서 발견된 기존 T29 에셋 테스트의 Node 내장 모듈 타입 누락은 `src/entities/message/message.test.ts`의 파일 한정 타입 참조로 보정했다.
- 변경하지 않은 경계: 실제 시드·provider·키·DB·프론트 연결·배포.
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
| AC-6 | XML·조립 테스트 + 참조 검색 | 통과 | 예시/current input 분리, `& < > " '` 이스케이프, 받은 메시지 생략/포함, `source`·transcript·운영 시드 import 없음 검증 |
| AC-7 | 후처리 테스트 | 통과 | `end_turn`+정상 JSON만 통과. `max_tokens`·`stop_sequence`·`tool_use`·`pause_turn`·`refusal`·context 초과, 잘못된 JSON, 톤 중복, 협박 결과 거절 |
| AC-8 | 운영 시드 + provider/preview | 보류 | `docs/SEEDS.md` 실제 제3자 검수와 T18 provider·키 게이트 뒤 수행 |
| AC-9 | 전체 자동 검증 | 통과 | 관련 4파일 24개·전체 15파일 113개 테스트, API 타입검사, lint, build, tracked/untracked diff, 명시적 `any` 검사 통과 |

## 3. 자동 검증

| 항목 | 명령 또는 방법 | 결과 | 근거·관찰 요약 |
| --- | --- | --- | --- |
| 관련 테스트 | `npm test -- api/_lib/prompt` | 통과 | 4파일 24개 통과 |
| API 타입검사 | `npm run typecheck:api` | 통과 | `tsc -p tsconfig.api.json` 오류 0건 |
| 전체 테스트 | `npm test -- --reporter=dot` | 통과 | 15파일 113개 통과. 기존 jsdom `scrollTo` 미구현 경고만 발생 |
| 린트 | `npm run lint` | 통과 | oxlint 오류 0건 |
| 빌드 | `npm run build` | 통과 | 첫 실행에서 기존 T29 에셋 테스트의 Node 타입 누락 발견 → 파일 한정 타입 참조 후 통과. main 225.41kB/70.91kB gzip, lazy CatCanvas 882.64kB/234.54kB gzip의 기존 크기 경고만 발생 |
| 변경 형식 | `git diff --check` + 신규 경로 `git diff --no-index --check` | 통과 | tracked와 untracked 신규 파일 공백 오류 0건 |
| 작업별 추가 검증 | 명시적 `any`·`console`·클라이언트 참조·검수 전 시드·provider 연결·deprecated `output_format` 검색 | 통과 | 대상 명시적 `any`/console 0건, `src` prompt 참조 0건, 운영 코드의 시드/source/transcript/`output_format` 0건, generation handler 연결 0건 |

## 4. 수동 검증

| 시나리오 | 환경 | 기대 결과 | 실제 결과 | 상태·근거 |
| --- | --- | --- | --- | --- |
| 실 provider structured output | Vercel preview | 검수된 예시와 실제 provider가 정상 완료 JSON을 반환하고 후처리됨 | 선행 게이트 뒤 수행 | 보류 — AC-8 |

## 5. 정본·규칙 확인

- 작업별 정본 정합성: SPEC 1·3장 관계/톤/안전/예시/XML/구조화 출력, EDGE_CASES 1-5·1-6·5-1·5-2, AI_DESIGN 서버 전용 구조와 일치한다. 현재 공식 structured output 필드와 stop reason은 Anthropic 공식 문서에 재대조했다.
- MVP 범위 준수: 실제 호출 없이 직접 설명 AI 경로의 프롬프트 골격만 대상.
- 코드 작업인 경우 `any` 미사용 확인 방법: 대상 TypeScript와 전체 `api` 명시적 `any` 검색.
- 미치환 필수 항목 없음: 예.
- 남은 위험·알려진 한계: 검수 완료 시드와 실 provider가 없어 실제 생성 품질·주입 내성을 주장할 수 없다.

## 6. 완료 판정·인계

- 필수 AC 전부 통과: 아니요 — 코드 우선 범위 AC-1~7·9는 통과했지만 AC-8 운영 시드/provider 통합이 보류다.
- 적용되는 자동·수동 검증 전부 통과: 현재 적용 가능한 자동 검증은 전부 통과. 실 provider 수동 검증은 보류.
- 미해결 차단사항 없음: 코드 우선 골격에는 없음. T19 전체 완료에는 선행 게이트가 있다.
- `docs/CHECKLIST.md` 갱신 여부와 근거: 완료 체크는 유지하지 않는다.
- `docs/LOG.md` 기록 및 계획·검증 보고서 링크: 2026-07-15 T19 코드 우선 골격 기록과 링크 추가.
- 후속 작업 또는 사용자 판단이 필요한 사항: T16 실제 검수와 T18 provider 연결 뒤 운영 예시 주입·preview 검증.

위 조건을 충족하지 못하면 상태를 `통과`로 기록하지 않는다.
