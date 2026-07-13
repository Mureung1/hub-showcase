# FitCheck

피트니스 입문자와 골목 헬스장(소상공인)을 잇는 스마트 피트니스 플랫폼입니다.

## 프로젝트 구조

```
fitcheck-project/
├── backend/         # Express API 서버 (TypeScript)
├── frontend-web/    # Vite + React 웹 (회원/트레이너 모드)
└── mobile-app/      # Expo WebView 껍데기 (frontend-web URL 로드)
```

| 폴더 | 역할 | 기술 스택 |
|------|------|-----------|
| `backend` | API 서버 | Node.js + Express + TypeScript |
| `frontend-web` | 핵심 웹 UI | Vite + React + TypeScript |
| `mobile-app` | 하이브리드 앱 래퍼 | React Native (Expo) + WebView |

### frontend-web 내부 구조

- `src/pages/user/` — 회원 모드 (모바일 비율)
- `src/pages/trainer/` — 트레이너 대시보드 (데스크톱)
- `src/features/` — 강좌 / 식단 / 지도 등 기능 모듈

## 시작하기

### backend

```bash
cd fitcheck-project/backend
npm install
cp .env.example .env   # PORT, Supabase 키 설정
npm run dev
```

서버: http://localhost:5000

### frontend-web

```bash
cd fitcheck-project/frontend-web
npm install
npm run dev
```

개발 서버: http://localhost:5173

- 회원 모드: `/user`
- 트레이너 모드: `/trainer`

### mobile-app (나중에 WebView URL 조정)

```bash
cd fitcheck-project/mobile-app
npm install
npm start
```

## 요구 사항

- Node.js 18+
- mobile-app 확인 시 Expo Go 또는 시뮬레이터
