# Photo Navigation Web

네이버 지도 위에서 공식 포토스팟과 후보 포토스팟을 탐색하는 React 웹앱입니다.

## Run locally

```bash
npm install
copy .env.example .env.local
npm run dev
```

`VITE_NAVER_MAPS_CLIENT_ID`에는 NCP Maps의 Client ID만 넣습니다. Client Secret은 이 앱에서 사용하지 않습니다.

## Build

```bash
npm run security:check
npm run build
```
