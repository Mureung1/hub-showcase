---
name: commit-convention
description: Use when the user asks for a commit message, commit message example, or how to phrase a commit for this project (connect-AIAgentChallenge-26-1/hub). Applies the project's emoji-prefixed conventional-commit format. Does not run git commit itself — only produces the message text for the user to use.
---

# 커밋 메시지 컨벤션

이 저장소는 타입 뒤에 이모지를 붙이는 컨벤션을 사용한다. 커밋 메시지 예시를 요청받으면 아래 표를 따라 작성한다. **실제 `git commit`은 사용자가 직접 실행한다 — 이 스킬은 메시지 문구만 제안한다.**

| 타입 | 이모지 | 형식 | 용도 |
|---|---|---|---|
| feat | ✨ | `feat: ✨ 새 기능 추가` | 새 기능 추가 |
| fix | 🐛 | `fix: 🐛 버그 수정` | 버그 수정 |
| docs | 📄 | `docs: 📄 문서 수정` | 문서 수정 |
| style | 🎨 | `style: 🎨 코드 스타일 수정` | 코드 스타일(포맷팅 등, 로직 변경 없음) |
| refactor | ♻️ | `refactor: ♻️ 리팩터링` | 리팩터링 |
| test | ✅ | `test: ✅ 테스트 추가/수정` | 테스트 추가/수정 |
| chore | 🔧 | `chore: 🔧 설정/기타 작업` | 설정, 빌드, 기타 잡무 |

## 작성 규칙
- 형식: `<타입>: <이모지> <한 줄 요약>` — 요약은 변경의 "무엇"을 간결하게, 필요하면 본문에 "왜"를 추가한다.
- 한 커밋에 여러 타입이 섞이면(예: 기능 추가 + 문서 수정) 커밋을 분리하는 것을 우선 제안한다.
- 예시를 보여줄 때는 실제 변경 내용에 맞는 요약 문구로 채워서 제시한다 (표의 placeholder 문구를 그대로 쓰지 않는다).
