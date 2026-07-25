# 개발 프롬프트 모음 (Phase별)

새 세션에서 그대로 복사해 쓰는 지시 프롬프트다. 전부 [instructions.md](../instructions.md) 절차를 타므로, 붙여넣으면 선행조건 확인 → 계약·완료조건 로드 → `npm run verify` → 보고까지 자동으로 돈다. Task·완료조건(C)·계약(S) 매핑은 [backlog.md](../backlog.md) 참고.

> 막히면 프롬프트를 바꿀 필요 없다 — 각 프롬프트에 `BLOCKED로 기록하고 멈춰`가 들어 있어 억지 구현 대신 사유를 보고하고 멈춘다.

## Phase 1 — Brain Dump 완성 (Feat-2)

**T01 (Notion 연동 기반)** ※ 선행: Notion 토큰·DB ID 필요 ([prerequisites.md](../prerequisites.md))

```
docs/instructions.md 절차에 따라 T01(Notion 연동 기반)을 진행해줘.
완료 조건은 checklist.md C01이고, 계약은 skills.md S3야.
Notion 토큰/DB ID가 없으면 BLOCKED로 기록하고 멈춰서 보고해줘.
```

**T02 (category 추가 + Notion 저장)** ※ 선행: T01 완료

```
docs/instructions.md 절차에 따라 T02(Brain Dump category 추가 + Notion 저장)를 진행해줘.
완료 조건은 checklist.md C02, 계약은 skills.md S1·S3야.
category는 skills.md 고정 셋 7개를 z.enum으로 강제해줘.
```

**T13 (모델 비교·결정)** ※ 선행: 없음, 단 T06 착수 전 완료 권장

```
docs/instructions.md 절차에 따라 T13(Solar 외 모델 성능 비교·결정)을 진행해줘.
완료 조건은 checklist.md C13, 계약은 skills.md S1이야.
Solar/GPT-4o-mini/Claude Haiku/Gemini Flash 중 최소 3개에 같은 입력으로
분할 결과를 비교하고, 어떤 모델을 쓸지 근거와 함께 정리해줘.
```

**T14 (Brain Dump 일정 확인 멀티턴)** ※ 선행: T02

```
docs/instructions.md 절차에 따라 T14(Brain Dump 일정 확인 멀티턴)를 진행해줘.
완료 조건은 checklist.md C14, 계약은 skills.md S1(확장)이야.
기한이 없는 항목만 최대 2턴까지 되물어서 scheduledDate/우선순위를 확정해줘.
```

## Phase 2 — 화면·타이머 (Feat-3)

**T15 (타이머 종료 시 완료 확인 + Agent 판단 연장)** ※ 선행: T04

```
docs/instructions.md 절차에 따라 T15(타이머 종료 시 완료 확인 + Agent 판단 연장)를 진행해줘.
완료 조건은 checklist.md C15, 계약은 skills.md S6이야.
agent-design.md는 건드리지 말고, 연장 분은 suggest_break과 같은 패턴으로
모델이 상황을 보고 직접 정하게 해줘.
```

**T16 (Brain Dump 음성 입력)** ※ 선행: 없음

```
docs/instructions.md 절차에 따라 T16(Brain Dump 음성 입력)을 진행해줘.
완료 조건은 checklist.md C16이야. 입력창에 마이크 버튼을 추가해서
음성을 텍스트로 변환해 입력창에 채우게 해줘. 출력은 그대로 텍스트/화면이야.
```

**T17 (마이크로스텝 검토·삭제 화면)** ※ 선행: T02

```
docs/instructions.md 절차에 따라 T17(마이크로스텝 검토·삭제 화면)을 진행해줘.
완료 조건은 checklist.md C17이야. 기존 디자인 기반으로 HTML 프로토타입
먼저 만들고 화면 작업해줘. 카테고리 태그·전체 예상 시간 합계·삭제·
"전부 다시 쪼개기" 버튼 넣고, 확정한 목록만 그 시점에 Notion에 저장하도록
저장 시점을 뒤로 미뤄줘. CompleteScreen도 전체 완료 개수 보여주게 고쳐줘.
```

**T18 (Zero-Input 온보딩 화면)** ※ 선행: T01

```
docs/instructions.md 절차에 따라 T18(Zero-Input 온보딩 화면)을 진행해줘.
완료 조건은 checklist.md C18이야. 기존 디자인 기반으로 HTML 프로토타입
먼저 만들고, 템플릿 복제 → 토큰/DB ID 붙여넣기 순서를 안내하는 화면을 만들어줘.
```

**T03 (One-Focus 실데이터 연결)**

```
docs/instructions.md 절차에 따라 T03(One-Focus View 실데이터 연결)을 진행해줘.
완료 조건은 checklist.md C03이야. 하드코딩 task를 제거하고
저장된 마이크로스텝을 순서대로 순회하게 해줘.
```

**T04 (타이머 지속성)**

```
docs/instructions.md 절차에 따라 T04(Full Screen Timer 지속성)를 진행해줘.
완료 조건은 checklist.md C04야. 새로고침해도 남은 시간이 유지되게
(시작 시각 기준 재계산) 고쳐줘.
```

## Phase 3 — Agent 루프 (Feat-4, 핵심)

이 Phase는 [agent-design.md](agent-design.md)(동결된 설계)를 근거로 진행한다. 순서: T05 → T06 → T08(+T07) → T09 → T10.

**T05 (AgentLog DB + 기록 lib)**

```
docs/instructions.md 절차에 따라 T05(AgentLog Notion DB + 기록/조회 lib)를 진행해줘.
완료 조건은 checklist.md C05, 계약은 skills.md S3야.
DB 구조는 etc/agent-design.md의 AgentLog flat DB(7 property)를 따라줘.
```

**T06 (힘들어 루프 판단 API)**

```
docs/instructions.md 절차에 따라 T06("힘들어" 루프 판단 API)를 진행해줘.
완료 조건은 checklist.md C06, 계약은 skills.md S2야.
cold start(로그 없을 때 reason_chip prior)까지 포함하고,
proposedTool은 정의된 8개로 스키마 강제해줘.
```

**T08 (이유 칩 + 수락/거절 UI)** ※ T07(재판단 시간 게이트)을 함께 넣는다

```
docs/instructions.md 절차에 따라 T08(이유 칩 + 제안/수락/거절 UI)을 진행해줘.
완료 조건은 checklist.md C08이야. onStruggle을 고정 RestSuggestion 대신
이유 칩 → 제안 카드(reason 노출) → 수락/거절 플로우로 교체하고,
T07(재판단 시간 게이트, C07)도 이 흐름에 함께 넣어줘.
```

**T09 (outcome 기록)**

```
docs/instructions.md 절차에 따라 T09(outcome 기록)를 진행해줘.
완료 조건은 checklist.md C09, 계약은 skills.md S4야.
완료 시 즉시 done, 다음 방문 시 이전 날짜 pending 일괄 not_done으로.
```

**T10 (개인화)**

```
docs/instructions.md 절차에 따라 T10(개인화 — 최근 로그 프롬프트 주입)을 진행해줘.
완료 조건은 checklist.md C10, 계약은 skills.md S2·S3야.
반복 거절한 tool/category를 피하도록 최근 로그를 판단 프롬프트에 넣어줘.
```

## Phase 4 — 평가 (Feat-5)

**T11 (Precision/Recall)**

```
docs/instructions.md 절차에 따라 T11(Agent 평가 — 정답 세트 + Precision/Recall)을 진행해줘.
완료 조건은 checklist.md C11, 계약은 skills.md S5야.
정답 세트 파일을 만들고 AgentLog를 읽어 수치를 출력하는 스크립트를 짜줘.
```

## Phase 5 — 화면 디자인 보완

**T12 (화면 디자인 보완)**

```
docs/instructions.md 절차에 따라 T12(화면 디자인 보완)를 진행해줘.
완료 조건은 checklist.md C12야. 이슈 번호는 #18이니까
커밋 메시지에 (#18) 붙이고, 마지막 커밋엔 Closes #18 넣어줘.
```

## 리뷰 (선택, 각 Task 종료 후)

구현 세션 뒤 리뷰를 돌리려면 새 세션에서:

```
docs/report/review.md A절 따라 방금 T0X 구현을 점검해줘.
checklist.md 해당 C 섹션·skills.md 계약과 대조하고,
판정을 report_gpt.md에 append한 뒤 report_claude.md의 확인 줄을 체크해줘.
```
