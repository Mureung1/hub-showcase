# FitCheck Member App

회원용 모바일 앱입니다. React Native (Expo) + TypeScript로 구성되어 있습니다.

## 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm start` | Expo 개발 서버 실행 |
| `npm run ios` | iOS 시뮬레이터 |
| `npm run android` | Android 에뮬레이터 |
| `npm run web` | 웹 브라우저 |

## 개발 서버

```bash
npm install
npm start
```

Expo Go 앱 또는 시뮬레이터에서 QR 코드를 스캔해 실행할 수 있습니다.

## 네이티브 빌드

프로덕션 배포 시 `npx expo prebuild`로 `ios/`, `android/` 네이티브 프로젝트를 생성할 수 있습니다.
