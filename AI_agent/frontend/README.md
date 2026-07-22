# Career Mission AI Frontend

React + Vite 기반의 Career Mission AI 클라이언트입니다. 사용자는 회원가입과 로그인 후 스펙 등록에서 목표 직무를 함께 입력하고, AI 분석, 미션 수행, 결과물 업로드, 피드백, 포트폴리오 흐름을 한 번에 사용할 수 있습니다.

## Tech Stack

- React
- React Router
- Vite
- CSS / shared utility classes
- localStorage fallback
- Express API client modules

## Key Screens

- `src/pages/Home.jsx`
- `src/pages/Signup.jsx`
- `src/pages/Login.jsx`
- `src/pages/MyPage.jsx`
- `src/pages/SpecRegister.jsx`
- `src/pages/Analysis.jsx`
- `src/pages/Mission.jsx`
- `src/pages/MissionDetail.jsx`
- `src/pages/UploadResult.jsx`
- `src/pages/Feedback.jsx`
- `src/pages/Portfolio.jsx`

## Styling Notes

공통 버튼, 입력폼, 선택 카드, 빈 상태 스타일은 `src/index.css`의 `cm-*` 유틸리티 클래스를 사용합니다. 주요 2열 레이아웃은 모바일에서 1열로 접히도록 반응형 규칙을 적용했습니다.

## Run

```bash
npm install
npm run dev
```

```txt
http://localhost:5173
```

## Verify

```bash
npm run lint
npm run build
```
