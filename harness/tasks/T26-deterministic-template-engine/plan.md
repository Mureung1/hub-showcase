# 작업 계획: T26 — 결정적 템플릿 엔진·fallback

> 상태: 종료
>
> 작성일: 2026-07-22
>
> 최종 갱신일: 2026-07-22
>
> 현재 단계: 구현·통합·전체 검증·정본 마감 완료
>
> 다음 행동: 없음 — T26 완료, T22 외부 참여자 gate는 기존 보류 유지
>
> CHECKLIST 항목: T26

## 1. 목표와 완료조건

- 해결할 사용자/제품 문제: 현재 288개 검수 문구는 중첩 상수를 직접 조회하므로 문구별 사실·화행·말투·톤 규칙과 배포 버전, 산출물 drift를 기계적으로 추적할 수 없다.
- 목표 결과: 24개 의미 프레임을 결정적으로 컴파일한 Git 산출물만 앱이 읽고, 같은 카드·말투에서 톤 3개를 API 0회로 즉시 반환한다. guided AI 실패도 같은 조회 키의 기본 초안으로 안전하게 이어지며 승인 manifest만 DB 활성 등록 입력이 될 수 있다.

| ID | 검증 가능한 완료조건 | 검증 방법 | 필수 여부 |
| --- | --- | --- | --- |
| AC-1 | 저작 소스는 허용된 관계×상황 조합과 일치하는 의미 프레임 정확히 24개를 가지며 각 프레임에 facts·intent·슬롯형 realization이 있다. | 컴파일러 단위 테스트 | 필수 |
| AC-2 | 정본 순서로 96세트·288문구를 컴파일하고 현재 T25 검수 원문과 바이트 단위로 동일하며 toneLevel은 항상 1→2→3이다. | 전수 비교 테스트 | 필수 |
| AC-3 | 모든 문구에 고유한 `templateId`, 존재하는 `ruleId`, 승인 bundle version과 필요한 경우 비어 있지 않은 `overrideReason`이 기록된다. | provenance·고유성 테스트 | 필수 |
| AC-4 | manifest는 version·소문자 SHA-256 checksum·`approved` 검수 상태·24/96/288 수치와 문구별 provenance를 가지며 같은 소스에서 항상 같은 checksum을 만든다. | manifest snapshot·결정성 테스트 | 필수 |
| AC-5 | `templates:generate`가 고정 TypeScript 산출물과 manifest를 재생성하고 `templates:check`가 저작 소스와 Git 산출물의 byte drift를 실패 처리한다. | generate/check 명령과 변조 fixture 테스트 | 필수 |
| AC-6 | `templateCandidatesFor(scenarioId, situationId, speechStyleId)`는 생성 산출물만 동기 조회해 기존 `Candidate[] | null` 계약과 원문을 유지하고 `template_fallback`은 네트워크를 호출하지 않는다. | 엔티티·App 회귀 테스트와 fetch spy | 필수 |
| AC-7 | guided AI timeout·429·최종 실패는 다른 카드가 아닌 같은 관계×상황×말투 템플릿을 사용하고 세부 답 미반영 안내를 유지하며, 취소 요청과 manual AI 실패에는 강제 fallback하지 않는다. | App 라우팅·실패 회귀 테스트 | 필수 |
| AC-8 | 승인 manifest와 유효 검수 시각만 `template_versions` 활성 등록 입력으로 변환되고 DB 입력에는 템플릿 본문·사용자 원문이 없다. | API DB 경계 단위 테스트 | 필수 |
| AC-9 | 관련 테스트, `npm run templates:check`, 전체 테스트, API 타입검사, lint, build, diff 검사가 모두 통과하고 하네스·CHECKLIST·LOG가 실제 근거와 일치한다. | 최종 검증 게이트 | 필수 |

## 2. 의존성·정본 확인

- T항목과 의존성 상태: T26 의존 T3·T8·T25는 모두 완료다. 번호가 앞선 T22는 대학생 참여자 5명 미확보로 명시적 보류 상태라 구현 가능한 최선행 항목 T26을 선택했다.
- CHECKLIST 본문이 직접 가리키는 문서·구간: `docs/CHECKLIST.md` T26, `docs/SPEC.md` 2장 생성 API 계약·라우팅과 4장 결정적 컴파일러·버전 계약, `docs/SCREENS.md` S2-d·S3.
- 추가로 확인한 정본: `docs/EDGE_CASES.md` 2-1·2-5·2-6, `harness/tasks/T25-situation-card-templates/plan.md`의 2026-07-20 구조 승인, `docs/LOG.md`의 2026-07-21 T25 전수 검수 완료 근거, `docs/AI_DESIGN.md`의 T26 미완료 경계.
- 이번 작업에서 바꾸지 않는 계약·범위: S0~S3 화면 흐름과 카피, 288개 승인 원문, AI 프롬프트/provider, T35 retrieval, 이메일 템플릿, 런타임 어미 변환 금지, 원문·생성문구 DB 비저장, 새 라이브러리 도입.

## 3. 작업트리 기준선

- 시작 시 `git status --short` 요약: 피드백 반영으로 11개 tracked 파일이 수정돼 있고, 사용자 소유 미추적 `.agents/skills/continue-dabnyangi-task/`, T25 설문 CSV, `tmp/`가 있다.
- 기존 변경 중 반드시 보존할 파일·의도: 발자국 교체, CatStage 깜빡임 수정, 결과 수정 600자 표시, 좌측 중복 특징 칩 제거와 관련 테스트·문서 변경 전부를 보존한다. T26이 겹칠 수 있는 `src/app/App.test.tsx`와 `docs/LOG.md`는 PM이 순차 통합한다.
- 이번 작업이 소유하는 경로: `src/entities/message/templateCompiler/**`, `src/entities/message/situationTemplates.ts`, `src/entities/message/situationTemplates.test.ts`, `scripts/templates-*.ts`, `api/_lib/db/templateVersionRegistration*`, `package.json`, T26 하네스. 완료 시 PM만 `docs/CHECKLIST.md`, `docs/LOG.md`, `docs/AI_DESIGN.md`를 갱신하고 필요한 App 회귀 테스트를 순차 편집한다.

## 4. 5요소 계획

| 요소 | 계획 |
| --- | --- |
| 맥락 | React 19+TypeScript 6+Vite 8 앱의 로컬 정적 템플릿 경로다. `any`·추가 라이브러리·런타임 생성·API 호출·본문 DB 저장 없이, T25 검수 원문을 배포 가능한 결정적 자산으로 전환한다. 완료되면 질문 없는 기본 초안과 guided 장애 fallback의 버전·provenance·drift를 검증할 수 있다. |
| 구체성 | `templateCompiler/contracts.ts`의 계약을 승인 버전에 맞추고, `frames.ts`·`rules.ts`·`compiler.ts`·산출물 serializer와 테스트를 추가한다. `generated/templates.generated.ts`와 `generated/manifest.generated.json`을 Git에 두고 `scripts/templates-generate.ts`·`templates-check.ts`, package scripts를 연결한다. `situationTemplates.ts`는 생성 산출물 조회 어댑터로 축소하고 DB 등록 경계를 실제 manifest 타입과 연결한다. |
| 역할·예시 | PM이 계약·하네스·통합을 소유한다. Backend/AI는 컴파일러·산출물·DB 경계를, Frontend는 기존 조회 공개 계약·App 회귀를 소유하며 Designer는 화면 변경이 없어 비활성이다. 예: `professor/absence_inquiry/haeyo/2` 프레임은 결석과 과제 제출 방법 문의 facts를 가지며 `professor.absence_inquiry.haeyo.2`, 말투×톤 rule ID, 승인 version으로 컴파일되고 조회 결과는 현재 검수 문구와 동일하다. |
| 단계화 | ① PM이 공유 타입·정본 순서·승인 version을 고정하고 기준선 테스트 → ② Backend/AI가 24개 프레임·12개 말투×톤 규칙·순수 컴파일러와 단위 테스트 → ③ serializer·생성 산출물·manifest·generate/check 명령과 drift 테스트 → ④ Frontend가 `templateCandidatesFor`를 산출물 조회로 교체하고 API 0회·null·fallback 회귀 테스트 → ⑤ PM이 DB 승인 경계·전체 diff를 통합하고 전체 게이트·하네스·CHECKLIST·LOG를 마감한다. 각 단계 뒤 관련 테스트와 type/lint 검사를 수행한다. |
| 검증 | 24/96/288 수치, 원문 byte 동일성, 정렬·ID·rule·override·checksum 결정성, drift 실패, 승인 DB allowlist, API 0회, 같은 카드 guided fallback, 취소/manual 경계를 자동 검증한다. 최종 명령은 `npm run templates:check`, 관련 Vitest, `npm test`, `npm run typecheck:api`, `npm run lint`, `npm run build`, `git diff --check`다. 화면·카피가 바뀌지 않으므로 새 시각 검증은 해당 없음으로 기록하되 기존 App 흐름 회귀는 필수다. |

## 5. 변경 경계와 위험

- 허용된 변경: 2026-07-20 승인된 24프레임→고정 산출물 구조, manifest/checksum, 생성·drift 검사, 기존 조회 소비부, 승인 DB 메타데이터 경계와 검증·정본 기록.
- 명시적으로 제외한 변경: 승인된 288문구 재작성, 새 카드·말투·톤, UI 개편, provider/프롬프트/retrieval 변경, 실제 운영 DB 활성 행 쓰기, 의존성 설치, 커밋·push·배포.
- 구조·계약·의존성 승인 지점: 컴파일러 구조는 2026-07-20 사용자 승인 근거가 있다. 계획의 파일 경계·AC가 달라지거나 기존 288문구가 한 글자라도 바뀌면 구현을 멈추고 재승인을 받는다.
- 예상 위험과 대응: 한국어 슬롯 분해가 원문을 바꿀 위험은 byte 전수 비교로 차단한다. 정렬·직렬화 차이는 명시적 정본 배열과 stable serializer로 고정한다. 현재 피드백 diff와 App/LOG 충돌은 PM 단독 순차 통합으로 보호한다. T25 검수 완료 날짜만 근거로 임의 검수 시각을 만들지 않고 실제 DB 등록은 범위에서 제외한다.

## 6. 승인·범위 변경 기록

| 날짜 | 상태 | 승인 또는 변경 내용 | 근거 |
| --- | --- | --- | --- |
| 2026-07-20 | 승인됨 | 단순 중첩 문자열을 24개 의미 프레임→결정적 산출물·manifest/checksum 구조로 전환 | 사용자 `구조 승인합니다`, T25 계획서 기록 |
| 2026-07-22 | 제안 | T25 완료 뒤 T26을 다음 구현 가능 항목으로 `/task-start`; AC·파일 경계·검증 계획 제안 | 사용자 `피드백 사항 다 반영했으면 task-start` |
| 2026-07-22 | 승인됨·진행 중 | 제안한 T26 계획대로 구현 착수 | 사용자 `진행` |

범위나 완료조건이 바뀌면 구현을 중단하고 이 표와 관련 항목을 갱신한 뒤 재승인받는다.

## 7. 진행·인계

- 마지막으로 끝낸 단계: 24개 의미 프레임·12개 규칙·96세트·288문구 산출물·manifest·checksum·drift 검사, 산출물 전용 런타임 조회, DB 승인 경계와 전체 검증.
- 현재 작업 중인 단계: 없음 — T26 종료.
- 다음 행동: CHECKLIST 의존 순서와 외부 gate 상태에 따라 후속 T항목을 별도 `/task-start`.
- 보류 사유와 재개 조건: 없음.

| 날짜 | 진행·결정 | 근거·영향 |
| --- | --- | --- |
| 2026-07-22 | T22 보류를 유지하고 의존 충족 T26을 선택 | T22 참여자 5명 미확보, T26의 T3·T8·T25 완료 |
| 2026-07-22 | 기존 계약·DB 경계는 부분 구현, 컴파일러·산출물·drift 검사는 미구현으로 확인 | `templateCompiler/contracts.ts`, `templateVersionRegistration.ts`, `docs/AI_DESIGN.md` 대조 |
| 2026-07-22 | bundle 계약을 `t25-approved-2026-07-21.1`·`approved`로 고정 | T25 전수 검수 완료일 근거, 실제 검수 시각은 생성하지 않음 |
| 2026-07-22 | Backend/AI가 24프레임·12규칙·컴파일러·Git 산출물·manifest·generate/check·DB 경계를 구현 | 승인 원문 288개 byte 동일, checksum `4ac4ea33750c42164fac4b14d6b43071de122fccf3c5136868beb7ba6261c69f` |
| 2026-07-22 | Frontend가 중복 288문구 상수를 제거하고 generated artifact 전용 동기 조회로 전환 | `Candidate[] | null`·1→2→3·새 객체 반환·API 0회 계약 보존 |
| 2026-07-22 | PM 통합 검증과 Backend/Frontend 공유 경계 교차검토 통과 | 43파일 365테스트, typecheck:api, lint, build, templates:check, diff-check 통과 |
