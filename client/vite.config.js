import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],  
  build: {
    outDir: 'dist', // Assicurati che sia relativo alla cartella client
  }
})