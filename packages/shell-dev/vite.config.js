import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue2 from '@vitejs/plugin-vue2'
import openInEditor from 'launch-editor-middleware'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [vue2()],
  resolve: {
    alias: {
      '@front': path.resolve(__dirname, 'node_modules/@vue-devtools/app-frontend/src'),
      '@back': path.resolve(__dirname, 'node_modules/@vue-devtools/app-backend/src'),
      '@utils': path.resolve(__dirname, 'node_modules/@vue-devtools/shared-utils/src'),
    },
  },
  define: {
    'process.env.RELEASE_CHANNEL': JSON.stringify(process.env.RELEASE_CHANNEL || 'stable'),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  server: {
    port: Number(process.env.PORT) || 6789,
    strictPort: false,
  },
  configureServer(server) {
    server.middlewares.use('/__open-in-editor', openInEditor())
  },
})
