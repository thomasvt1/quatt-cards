import {defineConfig} from 'vitest/config';
import {playwright} from '@vitest/browser-playwright';
import istanbul from 'vite-plugin-istanbul';
import {browserCommands} from './tests/browser/commands.js';
export default defineConfig({
 optimizeDeps:{include:['lit']},
 plugins:process.env.QUATT_COVERAGE==='true'?[istanbul({include:['src/**/*.ts'],exclude:['src/demo/**'],checkProd:true})]:[],
 test:{
  include:['tests/browser/**/*.spec.ts'],maxWorkers:4,fileParallelism:true,isolate:true,
  testTimeout:30000,retry:process.env.CI?1:0,allowOnly:!process.env.CI,attachmentsDir:'test-results',
  browser:{enabled:true,headless:true,ui:false,provider:playwright({actionTimeout:5000}),
   instances:[
    {browser:'chromium',name:'chromium',exclude:['**/touch.spec.ts']},
    {browser:'chromium',name:'touch',include:['**/touch.spec.ts'],provider:playwright({actionTimeout:5000,contextOptions:{hasTouch:true,isMobile:true}})},
   ],
   locators:{exact:false},viewport:{width:1280,height:720},screenshotFailures:true,trace:{mode:'retain-on-failure',tracesDir:'test-results/traces'},commands:browserCommands,
  },
 },
});

