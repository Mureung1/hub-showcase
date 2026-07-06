# FitCheck

피트니스 트레이너와 회원을 연결하는 웹/앱 서비스입니다.

## 프로젝트 구조

| 폴더 | 대상 | 기술 스택 |
|------|------|-----------|
| `web-trainer` | 트레이너 | Vite + React + TypeScript |
| `app-member` | 회원 | React Native (Expo) + TypeScript |

## 시작하기

### web-trainer (트레이너 웹)

```bash
cd fitcheck/web-trainer
npm install
npm run dev
```

개발 서버: http://localhost:5173

### app-member (회원 앱)

```bash
cd fitcheck/app-member
npm install
npm start
```

Expo 개발 서버 실행 후, Expo Go 앱 또는 시뮬레이터에서 확인할 수 있습니다.

- `npm run ios` — iOS 시뮬레이터
- `npm run android` — Android 에뮬레이터
- `npm run web` — 웹 브라우저

## 요구 사항

- Node.js 20+
- app-member iOS/Android 네이티브 빌드 시 Xcode 또는 Android Studio
