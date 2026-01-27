import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      // Same-origin /api → local proxy server (avoids CORS + hides API key)
      '/api': 'http://localhost:5177',
    },
  },
})
