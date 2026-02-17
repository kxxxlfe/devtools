import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue2 from '@vitejs/plugin-vue2'
import openInEditor from 'launch-editor-middleware'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isDev = process.env.NODE_ENV !== 'production'

function copyHtmlToBuildPlugin() {
  return {
    name: 'copy-html-to-build',
    closeBundle() {
      const outDir = path.join(__dirname, 'build')
      fs.mkdirSync(outDir, { recursive: true })

      let indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8')
      indexHtml = indexHtml.replace(
        /<script type="module" src="\/src\/devtools\.js"><\/script>/,
        '<script src="devtools.js"></script>'
      )
      fs.writeFileSync(path.join(outDir, 'index.html'), indexHtml)

      let targetHtml = fs.readFileSync(path.join(__dirname, 'target.html'), 'utf-8')
      targetHtml = targetHtml.replace(
        /<script type="module" src="\/src\/hook\.js"><\/script>\s*<script type="module" src="\/target\/index\.js"><\/script>/,
        '<script src="hook.js"></script>\n    <script src="target.js"></script>'
      )
      fs.writeFileSync(path.join(outDir, 'target.html'), targetHtml)
    },
  }
}

export default defineConfig({
  plugins: [
    vue2(),
    copyHtmlToBuildPlugin(),
  ],
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
    middlewareMode: false,
  },
  configureServer(server) {
    server.middlewares.use('/__open-in-editor', openInEditor())
  },
  build: {
    outDir: 'build',
    emptyOutDir: true,
    minify: isDev ? false : 'esbuild',
    sourcemap: isDev,
    rollupOptions: {
      input: {
        devtools: path.resolve(__dirname, 'src/devtools.js'),
        backend: path.resolve(__dirname, 'src/backend.js'),
        hook: path.resolve(__dirname, 'src/hook.js'),
        target: path.resolve(__dirname, 'target/index.js'),
      },
      output: {
        entryFileNames: '[name].js',
        ...(isDev ? { format: 'es', compact: false } : {}),
      },
    },
  },
})
