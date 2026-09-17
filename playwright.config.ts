import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src',
  // El shell vive en src/e2e y las pruebas por SPEC en src/__tests__/e2e.
  testMatch: ['e2e/*.spec.ts', '__tests__/e2e/*.spec.ts'],
  timeout: 30_000,
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'webkit',
      use: {
        ...devices['iPhone 13'],
        locale: 'es-MX',
      },
    },
  ],
  // SPEC-08: los E2E corren contra el artefacto que se despliega (dist servido por
  // `vite preview`), no contra el servidor de desarrollo. Así se prueban el service
  // worker, el precache, los encabezados de seguridad y las diferencias dev/producción.
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
