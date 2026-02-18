import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// https://vite.dev/config/
export default defineConfig({
  base: '/teamGOG/multiplayer-buzzer/',
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: 'server/server.cjs',
          dest: ''
        },
        {
          src: 'package.json',
          dest: ''
        }
      ]
    })
  ],
  build: {
    outDir: 'client/dist',
  }
})
