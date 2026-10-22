import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {randomUUID} from 'node:crypto';
import libCoverage from 'istanbul-lib-coverage';

const results=[];
for(let round=1;round<=3;round++)for(const runner of (round%2?['playwright','vitest']:['vitest','playwright'])) {
  const raw=path.resolve('benchmarks/vitest-browser/raw',`${runner}-${round}-${randomUUID()}`);
  fs.mkdirSync(raw,{recursive:true});
  const env={...process.env,CI:'true',QUATT_COVERAGE:'true',QUATT_COVERAGE_DIR:raw,PLAYWRIGHT_BROWSERS_PATH:process.env.PLAYWRIGHT_BROWSERS_PATH??path.resolve('.local/benchmark-browsers')};
  const args=runner==='playwright'
    ? ['node_modules/@playwright/test/cli.js','test','tests/browser/heat-battery-slim.spec.ts','--workers=4','--retries=0','--reporter=list']
    : ['node_modules/vitest/vitest.mjs','run','--config','benchmarks/vitest-browser/vitest.config.ts'];
  const start=performance.now();
  const run=spawnSync(process.execPath,args,{env,encoding:'utf8',maxBuffer:20*1024*1024});
  const seconds=Number(((performance.now()-start)/1000).toFixed(2));
  const output=(run.stdout??'')+(run.stderr??'');
  fs.writeFileSync(`benchmarks/vitest-browser/${runner}-${round}.log`,output);
  if(run.status!==0){console.error(output);process.exit(run.status??1);}
  if(!/13 passed/.test(output.replace(/\u001b\[[0-9;]*m/g,'')))throw new Error('Expected all 13 cases to pass');
  const map=libCoverage.createCoverageMap({});
  for(const file of fs.readdirSync(raw))map.merge(JSON.parse(fs.readFileSync(path.join(raw,file),'utf8')));
  const card=map.files().find(file=>file.replaceAll('\\','/').endsWith('/src/cards/heat-battery-card.ts'));
  if(!card)throw new Error('Missing instrumented Heat Battery coverage');
  const coverage=map.fileCoverageFor(card).toSummary().toJSON();
  if(fs.readdirSync(raw).length!==13)throw new Error('Expected coverage from all 13 isolated test cases');
  if(results.length && JSON.stringify(coverage)!==JSON.stringify(results[0].cardCoverage))throw new Error('Heat Battery coverage differs between runs');
  results.push({runner,round,seconds,rawFiles:fs.readdirSync(raw).length,cardCoverage:coverage,raw});
  fs.writeFileSync('benchmarks/vitest-browser/results.json',JSON.stringify(results,null,2));
  console.log(JSON.stringify(results.at(-1)));
}
const median=values=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)];
const medians=Object.fromEntries(['playwright','vitest'].map(runner=>[runner,median(results.filter(item=>item.runner===runner).map(item=>item.seconds))]));
console.log(JSON.stringify({medians,percentFaster:Number(((1-medians.vitest/medians.playwright)*100).toFixed(1))}));
