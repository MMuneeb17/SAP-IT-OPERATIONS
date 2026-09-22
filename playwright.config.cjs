const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests', timeout: 120000, workers: 1,
  use: { baseURL: 'http://localhost:8082', browserName: 'chromium', channel: 'chrome', screenshot: 'only-on-failure' },
  webServer: { command: 'npm start', url: 'http://localhost:8082/test/flp.html', reuseExistingServer: !process.env.CI, timeout: 120000 },
  reporter: 'list'
});
