import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:18080',
        changeOrigin: true,
      },
      '/assets': {
        target: 'http://127.0.0.1:18080',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:18080',
        changeOrigin: true,
      },
    },
  },
})

