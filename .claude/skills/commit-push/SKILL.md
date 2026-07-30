---
name: commit-push
description: git 커밋 메시지 작성, 브랜치 명명, push를 수행할 때 따라야 할 규칙을 정의합니다. 커밋을 만들거나 push하기 전에 사용하세요.
---

# 커밋/push 규칙

## 커밋 메시지 형식
- `type: subject` 형식을 사용한다. type은 `feat` / `fix` / `refactor` / `docs` 중 하나.
- 커밋 메시지 본문에는 해당 작업 내용의 요약을 포함한다.
- 커밋 메시지에 `Co-Authored-By: Claude` 트레일러를 추가하지 않는다. (GitHub에 공동 작성자로 표시되는 것을 원하지 않음)

## 브랜치 명명 규칙
- `type/short-description` 형식을 사용한다. (예: `feat/schedule-form`)

## push
- 최종 push 이전에 .env, api, 개인정보 등 유출하면 안되는 사항이 push에 포함 되었는지 보안 확인을 수행하고, 발견 시 push를 멈춘 뒤 사용자에게 알린다.