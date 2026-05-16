import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'window',
    'process.env': {}
  },
  build: {
    chunkSizeWarningLimit: 3000, // Increase warning limit to 3MB
  }
})
