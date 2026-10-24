import {Miniflare} from 'miniflare';
import {readFile,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const mf=new Miniflare({outboundService:()=>new Response('External fetch disabled in local smoke test',{status:403}),modules:true,scriptPath:'dist/server/index.js',modulesRoot:'dist/server',modulesRules:[{type:'ESModule',include:['**/*.js','**/*.mjs'],fallthrough:true}],compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB']});
try{
 const db=await mf.getD1Database('DB');for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())for(const sql of (await readFile('drizzle/'+file,'utf8')).split('--> statement-breakpoint'))await db.prepare(sql.trim()).run();
 const anon=await mf.dispatchFetch('https://test.invalid/api/sync');assert.equal(anon.status,401);
 const loaded=await mf.dispatchFetch('https://test.invalid/api/sync',{headers:{'oai-authenticated-user-id':'synthetic-smoke-user'}});assert.equal(loaded.status,200);const snapshot=await loaded.json();assert.equal(snapshot.state.version,4);assert.equal(snapshot.revision,0);
 snapshot.state.sessions.push({id:'cardio-smoke',name:'기구별 기록 테스트',date:'2026-09-09T03:00:00Z',duration:1230,updatedAt:Date.now(),note:'',gymId:'main',condition:'',exercises:[{id:'smoke-row',exerciseId:'synthetic-incline',name:'인클라인 트레드밀 워크',equipmentId:'',note:'',rest:90,superset:'',sets:[{id:'smoke-set',weight:0,reps:0,duration:1230,distance:2.5,done:true,kind:'work',rpe:6,metrics:{incline:12.5,elevationGain:250,calories:188.5,speed:6.5,heartRate:138}}]}]});
 snapshot.state.profile.sessionView='focus';
 const settings={weightUnit:'lb',weightBasis:'pair',inclineUnit:'level',fieldOrder:['duration','inclineLevel','calories'],hiddenFields:['speed'],weightStep:1.133980925,defaults:{inclineLevel:7}};
 snapshot.state.profile.recordingPreferences={'main/synthetic-incline':settings};
 snapshot.state.sessions[0].exercises[0].recording=settings;
 Object.assign(snapshot.state.sessions[0].exercises[0],{repMin:8,repMax:12,effortCap:7});
 snapshot.state.routines[0].exercises[0].effortCap=7;
 snapshot.state.sessions[0].exercises[0].sets[0].metrics.inclineLevel=7;
 snapshot.state.sessions[0].exercises[0].sets[0].target={weight:0,reps:0,duration:1200,distance:2.4};
 const wrote=await mf.dispatchFetch('https://test.invalid/api/sync',{method:'PUT',headers:{'content-type':'application/json','oai-authenticated-user-id':'synthetic-smoke-user',origin:'https://test.invalid'},body:JSON.stringify({state:snapshot.state,revision:0,clientSchema:2})});assert.equal(wrote.status,200);assert.equal((await wrote.json()).revision,1);
 const roundtrip=await(await mf.dispatchFetch('https://test.invalid/api/sync',{headers:{'oai-authenticated-user-id':'synthetic-smoke-user'}})).json();assert.deepEqual(roundtrip.state.sessions[0].exercises[0].sets[0].metrics,snapshot.state.sessions[0].exercises[0].sets[0].metrics);
 assert.deepEqual(roundtrip.state.profile.recordingPreferences,snapshot.state.profile.recordingPreferences);
 assert.equal(roundtrip.state.profile.sessionView,'focus');
 assert.deepEqual(roundtrip.state.sessions[0].exercises[0].recording,settings);
 assert.equal(roundtrip.state.sessions[0].exercises[0].repMax,12);
 assert.equal(roundtrip.state.sessions[0].exercises[0].effortCap,7);
 assert.equal(roundtrip.state.routines[0].exercises[0].effortCap,7);
 assert.deepEqual(roundtrip.state.sessions[0].exercises[0].sets[0].target,{weight:0,reps:0,duration:1200,distance:2.4});
 const home=await mf.dispatchFetch('https://test.invalid/');assert.equal(home.status,200);const html=await home.text();assert.match(html,/KEEP HEALTHY/);assert.match(html,/lang="ko"/);assert.match(html,/manifest.webmanifest/);
 console.log('PASS: compiled Worker, D1 migrations, authenticated settings/targets/cardio round-trip, anonymous denial, rendered entrypoint');
}finally{await mf.dispose();}
