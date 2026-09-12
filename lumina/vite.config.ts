import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    // MapLibre memuat web worker-nya lewat `new URL(...)` relatif terhadap
    // berkas sumbernya. Kalau paketnya ikut di-prebundle, berkas worker tidak
    // ikut disalin ke node_modules/.vite/deps dan peta berhenti diam-diam:
    // style tidak pernah selesai dimuat dan tidak ada error yang dilempar.
    exclude: ['maplibre-gl'],
  },
})
