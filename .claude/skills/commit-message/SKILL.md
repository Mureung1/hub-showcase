---
name: commit-message
description: 이 프로젝트의 커밋 메시지를 작성할 때 사용. staged 변경을 분석해 `<type>: <한글 설명>` Conventional Commits 형식(feat/fix/docs/style/refactor/test/chore 등)으로 메시지를 만든다. 커밋을 만들거나 사용자가 커밋 메시지를 요청할 때 항상 이 규칙을 따른다.
---

# 커밋 메시지 컨벤션

이 저장소는 **Conventional Commits 형식 + 한글 설명**을 사용한다.

## 형식

```
<type>: <한글 설명>
```

- 한 줄 제목(subject)이 기본. 소문자 타입 + 콜론 + 공백 + 한글 설명.
- 설명은 **무엇을 했는지**를 명사형 어미로 간결하게. 마침표 없음.
  - 좋은 예: `feat: 프로토타입 페이지 추가`, `docs: 프로젝트 문서 추가 및 README 정리`, `chore: 프로젝트명을 first-pr로 변경`
- 제목은 50자 내외 권장. 길어지면 본문(빈 줄 후)에 상세 설명.

## type 종류

| type | 사용 시점 |
| --- | --- |
| `feat` | 새 기능·화면·컴포넌트 추가 |
| `fix` | 버그 수정 |
| `docs` | 문서(README, docs/, CLAUDE.md 등)만 변경 |
| `style` | 동작 변화 없는 포맷·세미콜론·공백 등 |
| `refactor` | 기능 변화 없는 코드 구조 개선 |
| `test` | 테스트 추가·수정 |
| `chore` | 빌드·설정·의존성·프로젝트 관리 (예: 프로젝트명 변경, .gitignore 수정) |
| `design` | UI/스타일 산출물 변경 (design.md·디자인 토큰·정적 프로토타입 등) |

여러 성격이 섞이면 가장 핵심적인 변경 기준으로 type을 하나 고른다. 성격이 크게 다르면 커밋을 나누는 것을 우선 고려한다.

## 작성 순서

1. `git status`와 `git diff --staged`로 **실제 staged 변경**을 확인한다. (staged가 없으면 사용자에게 무엇을 커밋할지 먼저 확인)
2. 변경의 핵심을 파악해 type을 하나 고른다.
3. `<type>: <한글 설명>` 한 줄로 작성한다. 필요 시에만 본문 추가.
4. 커밋 전 사용자가 요청하지 않았다면 스테이징/커밋을 임의로 실행하지 않는다.

## 참고

- 실제 코드 변경이 핵심이면 `feat`/`fix`/`refactor`를, 문서·설정만 바뀌었으면 `docs`/`chore`를 쓴다.
- Claude가 직접 커밋할 때는 하네스 규칙에 따라 메시지 끝에 `Co-Authored-By: Claude ...` 트레일러가 자동으로 붙는다 (제목 형식은 위 규칙 그대로 유지).
- GitHub 웹 UI에서 자동 생성되는 영문 커밋(`Merge ...`, `Update ...` 등)은 이 컨벤션 대상이 아니다.
