import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', timeout: 60_000, fullyParallel: false,
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: 'msedge' } },
    { name: 'touch', use: { ...devices['Pixel 7'], channel: 'msedge' } },
    { name: 'safari', testMatch: '**/mobile-regressions.spec.ts', use: { ...devices['iPhone 13'], browserName: 'webkit' } },
  ],
  webServer: { command: 'npm run preview', url: 'http://127.0.0.1:4173/gogogo/', reuseExistingServer: true },
});
