import {Miniflare} from 'miniflare';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const mf=new Miniflare({modules:true,scriptPath:'dist/server/index.js',modulesRoot:'dist/server',modulesRules:[{type:'ESModule',include:['**/*.js','**/*.mjs'],fallthrough:true}],compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB']});
try{
 const db=await mf.getD1Database('DB');for(const sql of (await readFile('drizzle/0000_zippy_green_goblin.sql','utf8')).split('--> statement-breakpoint'))await db.prepare(sql.trim()).run();
 const anon=await mf.dispatchFetch('https://test.invalid/api/sync');assert.equal(anon.status,401);
 const loaded=await mf.dispatchFetch('https://test.invalid/api/sync',{headers:{'oai-authenticated-user-id':'synthetic-smoke-user'}});assert.equal(loaded.status,200);const snapshot=await loaded.json();assert.equal(snapshot.state.version,4);assert.equal(snapshot.revision,0);
 const wrote=await mf.dispatchFetch('https://test.invalid/api/sync',{method:'PUT',headers:{'content-type':'application/json','oai-authenticated-user-id':'synthetic-smoke-user',origin:'https://test.invalid'},body:JSON.stringify({state:snapshot.state,revision:0})});assert.equal(wrote.status,200);assert.equal((await wrote.json()).revision,1);
 const home=await mf.dispatchFetch('https://test.invalid/');assert.equal(home.status,200);const html=await home.text();assert.match(html,/KEEP HEALTHY/);assert.match(html,/lang="ko"/);assert.match(html,/manifest.webmanifest/);
 console.log('PASS: compiled Worker, D1 migrations, authenticated read/write, anonymous denial, rendered entrypoint');
}finally{await mf.dispose();}
