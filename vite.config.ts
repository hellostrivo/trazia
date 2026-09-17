import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { version } from './package.json';

export default defineConfig({
  plugins: [react()],
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
