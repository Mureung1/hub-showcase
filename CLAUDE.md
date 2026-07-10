# GNU Course AI Navigator - Development Guide (CLAUDE.md)

이 가이드는 프로젝트의 빌드, 실행, 린트 적용 명령어 및 코드 규칙을 정의합니다.

---

## 1. Project Run & Build Commands

프로젝트는 프론트엔드(React/Vite)와 백엔드(Express)가 분리된 구조입니다.

### Frontend (React + Vite)
- **위치**: `frontend/`
- **의존성 설치**: `npm install`
- **개발 서버 실행 (Port 3000)**: `npm run dev`
- **프로덕션 빌드**: `npm run build`
- **린트 검사**: `npm run lint`

### Backend (Express)
- **위치**: `backend/`
- **의존성 설치**: `npm install`
- **서버 실행 (Port 5000)**: `npm start`
- **개발 모드 서버 실행 (Nodemon)**: `npm run dev`

---

## 2. Directory Structure

```text
gnu-course-navigator/
├── .agents/                      # AI Agent 전용 커스텀 환경
│   └── skills/                   # 프로젝트 전용 AI Skills
│       └── design-system-validator/
├── backend/                      # Express 백엔드 서버
│   ├── src/
│   │   ├── app.js                # Express 앱 설정 및 미들웨어
│   │   └── server.js             # 서버 엔트리 포인트
│   ├── uploads/                  # 성적표 파일 업로드 임시 스토리지
│   └── package.json
├── frontend/                     # React 프론트엔드 앱
│   ├── src/
│   │   ├── main.jsx              # React Entry
│   │   ├── App.jsx               # 메인 레이아웃 및 시간표 코어
│   │   └── index.css             # 디자인 시스템 기반 글로벌 CSS
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── design_system.md              # Figma 기반 디자인 가이드라인 명세
├── index.html                    # 1주차 단일 페이지 데모 (HTML/JS)
├── app.js                        # 1주차 데모 비즈니스 로직
├── style.css                     # 1주차 데모 스타일시트
└── CLAUDE.md                     # 본 개발 가이드 파일
```

---

## 3. Coding Conventions & Code Styles

- **Language & Environment**: ES6+ Javascript, Node.js (CommonJS for Backend, ESM for Frontend).
- **Naming Conventions**:
  - **Files & Folders**: 컴포넌트 파일명은 PascalCase (`CourseCard.jsx`), 일반 소스 파일/폴더명은 camelCase 또는 kebab-case 사용.
  - **Variables & Functions**: camelCase (`activeCourses`, `renderTimetable()`).
  - **CSS Classes**: kebab-case (`timetable-container`, `course-block`).
- **Formatting**:
  - 세미콜론 필수 사용.
  - 문자열 선언 시 홑따옴표(`'`) 디폴트 사용 (HTML 속성 및 JSX는 쌍따옴표 `"` 사용).
  - 탭 간격: 2 spaces.

---

## 4. Git Commit Message Conventions

Conventional Commits 규격을 엄격히 준수합니다.

```text
<type>(<scope>): <subject>

[body]
```

### Commit Types
- `feat`: 새로운 기능 추가
- `fix`: 버그 수정
- `docs`: 문서 관련 작업 (예: `CLAUDE.md` 수정, README 추가)
- `style`: 코드 포맷팅, 세미콜론 누락 수정 (비즈니스 로직 변경 없음, CSS 수정 등)
- `refactor`: 코드 리팩토링 (기능 추가나 버그 수정 없음)
- `test`: 테스트 코드 작성 및 리팩토링
- `chore`: 빌드 업무 수정, 패키지 매니저 구성 업데이트 (예: .gitignore 수정, package.json 패키지 추가)

### Commit Example
- `feat(chat): 성적표 캡처본 업로드 및 실시간 학점 분석 OCR API 연동`
- `style(theme): 디자인 시스템 변수 기반 Conic Gradient 게이지 스타일 개선`
- `docs(guide): CLAUDE.md 개발 규칙 및 빌드 명령어 정의`
