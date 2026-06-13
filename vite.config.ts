import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'opencc-js': path.resolve(__dirname, 'src/lib/opencc/full.js'),
    },
  },
})
