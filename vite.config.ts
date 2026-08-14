/// <reference types="vitest/config" />
import { createReadStream, readdirSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Art tools save in place and hold Windows file locks (plus temp files like
// `speak-1_0`). Watching those kills the dev server with EBUSY, so cat/chess
// art is left unwatched — drop in new frames and refresh the browser.
const UNWATCHED_ART = ['/public/cats/', '/public/chess/']

const CATS_ROOT = path.resolve(import.meta.dirname, 'public/cats')
const CHESS_ROOT = path.resolve(import.meta.dirname, 'public/chess')

/**
 * Vite indexes `public/` once at startup and depends on the watcher to notice
 * later additions. The art is deliberately unwatched, so a newly drawn PNG
 * would never register and would quietly fall through to the SPA HTML
 * fallback — which the browser then fails to decode as an image. Reading
 * straight off disk keeps drop-in frames working with just a browser refresh.
 */
function listPngs(root: string): string[] {
  const out: string[] = []
  const walk = (dir: string, rel: string) => {
    let entries
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const ent of entries) {
      if (ent.name.startsWith('.')) continue
      const nextRel = rel ? `${rel}/${ent.name}` : ent.name
      if (ent.isDirectory()) walk(path.join(dir, ent.name), nextRel)
      else if (ent.isFile() && ent.name.endsWith('.png')) out.push(nextRel)
    }
  }
  walk(root, '')
  return out
}

function isInsideRoot(root: string, file: string): boolean {
  const rel = path.relative(root, file)
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel)
}

function firebaseMessagingSwPlugin(): Plugin {
  let source = '// firebase messaging sw — config filled at build/dev\n'
  return {
    name: 'firebase-messaging-sw',
    configResolved(config) {
      const env = loadEnv(config.mode, config.envDir, 'VITE_')
      const firebaseConfig = {
        apiKey: env.VITE_FIREBASE_API_KEY ?? '',
        authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
        projectId: env.VITE_FIREBASE_PROJECT_ID ?? '',
        storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
        messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
        appId: env.VITE_FIREBASE_APP_ID ?? '',
      }
      source = `importScripts('https://www.gstatic.com/firebasejs/12.16.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.16.0/firebase-messaging-compat.js');
firebase.initializeApp(${JSON.stringify(firebaseConfig)});
firebase.messaging();
`
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0]
        if (url !== '/firebase-messaging-sw.js') {
          next()
          return
        }
        res.setHeader('Content-Type', 'application/javascript')
        res.setHeader('Cache-Control', 'no-cache')
        res.end(source)
      })
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'firebase-messaging-sw.js',
        source,
      })
    },
  }
}

function servePngTree(urlPrefix: '/cats' | '/chess', diskRoot: string): Plugin {
  return {
    name: `serve-png-${urlPrefix.slice(1)}`,
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0]
        if (
          urlPrefix === '/chess' &&
          url === '/chess/manifest.json'
        ) {
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', 'no-cache')
          res.end(JSON.stringify(listPngs(diskRoot)))
          return
        }
        if (!url?.startsWith(`${urlPrefix}/`) || !url.endsWith('.png')) {
          return next()
        }

        const file = path.resolve(diskRoot, `.${url.slice(urlPrefix.length)}`)
        if (!isInsideRoot(diskRoot, file)) return next()

        void stat(file).then(
          (info) => {
            if (!info.isFile()) {
              next()
              return
            }
            // Revalidate every load so re-exported art shows up on refresh,
            // but stay cacheable — an uncacheable frame is re-fetched on every
            // swap of a mouth animation, which reads as a flicker.
            const etag = `W/"${info.size}-${info.mtimeMs}"`
            res.setHeader('ETag', etag)
            res.setHeader('Cache-Control', 'no-cache')
            if (req.headers['if-none-match'] === etag) {
              res.statusCode = 304
              res.end()
              return
            }
            res.setHeader('Content-Type', 'image/png')
            res.setHeader('Content-Length', info.size)
            createReadStream(file).pipe(res)
          },
          () => {
            // Real 404 — not the SPA HTML fallback, which the browser
            // otherwise tries to decode as an image.
            res.statusCode = 404
            res.end()
          },
        )
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __CHESS_SPRITE_FILES__: JSON.stringify(listPngs(CHESS_ROOT)),
  },
  plugins: [
    react(),
    tailwindcss(),
    servePngTree('/cats', CATS_ROOT),
    servePngTree('/chess', CHESS_ROOT),
    firebaseMessagingSwPlugin(),
  ],
  server: {
    watch: {
      ignored: (filePath: string) => {
        const normalized = filePath.replace(/\\/g, '/')
        return UNWATCHED_ART.some((dir) => normalized.includes(dir))
      },
    },
  },
  test: {
    environment: 'node',
  },
})
