/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Art tools save in place and hold Windows file locks (plus temp files like
// `speak-1_0`). Watching those kills the dev server with EBUSY, so the cat art
// is left unwatched — drop in new frames and refresh the browser.
const UNWATCHED_ART = '/public/cats/'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    watch: {
      ignored: (path: string) => path.replace(/\\/g, '/').includes(UNWATCHED_ART),
    },
  },
  test: {
    environment: 'node',
  },
})
