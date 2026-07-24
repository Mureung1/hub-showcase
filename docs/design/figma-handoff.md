# ICU Figma Handoff

## Source Documents

- Shared visual rules: [design-brief.md](./design-brief.md)
- Today behavior: [today-learning.md](../features/today-learning.md)
- Workspace behavior: [learning-workspace.md](../features/learning-workspace.md)
- Git Lab behavior: [git-branching-lab.md](../features/git-branching-lab.md)

Figma export PNG와 렌더링된 SVG는 저장소에 보관하지 않습니다. Figma 파일과 Mermaid 원본을 source로 사용합니다.

## Frame Setup

- Today Learning Hub: `1440 x 1024`
- Learning Workspace IDE: `1440 x 1024`
- Git Branching Lab: `1440 x 1024`

Empty, paused, failed, passed, modal, narrow-width 상태는 해당 feature 문서의 상태 정의를 기준으로 추가합니다.

## Frame Composition

### Today Learning Hub

- app navigation
- header와 오늘 일정 요약
- Today's Focus
- Today Queue
- Learning List preview
- Review와 Mistakes summary

### Learning Workspace IDE

- top bar
- curriculum panel
- AI Tutor panel
- Monaco editor와 실행 제어
- Preview 또는 test results

### Git Branching Lab

- level bar와 curriculum navigation
- terminal
- current graph와 repository state
- target graph와 goal feedback

## Naming

- 사용자 노출 제품명: `ICU`
- 저장소와 기획 이름: `DevChat`
- frame 이름은 `ICU / <Feature> / <State> / <Theme>` 형식을 사용합니다.
- component와 variant 이름은 React 화면의 역할과 상태 이름을 따릅니다.

## Component Candidates

- App shell
- Navigation item
- Status pill
- Progress row
- Curriculum step
- Tutor message
- Source reference
- Editor toolbar
- Test result strip
- Primary and secondary button
- Terminal log
- Commit graph
- Modal

## Prototype Interactions

- `이어서 학습하기`는 Workspace의 현재 mission으로 이동합니다.
- `실행`은 running 후 passed, failed, timeout 중 하나로 전환합니다.
- `힌트 보기`는 현재 mission의 hint를 펼칩니다.
- Git Lab command는 current graph와 repository state를 갱신합니다.
- 완료 modal은 다음 학습 단계와 다시 시작 행동을 제공합니다.

## Handoff Checklist

- feature 문서의 상태와 frame 상태가 일치합니다.
- shared token을 직접 복사하지 않고 `design-brief.md`를 참조합니다.
- primary action, focus, empty, error, disabled 상태가 포함됩니다.
- PNG/SVG export를 Git에 추가하지 않습니다.
