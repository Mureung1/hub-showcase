# AGENTS.md

## Project

이 저장소는 `MBTI 기반 공부법 및 스트레스 관리 웹앱` 프로젝트다.

사용자가 MBTI와 공부·스트레스 설문을 입력하면, 성향을 고정적으로 단정하지 않고 학습 선호와 피로 패턴을 행동지표로 정리한 뒤, 인지과학 기반 학습법과 오늘 바로 실행할 공부·회복 루틴을 추천한다.

## Read first

작업 전 아래 순서로 읽는다.

1. `docs/context.md`
2. `docs/plan.md`
3. `docs/checklist.md`
4. `docs/design.md` — 디자인/화면 구현 시 (색·크기·레이아웃 토큰과 컴포넌트 규칙)
5. `docs/pr-guide.md` — PR 작업 시
6. `docs/prompt-guide.md` — 새 작업 지시 작성 시

## Hard rules

- MBTI를 사람을 고정 판단하는 도구로 표현하지 않는다.
- MBTI 유형명만으로 공부법을 단정하지 않는다.
- 스트레스 기능을 진단, 치료, 위험군 판정처럼 표현하지 않는다.
- 성적 예측 기능을 만들지 않는다.
- 정신건강 진단 기능을 만들지 않는다.
- 공부 인증류 기능, 비교/랭킹 기능, 경쟁 유도 기능을 만들지 않는다.
- 사용자를 유형별로 줄 세우거나 우열을 암시하지 않는다.
- 회원가입, AI API, 커뮤니티, 캘린더, 알림 기능을 MVP에 추가하지 않는다.
- 외부 UI 라이브러리는 사용자 확인 전 추가하지 않는다.
- `package.json`, `package-lock.json`은 필요할 때만 수정한다.
- `node_modules`, `.DS_Store`, 임시파일은 커밋하지 않는다.
- force push는 사용자 명시 허가 없이 사용하지 않는다.

## Tech stack

현재 저장소 구조를 우선한다.

- Vite
- React
- JavaScript
- localStorage
- CSS 또는 기존 스타일 구조

Next.js로 바꾸지 않는다.

## Work flow

1. 현재 경로와 브랜치 확인
2. `git status` 확인
3. 관련 문서 읽기
4. 수정 파일 목록 먼저 제안
5. 작은 단위로 구현
6. `npm run build` 실행
7. 가능하면 `npm run lint` 실행
8. 변경 요약 보고
9. PR 전 staged 파일 확인

## Product rules

결과 문장은 가능성 표현을 사용한다.

좋은 표현:

- 이 방식이 더 편할 수 있습니다.
- 먼저 시도해볼 수 있습니다.
- 이런 피로 신호가 나타날 수 있습니다.
- 현재 응답 기준으로는 이 루틴이 적합할 수 있습니다.

피할 표현:

- 당신은 반드시
- 이 유형은 원래
- 진단
- 치료
- 위험군
- 성적 예측
- 우수한 유형
- 실패 유형

## Implementation rules

- Vite + React 구조를 유지한다.
- 추천 로직은 MVP에서 규칙 기반으로 유지한다.
- MBTI는 선호 탐색의 힌트로만 사용하고, 공부 설문과 스트레스 설문 응답을 함께 반영한다.
- MVP 데이터 저장은 localStorage를 사용한다.
- 화면 흐름은 소개, MBTI 선택, 공부 설문, 스트레스 설문, 결과, 오늘의 실천 카드 중심으로 유지한다.
- `README.md`, `docs/plan.md`, `docs/checklist.md`의 설명이 서로 충돌하지 않게 한다.

## Validation commands

```bash
npm run build
npm run lint
git status --short --branch
```

## PR readiness

PR 전에는 다음을 확인한다.

- staged 파일이 의도한 파일뿐인지 확인한다.
- `package.json`, `package-lock.json`이 불필요하게 바뀌지 않았는지 확인한다.
- 문서 링크가 깨지지 않았는지 확인한다.
- `node_modules`, `.DS_Store`, 임시파일이 포함되지 않았는지 확인한다.
- `work` 브랜치로 PR을 만들 때 `origin/work`에 최신 커밋이 올라갔는지 확인한다.

## Done means

작업 완료는 다음을 만족해야 한다.

- 기능이 브라우저에서 확인된다.
- 문서 링크가 깨지지 않는다.
- MBTI와 스트레스 표현 원칙을 지킨다.
- build가 통과한다.
- PR에 포함할 파일과 제외할 파일이 명확하다.
