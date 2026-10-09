import { defineConfig } from 'vitest/config';
export default defineConfig({test:{include:['tests/data/**/*.test.ts'],coverage:{
  provider:'istanbul',include:['src/data/**/*.ts','src/connection.ts','src/fields.ts','src/history.ts'],
  reportsDirectory:'coverage/data',reporter:['text','json','json-summary','html'],
  thresholds:{lines:81,statements:81,functions:81,branches:81,
    'src/data/chill-state.ts':{lines:100,statements:100,functions:100,branches:100},
  },
}}});
