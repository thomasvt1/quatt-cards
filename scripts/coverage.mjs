import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import libCoverage from 'istanbul-lib-coverage';
import libReport from 'istanbul-lib-report';
import reports from 'istanbul-reports';
import sourceMaps from 'istanbul-lib-source-maps';
const root=process.cwd(),raw=path.join(root,'coverage','raw',randomUUID());
fs.mkdirSync(raw,{recursive:true});
const run=(script,args,env=process.env)=>{const result=spawnSync(process.execPath,[script,...args],{stdio:'inherit',env});if(result.status!==0)process.exit(result.status??1);};
run('node_modules/vitest/vitest.mjs',['run','--coverage']);
run('node_modules/@playwright/test/cli.js',['test'],{...process.env,QUATT_COVERAGE:'true',QUATT_COVERAGE_DIR:raw});
const map=libCoverage.createCoverageMap({});
for(const file of fs.readdirSync(raw))map.merge(JSON.parse(fs.readFileSync(path.join(raw,file),'utf8')));
const remapped=await sourceMaps.createSourceMapStore().transformCoverage(map);
const context=libReport.createContext({dir:'coverage/browser',coverageMap:remapped});
for(const reporter of ['text','html','json','json-summary'])reports.create(reporter).execute(context);
// Discover all card modules from disk, including new cards with zero coverage.
const cards=fs.readdirSync('src/cards').filter(f=>f.endsWith('.ts'));
const metrics=['lines','statements','functions','branches'],minimum=81,failures=[];
const total=remapped.getCoverageSummary();
for(const metric of metrics)if(Number(total[metric].pct)<minimum)failures.push('All runtime source '+metric+': '+total[metric].pct+'% < '+minimum+'%');
for(const card of cards){
 const file=remapped.files().find(f=>f.replaceAll('\\','/').endsWith('/src/cards/'+card));
 if(!file){failures.push(card+': no coverage collected');continue;}
 const summary=remapped.fileCoverageFor(file).toSummary();
 for(const metric of metrics)if(Number(summary[metric].pct)<minimum)failures.push(card+' '+metric+': '+summary[metric].pct+'% < '+minimum+'%');
}
if(failures.length){console.error('Per-card coverage gate failed:\n'+failures.join('\n'));process.exit(1);}
console.log('Every card meets the 81% floor for lines, statements, functions and branches.');
