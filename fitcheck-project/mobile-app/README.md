# FitCheck Mobile App

`frontend-web`을 WebView로 띄우는 Expo 껍데기입니다. (Expo SDK 54 / Expo Go 최신 버전 호환)

## 실행

```bash
cp .env.example .env
# EXPO_PUBLIC_WEB_APP_URL 을 환경에 맞게 수정
npm install
npm start
```

## WebView URL

| 환경 | `EXPO_PUBLIC_WEB_APP_URL` 예시 |
|------|-------------------------------|
| iOS 시뮬 / Android 에뮬 | `http://localhost:5173` |
| 실기기 (같은 Wi-Fi) | `http://192.168.x.x:5173` |
| 배포 | `https://hub-tan-pi.vercel.app` |

실기기 로컬 테스트 시 frontend-web은 LAN에서 접근 가능해야 합니다.

```bash
# frontend-web
npm run dev -- --host
```

NCP Maps Web Service URL에도 사용 중인 origin(`http://192.168.x.x:5173` 또는 배포 URL)을 등록하세요.

## GPS / 위치 권한 테스트

1. frontend-web 개발 서버(또는 배포 URL) 실행
2. mobile-app에서 Expo Go로 실행
3. `/user/map` 진입 → **내 위치** 버튼 탭
4. OS 위치 권한 팝업 허용
5. 파란 **내 위치** 마커가 실제 GPS로 이동하는지 확인  
   (헬스장 핀은 부산 목업 데이터로 그대로 둡니다)
6. 권한 거부 시 부산진구 서면 목업 위치로 폴백됩니다
