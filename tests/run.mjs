import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const dir=await mkdtemp(join(tmpdir(),'keep-healthy-test-'));
try {await build({entryPoints:['tests/critical.test.ts'],bundle:true,platform:'node',format:'esm',outfile:join(dir,'test.mjs'),alias:{'cloudflare:workers':resolve('tests/cloudflare.ts')},packages:'bundle'});await build({entryPoints:['tests/screens.test.tsx'],bundle:true,platform:'node',format:'esm',outfile:join(dir,'screens.mjs'),banner:{js:"import {createRequire} from 'node:module'; const require=createRequire(import.meta.url);"},alias:{'@/lib/use-workout':resolve('tests/ui-store-fixture.ts')},packages:'bundle'});const run=spawnSync(process.execPath,['--test','--test-isolation=none',join(dir,'test.mjs'),join(dir,'screens.mjs')],{stdio:'inherit',env:{...process.env,NODE_ENV:'test'}});process.exitCode=run.status??1;}finally{await rm(dir,{recursive:true,force:true});}
