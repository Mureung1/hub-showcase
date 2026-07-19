/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase 프로젝트 URL (공개값). */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase Publishable Key (공개값). Secret/Service Role Key는 프론트에 두지 않는다. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  /** API 서버 Base URL. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
