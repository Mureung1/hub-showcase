/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "false"면 서버 API 실연동, 그 외/미설정이면 mock 데이터로 동작 (기본 = 데모 보험). */
  readonly VITE_MOCK_MODE?: string;
  /** 서버 API 베이스 URL. 미설정 시 http://localhost:4000. */
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
