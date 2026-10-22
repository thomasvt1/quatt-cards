import {defineConfig} from 'vitest/config';
import {playwright} from '@vitest/browser-playwright';
import istanbul from 'vite-plugin-istanbul';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';

export default defineConfig({
  optimizeDeps:{include:['lit']},
  plugins:[istanbul({include:['src/**/*.ts'],exclude:['src/demo/**'],checkProd:true})],
  test:{
    include:['benchmarks/vitest-browser/case-*.test.ts'],
    maxWorkers:4, fileParallelism:true, isolate:true,
    testTimeout:30000, retry:0, attachmentsDir:'benchmarks/vitest-browser/attachments',
    browser:{
      enabled:true, headless:true, ui:false,
      provider:playwright({actionTimeout:5000}), instances:[{browser:'chromium'}],
      viewport:{width:1280,height:720},
      screenshotFailures:true, trace:'retain-on-failure',
      commands:{
        saveTrialCoverage(_context:any,data:any) {
          const dir=process.env.QUATT_COVERAGE_DIR!;
          mkdirSync(dir,{recursive:true});writeFileSync(join(dir,randomUUID()+'.json'),JSON.stringify(data));
        },
      },
    },
  },
});
