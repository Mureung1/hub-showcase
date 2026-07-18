/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CURRICULUM_RECOMMENDATION_MODE?: 'mock' | 'server'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
