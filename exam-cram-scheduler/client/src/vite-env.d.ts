/// <reference types="vite/client" />

// #30 — 화면 코드가 읽는 환경변수(VITE_ 접두사)의 타입 선언.
// vite/client 기본 타입은 이 값을 any로 두는데, 여기서 string으로 좁혀 타입 안전하게 쓴다.
interface ImportMetaEnv {
  /** 배포된 백엔드(Express)의 베이스 URL. 개발 환경에선 비워 두면 Vite 프록시가 대신 중계한다. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
