# Agents.md

## Project Overview

이 프로젝트는 학부생 멘티가 대학원생 멘토의 프로필을 보고, 최대 3명의 멘토를 선택해 사전 질문지를 작성한 뒤 면담을 신청할 수 있는 웹 서비스이다.

멘토는 신청 내역을 확인하고 사전 질문지를 본 뒤 수락 또는 거절할 수 있다. 

## MVP Priority

1. 로그인 / 회원가입 진입 화면
2. 회원가입 시 멘티 / 멘토 역할 선택
3. 멘티 회원가입 정보 입력 및 계정 생성
4. 멘토 회원가입 정보 입력 및 계정 생성
5. 로그인 기능 구현
6. 로그인한 사용자 역할에 따른 화면 분기
7. 멘토 프로필 등록
8. 멘토 프로필 목록 조회
9. 멘토 프로필 상세 조회
10. 최대 3명 멘토 선택
11. 사전 질문지 작성
12. 면담 신청 생성
13. 멘토 면담 신청 목록 확인
14. 멘토의 신청 수락 / 거절
15. 멘티의 신청 진행 상태 확인

## Additional Features

아래 기능은 MVP 이후 우선순위로 구현한다.

- 찜한 멘토 목록
- 찜한 목록에서 멘토 선택 후 면담 신청
- 리뷰 작성
- 멘토 포인트 적립
- 포인트 상점
- 상품권 신청
- 노쇼 신고 및 패널티
- 이메일 알림

## Tech Stack

### Frontend

- React
- react-dom
- react-router-dom
- axios

### Backend

- Express
- cors
- dotenv
- @supabase/supabase-js

### Dev Tools

- Vite
- ESLint
- Prettier
- nodemon

## Directory Structure

```text
hub/
  client/
    src/
      components/
        MentorCard.jsx
        MentorProfileModal.jsx
        ApplicationCard.jsx
      pages/
        MentorListPage.jsx
        MentorDetailPage.jsx
        QuestionnairePage.jsx
        MenteeMyPage.jsx
        MentorDashboardPage.jsx
      api/
        mentors.js
        applications.js
        favorites.js
      styles/
        global.css
      App.jsx
      main.jsx
    package.json

  server/
    src/
      routes/
        auth.routes.js
        mentors.routes.js
        applications.routes.js
        favorites.routes.js
      controllers/
        mentors.controller.js
        applications.controller.js
        favorites.controller.js
      services/
        mentors.service.js
        applications.service.js
      db/
        supabase.js
      app.js
      server.js
    package.json

  docs/
    기획서.md
    api.md
    db-schema.md

  README.md
  Agents.md
```

### Directory Rules

- `client`: React 프론트엔드 코드만 둔다.
- `client/src/components`: 여러 페이지에서 재사용하는 작은 UI 부품을 둔다.
- `client/src/pages`: 라우팅되는 화면 단위 컴포넌트를 둔다.
- `client/src/api`: 백엔드 API 호출 함수를 둔다.
- `client/src/styles`: 공통 CSS와 전역 스타일을 둔다.
- `server`: Express 백엔드 코드만 둔다.
- `server/src/routes`: API 주소를 정의한다.
- `server/src/controllers`: 요청과 응답 처리를 담당한다.
- `server/src/services`: 비즈니스 로직을 담당한다.
- `server/src/db`: Supabase 연결 설정을 둔다.
- `docs`: 기획서, API 문서, DB 설계 문서를 둔다.

## Convention

### Naming

- React component/page files use PascalCase.
  - Example: `MentorCard.jsx`, `MentorListPage.jsx`
- React component names use PascalCase.
  - Example: `MentorCard`, `QuestionnairePage`
- JavaScript variables and functions use camelCase.
  - Example: `selectedMentors`, `submitApplication`
- Backend files use `domain.role.js`.
  - Example: `mentors.routes.js`, `mentors.controller.js`, `mentors.service.js`
- DB tables and columns use snake_case.
  - Example: `mentor_profiles`, `created_at`
- CSS classes use kebab-case.
  - Example: `mentor-card`, `primary-button`

### Status Values

DB와 API에서는 영어 소문자 상태값을 사용한다.

- `pending`: 대기중
- `confirmed`: 확정
- `completed`: 완료
- `rejected`: 거절

화면에는 한국어 상태값으로 표시한다.

## Commit Convention

커밋 메시지는 아래 형식을 사용한다.

```text
type: message
```

Types:

- `feat`: 새로운 기능 추가
- `fix`: 버그 수정
- `docs`: 문서 수정
- `style`: CSS 또는 포맷 수정
- `refactor`: 코드 구조 개선
- `chore`: 설정 또는 기타 작업

Examples:

- `feat: 멘토 프로필 목록 화면 구현`
- `feat: 멘티 회원가입 화면 추가`
- `fix: 멘토 최대 선택 수 제한 오류 수정`
- `docs: API 설계 문서 추가`
- `chore: React 개발 환경 구성`

## Git 규칙
- 실제 작업 브랜치는 'feature/n099-html-css'이다.
- main 브랜치에서 작업하지 않는다.
- PR 방향은 `meatbest9:feature/n099-html-css` -> `connect-AIAgentChallenge-26-1/hub:N099_백승주`이다.
- commit은 각 세션에서 하나의 작업(기능 구현, 버그 수정 등)이 끝날 때마다 자동으로 수행한다.
- push와 PR은 사용자가 명시적으로 지시할 때만 실행한다.




## Business Rules

- 사용자는 회원가입 시 멘티 또는 멘토 역할을 선택한다.
- 멘티 회원가입 시 기본 개인정보를 입력한다.
- 멘토 회원가입 시 기본 계정 정보와 멘토 프로필 정보를 입력한다.
- 로그인 성공 후 사용자 역할에 따라 다른 화면으로 이동한다.
  - 멘티: 멘토 프로필 목록 화면
  - 멘토: 멘토 면담 신청 목록 또는 멘토 마이페이지
- 멘티는 한 번에 최대 3명의 멘토에게 면담을 신청할 수 있다.
- 사전 질문지는 자기소개, 현재 가장 큰 고민, 면담을 통해 얻고 싶은 것, 희망 면담 시간으로 구성한다.
- 면담 신청 상태는 `pending`, `confirmed`, `completed`, `rejected` 중 하나로 관리한다.
- 멘토는 신청 내역에서 사전 질문지를 확인하고 수락 또는 거절할 수 있다.
- 멘티는 마이페이지에서 신청 진행 상태를 확인할 수 있다.

## API Rules

- API routes use plural nouns.
- Frontend must communicate with DB only through backend APIs.
- Do not access Supabase directly from React pages unless explicitly decided.
- API response bodies should use JSON.

Examples:

- `POST /api/auth/signup/mentee`
- `POST /api/auth/signup/mentor`
- `POST /api/auth/login`
- `GET /api/mentors`
- `GET /api/mentors/:mentorId`
- `POST /api/applications`
- `GET /api/applications`
- `PATCH /api/applications/:applicationId/accept`
- `PATCH /api/applications/:applicationId/reject`
- `POST /api/favorites`
- `DELETE /api/favorites/:mentorId`

## Environment Variables

Do not hard-code secrets in source code.

Use `.env` files for local secrets:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PORT`

Never commit real `.env` files. Commit `.env.example` only.

## Development Notes

- MVP 기능을 먼저 구현하고, 부가 기능은 후순위로 둔다.
- 하나의 파일에 너무 많은 코드를 넣지 말고 `components`, `pages`, `api`, `routes`, `controllers`, `services`로 분리한다.
- UI 문구는 한국어를 기본으로 한다.
- 멘티 화면과 멘토 화면을 역할별로 분리한다.
- 기존 HTML/CSS 프로토타입에서 만든 화면 흐름을 React 구현의 기준으로 삼는다.
- 구현 전 관련 문서(`docs/api.md`, `docs/db-schema.md`)를 먼저 확인하고, 변경이 있으면 문서도 함께 갱신한다.
