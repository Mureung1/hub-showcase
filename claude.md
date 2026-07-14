1. 프로젝트 개요
2. 기술 스택
3. 디렉토리 구조
4. 필요한 라이브러리
5. 코드 컨벤션
6. 커밋 로그 규칙
7. 개발 전에 결정한 사항
8. Agent 작업 지침

## 기술 스택

### Frontend
- React
- Vite
- JavaScript
- CSS

### Backend
- Express
- Node.js
- JavaScript

### Development Tools
- ESLint
- Prettier
- nodemon
- concurrently

## 프로젝트 구조

```text
exam-priority-calculator/
├── client/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── styles/
│       └── utils/
├── server/
│   └── src/
│       ├── routes/
│       ├── controllers/
│       └── services/
├── docs/
├── CLAUDE.md
└── README.md


---

## 5. `CLAUDE.md`에 필요한 라이브러리 적기

설치까지 꼭 안 해도 되고, **무엇을 쓸지 정해서 적는 것**이 핵심이야.

```markdown
## 필요한 라이브러리

### Frontend
- react
- react-dom
- vite

### Backend
- express
- cors
- dotenv

### Development
- nodemon
- concurrently
- eslint
- prettier

## 코드 컨벤션

- React 컴포넌트 파일명은 PascalCase로 작성한다.
  - 예: SubjectCard.jsx, PriorityBadge.jsx

- 함수명과 변수명은 camelCase로 작성한다.
  - 예: calculatePriorityScore, examDate

- 하나의 컴포넌트는 하나의 역할만 담당한다.

- 계산 로직은 화면 컴포넌트 안에 직접 작성하지 않고 utils 또는 services로 분리한다.

- 색상, 여백, 폰트 크기는 CSS 변수로 관리한다.

## 커밋 메시지 규칙

커밋 메시지는 아래 형식을 따른다.

type: 작업 내용

사용할 type은 다음과 같다.

- feat: 새로운 기능 추가
- fix: 버그 수정
- docs: 문서 작성 또는 수정
- style: 디자인 또는 코드 스타일 수정
- refactor: 코드 구조 개선
- chore: 환경 설정, 패키지 작업
- test: 테스트 코드 작성

예시:
- docs: add development environment plan
- chore: setup project folders
- feat: add subject input form
- style: apply design system colors

## 개발 전 결정 사항

1. 이번 MVP에서는 로그인과 회원가입을 구현하지 않는다.

2. 초기에는 DB를 사용하지 않는다.

3. 과목 데이터는 프론트엔드 상태로 먼저 관리한다.

4. 우선순위 계산 로직은 처음에는 client/src/utils/priorityCalculator.js에서 처리한다.

5. 추후 서버 연동 단계에서는 Express API로 계산 요청을 보낸다.

6. 디자인은 Figma에서 만든 디자인 시스템을 기준으로 구현한다.

7. 우선 Desktop 화면을 기준으로 개발한다.

8. API 통신은 fetch를 기본으로 사용한다.