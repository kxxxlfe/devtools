import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue2 from '@vitejs/plugin-vue2'
import webExtension from 'vite-plugin-web-extension'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isDev = process.env.NODE_ENV !== 'production'

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name)
    const d = path.join(dest, name)
    if (fs.statSync(s).isDirectory()) copyDirSync(s, d)
    else fs.copyFileSync(s, d)
  }
}

function copyPublicPlugin() {
  return {
    name: 'copy-public',
    buildStart() {
      const publicDir = path.join(__dirname, 'public')
      fs.mkdirSync(path.join(publicDir, 'icons'), { recursive: true })
      fs.mkdirSync(path.join(publicDir, 'popups'), { recursive: true })
      copyDirSync(path.join(__dirname, 'icons'), path.join(publicDir, 'icons'))
      fs.copyFileSync(path.join(__dirname, 'popups', 'popup.css'), path.join(publicDir, 'popups', 'popup.css'))
    },
  }
}

export default defineConfig({
  publicDir: 'public',
  plugins: [
    copyPublicPlugin(),
    vue2(),
    webExtension({
      manifest: 'manifest.json',
      additionalInputs: [
        'devtools.html',
        'src/devtools.js',
        'src/devtools-background.js',
        'src/backend.js',
        'src/proxy.js',
        'src/hook-exec.js',
        'src/detector-exec.js',
        'popups/popup.js',
      ],
      disableAutoLaunch: true,
      scriptViteConfig: {
        build: {
          minify: !isDev,
          sourcemap: isDev,
          rollupOptions: isDev
            ? {
                output: {
                  format: 'es',
                  compact: false,
                },
              }
            : undefined,
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@front': path.resolve(__dirname, 'node_modules/@vue-devtools/app-frontend/src'),
      '@back': path.resolve(__dirname, 'node_modules/@vue-devtools/app-backend/src'),
      '@utils': path.resolve(__dirname, 'node_modules/@vue-devtools/shared-utils/src'),
    },
  },
  css: {
    preprocessorOptions: undefined,
  },
  define: {
    'process.env.RELEASE_CHANNEL': JSON.stringify(process.env.RELEASE_CHANNEL || 'stable'),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  build: {
    outDir: 'build',
    emptyOutDir: false,
    minify: isDev ? false : 'esbuild',
    sourcemap: isDev,
    rollupOptions: isDev
      ? {
          output: {
            format: 'es',
            compact: false,
          },
        }
      : undefined,
  },
})
