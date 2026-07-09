# Pick My Clothes

## 프로젝트 소개

Pick My Clothes는 AI Agent를 활용하여 사용자의 상황, 장소, 날씨를 분석하고 코디를 추천하는 AI 기반 웹 서비스이다.

프로젝트 컨셉은 "나의 코디 다이어리"이며 사용자가 하루의 코디를 일기처럼 기록하고 저장할 수 있는 감성적인 서비스를 목표로 한다.

---

# 개발 환경

## Frontend

- React
- Vite
- TypeScript

현재 프로젝트의 React 코드는 src 폴더에서 관리한다.

## Backend

- Express
- Node.js

현재 Express 서버는 server.ts 파일에서 관리한다.

현재는 하나의 프로젝트에서 Frontend와 Backend를 함께 관리하며, 프로젝트 규모가 커질 경우 frontend / backend 구조로 분리할 예정이다.

---

# 디렉토리 구조
pick-my-clothes

├── src
│ ├── components
│ ├── App.tsx
│ ├── main.tsx
│ └── index.css
│
├── server.ts
├── package.json
├── README.md
├── CLAUDE.md
└── docs
└── design-skill.md

---

# 사용할 라이브러리

Frontend

- React
- React Router DOM (추후)
- Axios (API 통신)
- Lucide React (아이콘)

Backend

- Express
- dotenv
- cors

---

# 코드 컨벤션

## 파일명

컴포넌트

PascalCase

예시

HomePage.tsx

RecommendPage.tsx

ResultPage.tsx

---

## 변수명

camelCase

예시

selectedWeather

selectedPlace

userCloset

---

## 함수명

동작이 명확하게 드러나도록 작성

예시

handleRecommend()

handleUpload()

saveDiary()

---

# Commit 규칙

feat: 새로운 기능 추가

fix: 버그 수정

style: 디자인 변경

docs: 문서 수정

refactor: 코드 리팩토링

---

# 개발 전에 결정한 사항

## 디자인

- Notebook Style
- Diary Theme
- Pink Color
- Rounded UI
- Soft Shadow

## AI 기능

- 상황 기반 코디 추천
- 내 옷장 기반 추천
- 새로운 옷 추천
- AI 채팅 코디 추천
- 코디 저장

## 페이지 구성

Home

Recommend

Result

Diary

Closet (추후)

---

# 개발 원칙

- 디자인 시스템을 유지한다.
- 컴포넌트를 재사용 가능하게 작성한다.
- 사용자 경험을 우선으로 개발한다.
- 기능보다 완성도를 우선한다.
- 핵심 기능을 먼저 구현한 후 확장 기능을 추가한다.

---

# Claude에게 요청할 때의 규칙

새로운 기능을 구현할 때에는 반드시 기존 디자인 시스템을 유지한다.

컴포넌트는 재사용이 가능하도록 작성한다.

모든 화면은 "나의 코디 다이어리" 컨셉을 유지하며 Notebook 스타일과 Pink Theme를 적용한다.

사용자 경험을 최우선으로 고려하여 직관적인 UI를 구현한다.