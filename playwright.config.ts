import { defineConfig, devices } from '@playwright/test';
const coverage=process.env.QUATT_COVERAGE==='true',port=coverage?4175:4174;
export default defineConfig({
  testDir:'./tests/browser', fullyParallel:true, forbidOnly:Boolean(process.env.CI),
  retries:process.env.CI?1:0, workers:process.env.CI?2:4,
  reporter:[['list'],['html',{open:'never'}]],
  use:{baseURL:`http://127.0.0.1:${port}`,trace:'retain-on-failure',screenshot:'only-on-failure'},
  projects:[{name:'chromium',use:{...devices['Desktop Chrome']}}],
  webServer:{command:`npm run dev -- --port ${port} --strictPort`,url:`http://127.0.0.1:${port}`,reuseExistingServer:!coverage&&!process.env.CI,timeout:60_000},
});
