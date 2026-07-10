# Conflict Review Skill

## Purpose

신규 기획이나 변경안이 기존 확정 설정과 충돌하는지 검토한다.

## Checkpoints

- Canon conflict: 세계관, 캐릭터, 퀘스트 상태, 아이템 효과, 시스템 규칙과 직접 충돌하는가.
- Terminology conflict: 같은 이름이나 용어를 다르게 쓰는가.
- Duplicate risk: 이미 존재하는 문서와 중복되는가.
- Scope expansion: 요청하지 않은 NPC, 퀘스트, UI, 리소스, 밸런스 변경이 따라오는가.
- Production impact: 구현, 아트, 사운드, QA 작업이 추가되는가.

## Severity

- `low`: 문구, 명칭, 작은 누락.
- `medium`: 한두 개 문서나 시스템에 영향.
- `high`: 확정 설정과 직접 충돌하거나 넓은 재작업이 필요.

## Rule

근거 없는 충돌은 만들지 않는다. 근거가 약하면 confidence를 낮게 쓰고 확인할 문서를 제시한다.
