// @ts-check
const { defineConfig, devices } = require('@playwright/test');

const PORT = 8799;
const CI = !!process.env.CI;
// Screenshot baselines are Linux-only (made in the Playwright Docker image), so visual tests run only when VISUAL=1:
// in CI and through `npm run test:visual` / `npm run test:update-visual`.
const VISUAL = !!process.env.VISUAL;
const desktop = { viewport: { width: 1440, height: 900 } };

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: CI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  grepInvert: VISUAL ? undefined : /@visual/,
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled' } },
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}-{projectName}-{platform}{ext}',
  use: {
    baseURL: `http://127.0.0.1:${PORT}/`,
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], ...desktop } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], ...desktop } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], ...desktop } },
    { name: 'iPhone 14', use: { ...devices['iPhone 14'] } },
    { name: 'Pixel 7', use: { ...devices['Pixel 7'] } },
    { name: 'chromium-dark', use: { ...devices['Desktop Chrome'], ...desktop, colorScheme: 'dark' } },
  ],
  webServer: {
    command: `python3 -m http.server ${PORT} --bind 127.0.0.1 --directory docs`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !CI,
    stdout: 'ignore',
    stderr: 'ignore',
  },
});
