import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';
import { resolve } from 'path';

/**
 * Inline theme-bootstrap injector.
 *
 * Every HTML page needs a tiny <script> in <head> that sets data-theme
 * BEFORE the browser paints — otherwise navigating across pages flashes
 * the wrong theme for one frame. Inlining the policy in seven HTML
 * files (originally the case) means a policy change becomes a 7-file
 * find-replace, which is exactly the kind of duplication that drifts.
 *
 * This plugin reads the policy from `web/src/js/theme-bootstrap.inline.js`
 * and replaces a `<!-- THEME_BOOTSTRAP -->` marker comment in each HTML
 * page with the script. Single source of truth, no module loader
 * required at runtime.
 */
function themeBootstrap() {
  const sourcePath = resolve(__dirname, 'web/src/js/theme-bootstrap.inline.js');
  return {
    name: 'theme-bootstrap',
    // Vite 7 hook shape: { order: 'pre' | 'post', handler: (html, ctx) => html }.
    // `order: 'pre'` runs before vite-plugin-pwa or any other plugin adds
    // <head> content.
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const source = readFileSync(sourcePath, 'utf8');
        return html.replace(
          '<!-- THEME_BOOTSTRAP -->',
          `<script>${source}</script>`
        );
      }
    }
  };
}

export default defineConfig({
  base: '/',
  root: 'web',
  publicDir: 'public',
  plugins: [
    themeBootstrap(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'data/*.json', 'favicon.ico'],
      manifest: {
        name: 'Athletics Utilities',
        short_name: 'AthleticsUtils',
        description: 'Calculators for track and field: pace & speed, World Athletics points, and combined events.',
        // Splash-screen and installed-app chrome colours track the
        // site's default theme. Manifest colours can't follow the user's
        // runtime theme choice — they're baked at install time — so we
        // use the new light/track values to match first-visit.
        theme_color: '#f4efe6',
        background_color: '#f4efe6',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        lang: 'en',
        categories: ['sports', 'utilities', 'productivity'],
        icons: [
          // Separate `any` and `maskable` icons. A single icon declared as both
          // gets cropped by Android's mask because a full-bleed logo has no safe
          // zone. The *-maskable variants have a solid background with the logo
          // centred in the inner 80% safe area.
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-192-maskable.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Pace & Speed Calculator',
            short_name: 'Pace',
            url: '/calculators/pace.html',
            description: 'Calculate pace, speed, splits and finish times.'
          },
          {
            name: 'World Athletics Score Calculator',
            short_name: 'Score',
            url: '/calculators/score.html',
            description: 'Convert any track or field performance into points.'
          },
          {
            name: 'Combined Event Score Calculator',
            short_name: 'Combined',
            url: '/calculators/combined-events.html',
            description: 'Decathlon, heptathlon, and pentathlon totals.'
          },
          {
            name: 'Age Calculator',
            short_name: 'Age',
            url: '/calculators/age.html',
            description: 'Exact age in years, months, and days between dates.'
          },
          {
            name: 'Time Calculator',
            short_name: 'Time',
            url: '/calculators/time.html',
            description: 'Add, subtract, multiply, or divide times.'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024, // 2 MiB is enough for the per-gender scoring files
        // Take over from the previous service worker as soon as the new one
        // activates so installed PWAs get fresh assets quickly. The pwa-updater
        // utility triggers an explicit update() check on visibilitychange and
        // once per hour so long-lived sessions don't get stuck on an old build.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\/data\/scoring-(men|women|mixed)\.min\.json$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'scoring-tables-cache',
              expiration: {
                maxEntries: 3,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          }
        ]
      }
    })
  ],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'web/index.html'),
        score: resolve(__dirname, 'web/calculators/score.html'),
        pace: resolve(__dirname, 'web/calculators/pace.html'),
        combinedEvents: resolve(__dirname, 'web/calculators/combined-events.html'),
        age: resolve(__dirname, 'web/calculators/age.html'),
        time: resolve(__dirname, 'web/calculators/time.html'),
        privacy: resolve(__dirname, 'web/privacy.html'),
        notFound: resolve(__dirname, 'web/404.html')
      }
    }
  }
});
