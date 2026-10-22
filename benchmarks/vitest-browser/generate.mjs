import fs from 'node:fs';
const source=fs.readFileSync('tests/browser/heat-battery-slim.spec.ts','utf8');
fs.writeFileSync('benchmarks/vitest-browser/battery-cases.ts',source.replace("from './fixtures'","from './adapter'"));
for(let i=0;i<13;i++)fs.writeFileSync(`benchmarks/vitest-browser/case-${String(i).padStart(2,'0')}.test.ts`,
  `import './battery-cases';\nimport {runCase} from './adapter';\nrunCase(${i});\n`);
