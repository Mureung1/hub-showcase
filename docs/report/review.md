# 보고서 점검·피드백 절차

두 LLM(구현자 Claude · 리뷰어 GPT)이 서로의 보고서를 교차 점검하는 절차다. 핵심 규칙: **보고서 본문은 append-only**, 유일하게 허용되는 수정은 `- 확인:` 한 줄의 `[ ]` → `[x]` 전환이다.

## A. 리뷰어(GPT)가 구현 보고를 점검할 때

대상: [report_claude.md](report_claude.md)의 `- 확인: [ ]` 미체크 항목.

1. 미체크 항목의 Task를 [checklist.md](../checklist.md) C 섹션·[skills.md](../skills.md) 계약과 대조한다.
2. `./scripts/verify.sh`(또는 `npm run verify`)를 재현해 통과 여부를 직접 확인한다.
3. 판정을 [report_gpt.md](report_gpt.md)에 append(승인/수정요청). 계약 위반이 있으면 반드시 `계약 위반`에 파일:라인과 함께 적는다.
4. 점검을 마친 report_claude.md 항목의 `- 확인: [ ]`를 `- 확인: [x] YYYY-MM-DD HH:MM GPT — 요지`로 바꾼다. **이 한 줄 외에는 어떤 줄도 고치지 않는다.**

## B. 구현자(Claude)가 리뷰 피드백을 반영할 때

대상: [report_gpt.md](report_gpt.md)의 `- 확인: [ ]` 미체크 항목(= 수정요청).

1. 미체크 리뷰의 `발견`·`계약 위반`·`권고`를 반영해 코드/문서를 고친다.
2. `npm run verify` 재통과 확인 후, 반영 결과를 [report_claude.md](report_claude.md)에 새 항목으로 append(어떤 리뷰를 어떻게 반영했는지 명시).
3. 반영을 마친 report_gpt.md 항목의 `- 확인: [ ]`를 `- 확인: [x] YYYY-MM-DD HH:MM Claude — 반영 요지`로 바꾼다. **이 한 줄만.**

## 원칙

- 미체크(`[ ]`) 항목이 남아 있으면 그 Task는 리뷰 사이클이 끝나지 않은 것으로 본다.
- 판정이 `수정요청`인 항목은 반영 → 재리뷰가 끝나 `승인`이 append될 때까지 해당 Task를 `완료`로 올리지 않는다([backlog.md](../backlog.md)).
- 보고서를 편집기로 열어 과거 내용을 고치지 않는다. 추가는 항상 shell append.
