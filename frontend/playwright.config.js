import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests', fullyParallel: false,
  use: { baseURL: 'http://127.0.0.1:5173', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
    { name: 'tablet', use: { ...devices['iPad Mini'], defaultBrowserType: 'chromium' } },
  ],
  webServer: {
    command: 'npm run dev', url: 'http://127.0.0.1:5173', reuseExistingServer: false,
    env: { VITE_ESP8266_URL: 'http://192.168.1.50', NODE_ENV: 'development' },
  },
})
