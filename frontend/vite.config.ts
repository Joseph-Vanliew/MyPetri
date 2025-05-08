import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy API requests to Spring Boot backend
      '/api': {
        target: 'http://localhost:8080', // Assuming Spring Boot runs on 8080
        changeOrigin: true,
        // secure: false, // Uncomment if backend uses self-signed SSL in dev
      }
    }
  }
})
