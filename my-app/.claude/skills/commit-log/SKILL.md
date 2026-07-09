---
name: commit-log
description: Compose git commit messages for this repo following its type-prefixed Korean convention (feat/fix/refactor/chore/docs). Use whenever creating a commit in this project.
---

# 커밋 로그 작성

이 스킬은 이 저장소(hub)에서 커밋을 만들기 전에 호출한다. 규칙 원본은 `CLAUDE.md`(이 스킬 파일 기준 `../../../CLAUDE.md`)의 "커밋 규칙" 섹션.

## 절차

1. `git status`/`git diff --cached`로 실제 스테이징된 변경사항을 확인한다. 서로 관련 없는 변경(예: 화면 A 작업 + 화면 B 라우팅 연결)이 섞여 있으면 커밋 전에 분리해서 `git add`한다 — 필요하면 파일별로 나눠서 여러 커밋으로 만든다.
2. 변경 내용에 맞는 type을 고른다.
   - `feat`: 새 기능/화면/컴포넌트 추가
   - `fix`: 버그 수정
   - `refactor`: 동작 변화 없는 구조 개선
   - `chore`: 설정, 의존성, 빌드 등 잡무성 변경
   - `docs`: PROJECT.md/DESIGN.md/WIREFRAME.md/CLAUDE.md/docs 등 문서만 변경
3. 제목을 쓴다: `<type>: <한국어 한 줄 요약>` 형식. 명사형으로 짧게, 마침표 없음.
4. 본문이 필요한지 판단한다 — 트러블슈팅이 있었던 경우에만 1~3줄 추가한다.
   - 버그의 원인을 찾아낸 과정
   - 여러 방법을 시도하다 하나를 선택한 이유
   - `design-reference`/`WIREFRAME.md`/`DESIGN.md`에 없는 내용을 임의로 채운 경우, 무엇을 근거로 채웠는지
   - 단순 추가/수정이라 트러블슈팅이 없었다면 본문 없이 제목만 쓴다.
5. `Co-Authored-By` 트레일러는 추가하지 않는다.
6. 커밋 후 `git log -1`로 실제 반영된 메시지를 확인한다.
