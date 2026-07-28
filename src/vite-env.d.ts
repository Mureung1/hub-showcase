/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CURRICULUM_RECOMMENDATION_MODE?: 'mock' | 'server'
  readonly VITE_ICU_API_MODE?: 'mock' | 'server'
  readonly VITE_API_BASE_URL?: string
  readonly VITE_CODE_RUNNER_BASE_URL?: string
  readonly VITE_ICU_PREVIEW_URL?: string
  readonly VITE_ICU_APP_ORIGINS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
