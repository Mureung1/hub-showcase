# 검증 보고서: T32 — 개인 말투 프리셋

> 상태: 통과
>
> 검증일: 2026-07-22
>
> 관련 계획: `plan.md`
>
> 검증 대상: 사용자 승인 후 T32 갱신 구현이 포함된 미커밋 작업트리

## 1. 변경·범위 요약

- 목표 대비 결과: nullable `speechStyleId`를 명시적 사용자 선호로만 유지하고 카드의 관계 기본값은 조회 시에만 계산한다. 신규 직접 설명은 말투 선택 전 생성할 수 없고, 정적 S3는 같은 관계×상황의 검수된 네 말투 세트를 API 없이 즉시 바꾼다.
- 이번 턴의 변경: 관계·카드 선택에서 선호 덮어쓰기를 제거하고, 구세션 카드 결과의 안전 기본 복원과 정적 S3 `말투 바꾸기` 4지선다·live 안내·모바일 배치를 추가했다. 복사·편집·이전 초안 표시는 말투 교체 때 초기화한다.
- 변경하지 않은 경계: T26 generated artifact 288문구, generation 요청·응답, provider·prompt·DB·계측, 이메일 습니다체 고정, AI 결과의 숨은 재호출, 자유 말투 입력.
- 시작 시 기존 변경 보존: 사용자 피드백·T26 미커밋 diff와 사용자 소유 미추적 파일을 되돌리거나 별도 추적하지 않았다.

## 2. 완료조건 추적

| ID | 검증 방법 | 결과 | 근거 |
| --- | --- | --- | --- |
| AC-1 | 도메인·계약 회귀 | 통과 | 네 ID·라벨·예시·관계 허용 계약 유지 |
| AC-2 | 상태·RTL | 통과 | 신규 직접 설명 미선택, 카드 관계 기본값 및 세션 null 검증 |
| AC-3 | 이동·세션 회귀 | 통과 | 용용체 선택이 관계 변경·교수 카드 이동 뒤에도 유지, 오염·초기화는 null |
| AC-4 | 카드·guided 회귀 | 통과 | 카드 선행 선택 없음, 기본 효과 키로 정적·guided 경로 동작 |
| AC-5 | 직접 설명·request 회귀 | 통과 | 목적·말투·모드 입력 전 비활성, 명시 ID 요청 유지 |
| AC-6 | S3 로컬 교체 RTL | 통과 | 4지선다, 정확한 generated 후보 교체, API·loading 0, 복사·편집 초기화 |
| AC-7 | AI 결과 RTL | 통과 | guided/manual AI 결과에서 `말투 바꾸기` 미노출 |
| AC-8 | mock·prompt·공용 계약 | 통과 | 기존 관련 회귀 및 API 타입검사 통과, 계약 변경 없음 |
| AC-9 | generated artifact drift | 통과 | `npm run templates:check`, 96세트·288문구 테스트 통과 |
| AC-10 | RTL·사용자 수동 확인 | 통과 | radio/live text·350px 이하 1열 CSS와 320×568·375×667·키보드 동작 사용자 확인 완료 |
| AC-11 | 전체 자동 gate | 통과 | 43파일 367테스트, 타입검사, lint, build, drift, diff, 미러, `any` 검색 통과 |

## 3. 자동 검증

| 항목 | 명령 또는 방법 | 결과 | 근거·관찰 요약 |
| --- | --- | --- | --- |
| 관련 테스트 | `npm test -- --run src/app/App.test.tsx src/entities/message/situationTemplates.test.ts src/entities/message/message.test.ts src/shared/generation/contracts.test.ts` | 통과 | 4파일 109개. 정적 S3 교체·AI 숨김·명시 선택·세션 복원 포함 |
| 전체 테스트 | `npm test` | 통과 | 43파일 367개. 기존 jsdom `scrollTo` 비차단 로그만 발생 |
| 프론트 타입검사 | `npx tsc -b --pretty false` | 통과 | 오류 0건 |
| API 타입검사 | `npm run typecheck:api` | 통과 | 오류 0건 |
| 템플릿 drift | `npm run templates:check` | 통과 | T26 generated artifact 변경 없음 |
| 린트 | `npm run lint` | 통과 | 오류 0건 |
| 빌드 | `npm run build` | 통과 | main 351.05kB/87.84kB gzip, 기존 lazy CatCanvas 882.64kB 경고 유지 |
| 변경 형식·규칙 | `git diff --check`, `cmp -s AGENTS.md CLAUDE.md`, 대상 `any` 검색 | 통과 | whitespace 오류·미러 차이·명시적 `any` 0건 |

## 4. 수동 검증

| 시나리오 | 환경 | 기대 결과 | 실제 결과 | 상태·근거 |
| --- | --- | --- | --- | --- |
| S2-b·S3 말투 선택 | 320×568·375×667, 키보드 | 무넘침·4지선다·키보드·즉시 문구 교체 | 사용자 `확인완료` 보고 | 통과 — 2026-07-22 사용자 수동 확인 |

## 5. 정본·규칙 확인

- 작업별 정본 정합성: CHECKLIST T32, SPEC 1·2장, SCREENS S2-a·S2-b·S3, EDGE_CASES 1-7·2-1의 명시 선택·카드 기본값·S3 source 분기를 구현했다.
- MVP 범위 준수: generated 검수 세트를 조회할 뿐 런타임 어미 변환·영구 프로필·자유 말투 입력·DB/계측·의존성을 추가하지 않았다.
- `any`: T32 대상 코드 검색과 전체 타입검사·lint로 명시적 사용 0건을 확인했다.
- 남은 위험·알려진 한계: 원시 수동 캡처는 저장하지 않았고 사용자 완료 확인을 근거로 삼는다. 실제 VoiceOver/NVDA 조합별 확인은 T22 전수 접근성 검증 범위다.

## 6. 완료 판정·인계

- 필수 AC 전부 통과: 예 — AC-1~AC-11 통과.
- 적용되는 자동·수동 검증 전부 통과: 예 — 자동 gate와 사용자 모바일·키보드 확인 완료.
- 미해결 차단사항: 없음. T22의 외부 참여자 검증은 별도 항목이다.
- `docs/CHECKLIST.md` 갱신 여부와 근거: T32 완료 체크. 전체 367테스트와 사용자 수동 확인 근거를 같은 항목에 기록했다.
- `docs/LOG.md` 기록 및 계획·검증 보고서 링크: 2026-07-22 구현·자동 통과·사용자 확인 근거를 기록했다.
- 후속 작업: 없음.

위 근거로 T32를 `통과`로 판정한다.
