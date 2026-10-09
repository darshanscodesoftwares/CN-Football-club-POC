import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'

/**
 * Preloads the hero poster (the first video frame) so it is the first thing the browser
 * fetches. Reads the manifest written by `npm run frames:hero`, so the URL always
 * carries the current version.
 */
function preloadHeroPoster(): Plugin {
  return {
    name: 'marina:preload-hero-poster',
    transformIndexHtml() {
      // The default (first) hero video in src/sections/hero/heroVideos.ts.
      const manifestUrl = new URL('./src/sections/hero/videos/gemini.frames.json', import.meta.url)
      const manifest = JSON.parse(readFileSync(manifestUrl, 'utf8')) as { poster: string; version: string }
      return [
        {
          tag: 'link',
          attrs: { rel: 'preload', as: 'image', type: 'image/webp', fetchpriority: 'high', href: `${manifest.poster}?v=${manifest.version}` },
          injectTo: 'head',
        },
      ]
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), preloadHeroPoster()],
  build: {
    // three.js (~540 kB raw, 135 kB gzip) is its own chunk, loaded only when the browser is idle
    // and only on mouse devices, for the ball cursor; it never blocks the first paint.
    chunkSizeWarningLimit: 600,
  },
})
