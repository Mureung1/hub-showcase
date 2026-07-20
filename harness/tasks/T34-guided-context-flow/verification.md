# 검증 보고서: T34 — 구조화 카드 맥락·guided AI 흐름

> 상태: 부분 완료
>
> 검증일: 2026-07-20
>
> 관련 계획: [`plan.md`](plan.md)
>
> 판정: 코드·자동 회귀 통과 / 실 provider·실브라우저 gate 대기

## 검증 범위

- 4관계×6카드 질문 24개와 질문당 option 3개, 총 72개 stable ID 카탈로그
- `template_fallback | guided_ai | manual_ai` 요청 계약과 서버 정본 ID 해석
- 카드→질문→guided AI, 질문 없는 기본 초안, 직접 설명 AI의 병렬 경로
- 기본 초안 불만족 시 같은 카드 질문으로 이어가기와 guided 실패 시 같은 답변 재시도
- 결정적 fallback, 결과 요약, 세션 복원, 기존 이메일·직접 설명·복사 회귀
- 원문·UI transcript·영구 사용자 ID를 저장하지 않는 metric·DB 경계

실 provider의 한국어 결과 품질과 320×568·375×667 실제 브라우저 화면·키보드·스크린리더 증거는 이번 검증에서 확보하지 않았다.

## 완료조건별 결과

| 완료조건 | 결과 | 근거 |
| --- | --- | --- |
| AC-1 질문·option coverage | 통과 | 카탈로그 전수 테스트에서 24개 카드 조합, 질문 24개, option 72개, stable ID·순서·관계/상황 일치를 검증 |
| AC-2 사실·추측 경계 | 자동 통과 / 최종 사람 검토 대기 | 각 option의 사실과 금지 추론 경계를 typed catalog에 분리하고 날짜·이유·약속·상대 동의를 임의 생성하지 않는 invariant를 검증. 실제 생성문 사람 품질 평가는 T20~T21에 유지 |
| AC-3 요청 discriminated union | 통과 | 세 route의 필수·금지 필드와 unknown key를 검사하고 잘못된 card/question/option 조합을 서버에서 거절 |
| AC-4 세 경로·연속 동선 | 통과 | option 탭은 `guided_ai` 1회 호출, `질문 없이 바로 초안 보기`는 API 0회, 직접 설명은 `manual_ai`. 기본 초안의 `이 상황으로 AI가 다시 써주기`는 같은 카드 질문으로, guided 실패의 `같은 선택으로 AI 다시 만들기`는 같은 answer로 연결 |
| AC-5 서버 신뢰 경계 | 통과 | guided 요청은 stable ID만 받고 서버 카탈로그에서 목적·사실을 복원. UI label·대화 transcript·클라이언트가 만든 사실 데이터는 prompt에 포함하지 않음 |
| AC-6 생성·fallback | 자동 통과 / 실 provider 대기 | guided 성공 후보 3개·toneLevel 1/2/3 검증, timeout·실패 시 같은 카드 결정적 fallback, fallback 후보를 유지한 재시도 상태를 fake provider와 RTL로 검증 |
| AC-7 결과 신뢰 카피 | 통과 | 결과는 `선택한 내용`으로 관계·상황·빠른 답변을 사실대로 표시하고 `반영했다`고 과장하지 않음. 기본 초안과 guided 실패에 서로 다른 AI 후속 CTA 제공 |
| AC-8 비저장 경계 | 통과 | 새 schema·metric에는 받은 메시지·상황 원문·생성문구·UI transcript·영구 사용자 ID가 없고 guided metadata만 allowlist로 기록 |
| AC-9 기존 흐름 회귀 | 자동 통과 / 실브라우저 대기 | 직접 설명 AI·교수 이메일·복사·세션 만료/초기화 회귀 테스트 통과. 320/375 실제 화면과 키보드·스크린리더 수동 증거는 미확보 |
| AC-10 전체 품질 gate | 통과 | 전체 35파일 289개 테스트, API 타입검사, lint, Vite build, Drizzle check, `git diff --check`, AGENTS/CLAUDE 동기화 통과. `api src scripts` 명시적 `any` 검색 0건 |

## 사용자 피드백 반영 동선

1. 질문 없이 본 기본 초안이 마음에 들지 않으면 `이 상황으로 AI가 다시 써주기`를 누른다.
2. 관계·카드·말투를 다시 선택하지 않고 해당 카드의 질문 한 개로 돌아간다.
3. 빠른 답변을 고르면 그 stable ID로 guided AI 세 후보를 만든다.
4. guided AI가 실패해 기본 초안이 표시된 경우에는 `같은 선택으로 AI 다시 만들기`로 질문을 다시 고르지 않고 재요청한다.
5. option에 없는 구체적 사정이 중요하면 두 결과 모두 `내 상황을 직접 설명하기`로 이동한다.

## 자동 검증 결과

- `npm test`: 35파일 289개 통과
- `npm run typecheck:api`: 통과
- `npm run lint`: 통과
- `npm run build`: 통과
- `npm run db:check`: 통과
- `git diff --check`: 통과
- `cmp -s AGENTS.md CLAUDE.md`: 통과
- `api src scripts` 명시적 `any`: 0건
- 기존 비차단 로그: jsdom의 `Window.scrollTo not implemented`, CatCanvas 지연 chunk 500kB 초과 경고

## 현재 판정

- T34 CHECKLIST: 미완료 유지
- 완료된 범위: 공유 계약, 프론트 상태 전이, 서버 검증·prompt 경계, 결정적 fallback, 자동 회귀
- 남은 gate: 실 provider guided 품질·오류 왕복(T20~T21), 320/375 실브라우저·키보드·스크린리더 검증(T31)
