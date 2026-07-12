# Prompt Guide

Use this file to avoid repeating long instructions in future Codex or Claude sessions.

## Always Include

```text
반드시 /Users/bricepark/Documents/hub 저장소 안에서 작업하세요.
작업 전 현재 경로, 현재 브랜치, git status를 확인하세요.
README.md, docs/plan.md, docs/checklist.md, docs/context.md를 먼저 읽으세요.
근거·데이터·알고리즘·로그인·외부 연동 작업이면 docs/evidence-data-roadmap.md도 읽으세요.
```

## Product Context Prompt

```text
프로젝트는 MBTI 기반 공부법 및 스트레스 관리 웹앱입니다.
MBTI는 고정 판단이 아니라 학습 선호 탐색의 출발점입니다.
추천은 MBTI 유형명만으로 만들지 말고 공부 설문과 스트레스 반응 설문을 함께 반영하세요.
스트레스는 피로 신호, 회복 루틴, 주의 패턴으로 표현하세요.
```

## Implementation Prompt

```text
현재 Vite + React 구조를 유지하세요.
Next.js로 바꾸지 마세요.
새 프레임워크나 외부 UI 라이브러리를 추가하지 마세요.
localStorage 기반 MVP를 유지하세요.
결과와 추천 피드백에는 동일한 알고리즘 버전을 기록하고, 사용자가 로컬 데이터를 삭제할 수 있게 하세요.
사용자 응답이나 자유의견을 Git repository 또는 GitHub issue에 저장하지 마세요.
npm run build와 가능하면 npm run lint로 검증하세요.
```

## Documentation Prompt

```text
docs/plan.md는 최종 기획서 역할을 하게 정리하세요.
docs/checklist.md는 4주 MVP와 검증 베타·장기 확장 게이트를 구분해 정리하세요.
README.md는 요약, 문서 링크, 실행 방법, MVP 포함/제외 범위를 중심으로 유지하세요.
```

## PR Prompt

```text
아직 commit/push/PR 생성은 하지 마세요.
먼저 git status, 변경 파일 목록, package.json 변경 여부, build/lint 결과를 확인하세요.
PR base는 connect-AIAgentChallenge-26-1/hub의 N077_박병관 브랜치 후보를 우선 검토하세요.
PR head는 bricepark94:work를 우선 검토하세요.
```

## Review Prompt

```text
MBTI를 고정 판단처럼 표현한 문장이 없는지 확인하세요.
스트레스 기능이 의학적 판단처럼 보이지 않는지 확인하세요.
회원가입, AI 챗봇, 외부 AI API, 커뮤니티, 캘린더/알림, 결제, 비교/랭킹 기능이 들어가지 않았는지 확인하세요.
점수와 가중치를 검증된 정확도·진단·표준화 평가처럼 표현하지 않았는지 확인하세요.
로그인·서버 저장·대학 플랫폼·OpenAI 기능은 evidence-data-roadmap의 게이트를 통과하기 전 구현하지 마세요.
node_modules, .DS_Store, dist, 임시파일이 포함되지 않았는지 확인하세요.
```
