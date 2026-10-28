import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  // GitHub Pages serves from /<repo>/, so the deploy workflow sets VITE_BASE
  base: process.env.VITE_BASE || '/',
  plugins: [vue()],
  build: { chunkSizeWarningLimit: 700 }
})
