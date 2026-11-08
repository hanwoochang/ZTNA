import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://ztna-core.duckdns.org',
        changeOrigin: true,
        secure: false,
      },
      '/private': {
        target: 'https://ztna-core.duckdns.org',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
