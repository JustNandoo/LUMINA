/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Alamat backend Flask, mis. http://127.0.0.1:5050 */
  readonly VITE_API_BASE_URL?: string
  /** Client ID Google Sign-In; kosong = tombol Google disembunyikan. */
  readonly VITE_GOOGLE_CLIENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
