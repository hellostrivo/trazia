import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { version } from './package.json';

/**
 * Encabezados del bloque `for = "/*"` de netlify.toml (docs/architecture.md §7).
 * `vite preview` los envía igual que Netlify, de modo que los E2E comprueban la
 * CSP contra el artefacto real y no contra una copia que pueda desviarse.
 */
export function readNetlifyGlobalHeaders(tomlPath = new URL('./netlify.toml', import.meta.url)) {
  const toml = readFileSync(tomlPath, 'utf8');
  const block = toml.split(/^\[\[headers\]\]$/m).find((part) => /^\s*for = "\/\*"$/m.test(part));
  if (!block) throw new Error('netlify.toml: falta el bloque [[headers]] con for = "/*"');
  const headers: Record<string, string> = {};
  for (const match of block.matchAll(/^\s{4}([\w-]+) = "(.*)"$/gm)) {
    headers[match[1]!] = match[2]!;
  }
  return headers;
}

export default defineConfig({
  plugins: [
    react(),
    // SPEC-08: manifest + service worker (Workbox, generateSW). Todo el build se
    // precachea, incluidos los chunks de exportación, para que en modo avión se
    // pueda abrir, capturar, ver y exportar.
    VitePWA({
      registerType: 'prompt',
      // El registro se hace desde `virtual:pwa-register/react` (ActualizacionDisponible);
      // sin script inline en index.html, que la CSP (`script-src 'self'`) bloquearía.
      injectRegister: false,
      // Los íconos ya entran por `globPatterns`; sin esto se duplicarían en la
      // lista de precache. El plugin añade `manifest.webmanifest` por su cuenta.
      includeManifestIcons: false,
      manifest: {
        name: 'TRAZIA',
        short_name: 'TRAZIA',
        description: 'Dashboard personal para control de gastos y presupuestos.',
        lang: 'es-MX',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        // Tokens de SPEC-00: --color-bg.
        theme_color: '#faf7f2',
        background_color: '#faf7f2',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          // Sin entrada SVG: con `sizes: 'any'` Chrome la toma como ícono principal y
          // declara la app no instalable ("no-acceptable-icon"). El SVG queda como favicon.
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,txt}'],
        // Los chunks de exportación pesan ~0.94 MB (ExcelJS) y ~1.25 MB (react-pdf);
        // el límite por defecto de Workbox es 2 MiB. Se fija en 3 MiB para que un
        // crecimiento moderado no los saque del precache en silencio.
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        // Un solo archivo sw.js (sin workbox-*.js aparte) para que la regla
        // `Cache-Control: no-cache` de netlify.toml cubra todo el runtime.
        inlineWorkboxRuntime: true,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        // `prompt`: la versión nueva espera hasta que la persona pulse "Actualizar".
        skipWaiting: false,
        navigateFallback: '/index.html',
      },
    }),
  ],
  define: {
    // Versión mostrada en Configuración › Acerca de.
    __APP_VERSION__: JSON.stringify(version),
  },
  optimizeDeps: {
    // Sólo se cargan con `import()`, así que Vite no los descubre al arrancar.
    // Sin esto, la primera exportación en desarrollo dispara una re-optimización
    // y una recarga de página a mitad de la descarga (afecta a los E2E).
    include: ['exceljs', '@react-pdf/renderer'],
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    headers: readNetlifyGlobalHeaders(),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: true,
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['src/e2e/**', 'node_modules/**', 'dist/**'],
    coverage: {
      // Type-only declarations are not executable code and should not count against runtime coverage.
      exclude: ['src/domain/types.ts'],
    },
  },
});
