// Run sequentially so competing browsers cannot distort either measurement.
// Usage: node scripts/benchmark-browser.mjs <baseline-checkout> [candidate-checkout]
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';

const candidate=path.resolve(process.argv[3]??'.');
const baseline=process.argv[2]?path.resolve(process.argv[2]):undefined;
const output=path.resolve(process.env.BENCHMARK_OUTPUT??'.local/full-suite-vitest');
fs.mkdirSync(output,{recursive:true});
const results=[];
function normalize(summary){return Object.fromEntries(Object.entries(summary).map(([file,value])=>[file==='total'?file:file.replaceAll('\\','/').split('/src/').at(-1),value]));}
function measure(label,cwd,round){
 const start=performance.now();
 const run=spawnSync(process.execPath,['scripts/coverage.mjs'],{cwd,env:{...process.env,CI:'true'},encoding:'utf8',maxBuffer:30*1024*1024});
 const seconds=Number(((performance.now()-start)/1000).toFixed(2));
 fs.writeFileSync(path.join(output,`${label}-${round}.log`),run.stdout+run.stderr);
 if(run.status!==0)throw new Error(`${label} round ${round} failed; see ${output}`);
 const coverage={};
 for(const kind of ['data','browser']){
  coverage[kind]=normalize(JSON.parse(fs.readFileSync(path.join(cwd,`coverage/${kind}/coverage-summary.json`),'utf8')));
  fs.writeFileSync(path.join(output,`${label}-${round}-${kind}.json`),JSON.stringify(coverage[kind],null,2));
 }
 const result={label,round,seconds};results.push(result);console.log(result);
 fs.writeFileSync(path.join(output,'timings.json'),JSON.stringify(results,null,2)+'\n');
 return coverage;
}
function compare(before,after){
 for(const kind of ['data','browser'])for(const [file,stats] of Object.entries(before[kind]))for(const metric of ['lines','statements','functions','branches']){
  const next=after[kind][file]?.[metric];
  if(!next||next.total!==stats[metric].total||next.covered<stats[metric].covered)throw new Error(`Coverage regression: ${kind}/${file} ${metric}: ${JSON.stringify(stats[metric])} -> ${JSON.stringify(next)}`);
 }
}
for(let round=1;round<=3;round++){
 let before,after;
 // Alternate order to reduce warm-cache/order bias.
 if(baseline&&round%2===1)before=measure('playwright',baseline,round);
 after=measure('vitest',candidate,round);
 if(baseline&&round%2===0)before=measure('playwright',baseline,round);
 if(before)compare(before,after);
}
const medians=Object.fromEntries([...new Set(results.map(r=>r.label))].map(label=>[label,results.filter(r=>r.label===label).map(r=>r.seconds).sort((a,b)=>a-b)[1]]));
console.log({medians});
fs.writeFileSync(path.join(output,'summary.json'),JSON.stringify({results,medians},null,2)+'\n');
