# Core Loop Builder

게임 기획자를 꿈꾸는 사용자가 만들고 싶은 게임 장르와 참고 게임을 입력하면, AI가 게임 기획의 핵심 구조인 **코어 루프**를 브레인스토밍하고 시각화하며, 이를 포트폴리오용 기획 초안으로 정리하도록 돕는 AI Agent 서비스입니다.

단순한 기획서 생성기가 아니라, 게임 개발에서 가장 기본이자 핵심이 되는 "코어 루프"를 설계하는 과정을 도와주는 것이 이 서비스의 방향입니다.

## 이번 미션에서 구현한 내용

Fork한 저장소의 브랜치에서 Vite + React(JavaScript) 환경을 새로 구성하고, 서비스를 소개하는 랜딩 페이지 컴포넌트를 구현했습니다.

- `src/components/CoreLoopBuilderIntro.jsx` / `.css` — 서비스 소개 컴포넌트 1개
  - Hero, 코어 루프란?, Problem, Who Uses It, How To Use, How It Works, Core Loop Example, Output, Closing 총 9개 섹션 구성
  - 코어 루프(행동 → 보상 → 성장 → 도전 → 반복)를 데스크톱에서는 원형 순환 다이어그램으로, 모바일에서는 세로 단계형 흐름으로 표현
  - 이미지 파일 없이 순수 HTML/CSS만으로 구현
- `src/App.jsx` — `CoreLoopBuilderIntro` 컴포넌트 렌더링
- Tailwind, Bootstrap, MUI 등 UI 라이브러리 없이 React + 기본 CSS만 사용
- 라우팅, 로그인, 서버 연동, 실제 AI API 호출 등은 포함하지 않은 소개 페이지 UI 전용 구현

## 실행 방법

```bash
npm install
npm run dev
```
