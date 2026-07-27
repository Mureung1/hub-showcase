/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CURRICULUM_RECOMMENDATION_MODE?: 'mock' | 'server'
  readonly VITE_ICU_API_MODE?: 'mock' | 'server'
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
