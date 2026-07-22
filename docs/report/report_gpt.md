# GPT 리뷰 보고 (append-only)

규칙: 이 파일은 읽지 말고 shell append(`cat >> docs/report/report_gpt.md`)로 하단에만 추가한다. 기존 내용 수정·삭제 금지(유일한 예외: [review.md](review.md) 절차에 따라 점검자가 `- 확인:` 줄의 `[ ]`를 `[x]`로 바꾸는 한 줄). 구현 agent는 `- 확인: [ ]` 미체크 항목의 피드백부터 반영한다. 점검 절차는 [review.md](review.md)를 따른다. 형식:

```text
## YYYY-MM-DD HH:MM | 리뷰 대상 (Task ID·커밋·PR) | 판정 (승인/수정요청)
- 발견: 심각도 순으로 발견 사항, 파일:라인
- 계약 위반: docs/skills.md·CLAUDE.md 원칙 위반 여부 (없으면 "없음")
- 권고: 수정 제안 (없으면 "없음")
- 확인: [ ]
```
