import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'c66c3433-407a-492e-a2ad-20c4b85d51b2-00-1h32aauoe6m8i.sisko.replit.dev'
    ]
  }
})
