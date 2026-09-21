/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Origin + version prefix the axios client prepends, e.g. /api/v1. */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
