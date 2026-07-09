// FE가 실제로 import하는 API 클라이언트 진입점.
// 이제 backend/(Express)를 실제로 호출한다. mockServer.js는 백엔드 없이 UI만 빠르게
// 확인하고 싶을 때를 대비해 남겨뒀다 — 되돌리려면 아래 한 줄만 바꾸면 된다.
export * as api from './httpClient';
