# FitCheck Mobile App

`frontend-web`을 **WebView**로 띄우는 Expo 껍데기입니다.  
별도 네이티브 화면 없이 웹 UI를 그대로 사용합니다. (Expo SDK 54)

> 웹 기능 진행도: [../frontend-web/README.md](../frontend-web/README.md)

## 현재 진행도 (2026-07)

| 항목 | 상태 | 비고 |
|------|------|------|
| Expo + WebView 기본 셸 | ✅ | `App.js` 단일 WebView |
| frontend-web URL 로드 | ✅ | `EXPO_PUBLIC_WEB_APP_URL` |
| 뒤로가기 제스처 | ✅ | `allowsBackForwardNavigationGestures` |
| Geolocation (WebView) | ✅ | `/user/map` GPS 테스트 가능 |
| 네이티브 전용 UI / Push | ❌ | 미구현 |
| 앱스토어 빌드 (EAS) | ❌ | 미진행 |

**요약:** 모바일 앱은 **웹 배포본을 감싸는 래퍼** 단계입니다.  
신규 기능(상담 신청 API, 지도 등)은 **frontend-web**에서 개발하면 WebView에 자동 반영됩니다.

---

## 실행

```bash
cp .env.example .env
# EXPO_PUBLIC_WEB_APP_URL 환경에 맞게 수정
npm install
npm start
```

Expo Go 또는 시뮬레이터에서 QR 스캔 후 실행합니다.

## WebView URL

| 환경 | `EXPO_PUBLIC_WEB_APP_URL` 예시 |
|------|-------------------------------|
| iOS/Android 시뮬레이터 | `http://localhost:5173` |
| 실기기 (같은 Wi-Fi) | `http://192.168.x.x:5173` |
| 배포 (Vercel) | `https://hub-tan-pi.vercel.app` |

앱은 URL 뒤에 자동으로 `/user`를 붙여 회원 홈으로 진입합니다.

### Expo Go에서 `404: NOT_FOUND` (Vercel) 가 뜰 때

Vercel 배포본에 **SPA 라우팅 설정**(`frontend-web/vercel.json`)이 반영되기 전이면  
`https://....vercel.app/user` 경로가 404를 반환합니다.

**로컬에서 바로 테스트 (권장):**

```bash
# 1) frontend-web — LAN 공개
cd ../frontend-web
npm run dev -- --host

# 2) mobile-app/.env 수정 (맥 IP 확인: ipconfig getifaddr en0)
EXPO_PUBLIC_WEB_APP_URL=http://192.168.0.12:5173

# 3) Expo 재시작 (env 변경 후 반드시)
cd ../mobile-app
npm start
```

**배포 URL 사용 시:** `frontend-web/vercel.json` 포함 후 Vercel **재배포** 필요.

실기기 로컬 테스트:

```bash
# frontend-web — LAN 접근 허용
cd ../frontend-web
npm run dev -- --host
```

NCP Maps **Web Service URL**에 사용 origin을 등록하세요 (`localhost:5173` 또는 LAN IP).

## GPS / 위치 권한 테스트

1. frontend-web + backend 실행
2. mobile-app → Expo Go 실행
3. `/user/map` → **내 위치** 탭 → OS 권한 허용
4. 파란 마커가 GPS 위치로 이동하는지 확인  
   (권한 거부 시 서면 목업 좌표로 폴백)

## 다음 단계 (예상)

1. 실기기·배포 URL 안정화 (`--host`, HTTPS 배포)  
2. 스플래시 · 앱 아이콘  
3. (선택) EAS Build, 딥링크, 푸시 알림  
