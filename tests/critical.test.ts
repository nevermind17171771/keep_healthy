import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {defaultState,stateSchema,startSession,makeSet,exercise,EXERCISES,elapsed,oneRM,volume,completedSets,latestSets,recommendation,migrate,mergeStates,day,parseTime,type AppState} from '../lib/model';
import {GET,PUT} from '../app/api/sync/route';
import {env} from './cloudflare';
const find=(name:string)=>{const ex=EXERCISES.find(e=>e.name===name);assert.ok(ex,name);return ex;};
const saved=(name='바벨 벤치프레스',weight=40,reps=10)=>{const state=defaultState(),s=startSession(state);delete s.startedAt;s.exercises=[{id:'exercise-row',exerciseId:find(name).id,name,equipmentId:'',note:'',rest:90,superset:'',sets:[makeSet({weight,reps,done:true,rpe:8})]}];s.duration=3600;state.sessions=[s];return state;};
test('real timestamps and an active session survive the storage schema',()=>{const s=defaultState();s.draft=startSession(s,s.routines[0]);assert.equal(stateSchema.safeParse(s).success,true);assert.ok(s.draft.exercises.length);});
test('invalid data never becomes a valid snapshot',()=>{const s=saved();s.sessions[0].exercises[0].sets[0].weight=-5;assert.equal(stateSchema.safeParse(s).success,false);s.sessions[0].exercises[0].sets[0].weight=NaN;assert.equal(stateSchema.safeParse(s).success,false);});
test('active stopwatch excludes pauses without changing the start timestamp',()=>{const s=startSession(defaultState());s.startedAt=100000;s.pausedMs=20000;assert.equal(elapsed(s,180000),60);s.pausedAt=160000;assert.equal(elapsed(s,900000),40);assert.equal(s.startedAt,100000);});
test('time strings retain seconds and malformed values are harmless',()=>{assert.equal(parseTime('20:30'),1230);assert.equal(parseTime('oops'),0);assert.equal(parseTime(45),45);});
test('volume excludes warmups, unfinished sets, assisted loads, and cardio',()=>{const s=saved().sessions[0];s.exercises[0].sets.push(makeSet({weight:20,reps:10,done:true,kind:'warmup'}),makeSet({weight:90,reps:10,done:false}));s.exercises.push({...s.exercises[0],id:'cardio',exerciseId:find('트레드밀').id,sets:[makeSet({weight:100,reps:10,duration:1230,distance:3,done:true})]});assert.equal(volume(s),400);assert.equal(completedSets(s),2);});
test('1RM does not extrapolate high-rep or assisted work and actual singles remain exact',()=>{assert.equal(oneRM(100,1),100);assert.equal(oneRM(40,10),53.3);assert.equal(oneRM(100,20),0);assert.equal(oneRM(0,10),0);});
test('prior loads are separated by equipment identity',()=>{const s=saved();s.sessions[0].exercises[0].equipmentId='machine-a';assert.equal(latestSets(s,find('바벨 벤치프레스').id,'machine-b').length,0);assert.equal(latestSets(s,find('바벨 벤치프레스').id,'machine-a')[0].weight,40);});
test('progression requires all straight sets to hit reps with recorded RPE',()=>{const s=saved('바벨 벤치프레스',40,12),id=find('바벨 벤치프레스').id;s.sessions[0].exercises[0].sets.push(makeSet({weight:40,reps:12,done:true,rpe:8}));assert.equal(recommendation(s,id).weight,42.5);s.sessions[0].exercises[0].sets[1].rpe=0;assert.equal(recommendation(s,id).weight,40);s.sessions[0].exercises[0].sets[1].rpe=10;assert.equal(recommendation(s,id).weight,40);s.sessions[0].exercises[0].sets[1].rpe=8;s.sessions[0].exercises[0].sets[1].weight=30;assert.equal(recommendation(s,id).weight,40);});
test('assisted progression reduces assistance while a new exercise has no invented load',()=>{const ex=EXERCISES.find(e=>e.type==='assisted')!;const s=saved(ex.name,30,12);assert.equal(recommendation(s,ex.id).weight,27.5);assert.equal(recommendation(defaultState(),find('바벨 벤치프레스').id).weight,0);});
test('hamstrings never map to arm biceps; shoulder heads and lats are distinct',()=>{assert.ok(find('라잉 레그 컬').primary.includes('hamstring'));assert.ok(!find('라잉 레그 컬').primary.includes('biceps'));const side=EXERCISES.find(e=>e.name==='덤벨 사이드 레터럴 레이즈')!;assert.ok(side.primary.includes('side-deltoids'));assert.ok(!side.primary.includes('front-deltoids'));assert.ok(EXERCISES.some(e=>e.primary.includes('lats')));});
const legacy={sessions:[{id:'old-1',name:'이전 운동',date:'2026-08-01T03:00:00Z',duration:3600000,exercises:[{name:'트레드밀',sets:[{duration:'20:30',distance:3,done:true}]},{name:'데드행',sets:[{duration:45,done:true}]},{name:'로잉머신',sets:[{duration:'05:30',distance:1000,done:true}]}]}],goals:{bodyWeight:70},weightLog:[{date:'2026-08-01',weight:78}],inbodyRecords:[{date:'2026-08-02',weight:77,skeletalMuscle:35,bodyFat:20}],nutritionLog:[{date:'2026-08-01',protein:130}],savedRoutines:[]};
test('legacy migration respects milliseconds, seconds, meters, and actual body measurements',()=>{const s=migrate(legacy);assert.equal(s.sessions[0].duration,3600);assert.equal(s.sessions[0].exercises[0].sets[0].duration,1230);assert.equal(s.sessions[0].exercises[1].sets[0].duration,45);assert.equal(s.sessions[0].exercises[2].sets[0].distance,1);assert.equal(s.profile.goalWeight,70);assert.deepEqual(s.body.map(x=>x.weight),[77,78]);assert.deepEqual(s.legacyArchive,legacy);});
test('re-importing a legacy backup does not duplicate body or workout records',()=>{const a=migrate(legacy),b=migrate(legacy),s=mergeStates(a,b);assert.equal(s.sessions.length,1);assert.equal(s.body.length,2);});
test('malformed backup is rejected as a whole',()=>{assert.throws(()=>migrate({sessions:[{date:'not-a-date',exercises:[]}]}));assert.throws(()=>migrate({random:true}));});
test('merge preserves deletes and unrelated newer records',()=>{const a=saved(),b=structuredClone(a);a.sessions[0].deletedAt=2000;a.sessions[0].updatedAt=2000;b.sessions[0].updatedAt=1000;b.sessions.push({...b.sessions[0],id:'other',updatedAt:3000});const s=mergeStates(a,b);assert.equal(s.sessions.length,2);assert.equal(s.sessions[0].deletedAt,2000);});
test('Seoul calendar boundary is independent from the execution machine timezone',()=>{assert.equal(day('2026-09-01T15:30:00Z'),'2026-09-02');});
function database(){const db=new DatabaseSync(':memory:');db.exec(readFileSync('drizzle/0000_zippy_green_goblin.sql','utf8'));env.DB={prepare(sql:string){let args:unknown[]=[];const q={bind(...v:unknown[]){args=v;return q;},async first(){return db.prepare(sql).get(...args as any[])||null;},async all(){return {results:db.prepare(sql).all(...args as any[])};},async run(){const r=db.prepare(sql).run(...args as any[]);return {success:true,meta:{changes:r.changes}};}};return q;}};return db;}
const req=(user:string|null,body?:unknown,origin?:string,path='')=>new Request('https://example.test/api/sync'+path,{method:body?'PUT':'GET',headers:{...(user?{'oai-authenticated-user-id':user}:{}),...(origin?{origin}:{}),'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
test('API denies anonymous reads and writes',async()=>{const db=database();assert.equal((await GET(req(null))).status,401);assert.equal((await PUT(req(null,{state:defaultState(),revision:0}))).status,401);db.close();});
test('API persists valid snapshots, isolates users, and exposes owner-only backups',async()=>{const db=database();const s=saved();assert.equal((await PUT(req('user-a',{state:s,revision:0}))).status,200);const a=await(await GET(req('user-a'))).json() as any,b=await(await GET(req('user-b'))).json() as any;assert.equal(a.state.sessions.length,1);assert.equal(a.revision,1);assert.equal(b.state.sessions.length,0);assert.equal(b.revision,0);const backups=await(await GET(req('user-a',undefined,undefined,'?backups=1'))).json() as any;assert.equal(backups.backups.length,1);assert.equal((await GET(req('user-b',undefined,undefined,'?restore='+backups.backups[0].id))).status,404);db.close();});
test('API rejects stale writes without erasing the accepted snapshot',async()=>{const db=database();const a=saved(),b=saved('바벨 벤치프레스',60,10);await PUT(req('user-a',{state:a,revision:0}));assert.equal((await PUT(req('user-a',{state:b,revision:0}))).status,409);const current=await(await GET(req('user-a'))).json() as any;assert.equal(current.state.sessions[0].exercises[0].sets[0].weight,40);db.close();});
test('API rejects malformed payloads, oversized backups, and cross-origin writes',async()=>{const db=database();assert.equal((await PUT(req('user-a',{state:{},revision:0}))).status,400);assert.equal((await PUT(req('user-a',{state:defaultState(),revision:-1}))).status,400);assert.equal((await PUT(req('user-a',{state:defaultState(),revision:0},'https://evil.test'))).status,403);assert.equal((await PUT(req('user-a',{state:{legacyArchive:'x'.repeat(1500001)},revision:0}))).status,413);db.close();});
test('PWA manifest and service-worker precache point to existing assets',()=>{const manifest=JSON.parse(readFileSync('public/manifest.webmanifest','utf8'));assert.equal(manifest.display,'standalone');assert.equal(manifest.scope,'/');for(const icon of manifest.icons)assert.ok(readFileSync('public'+icon.src).length>0);for(const file of ['public/offline.html','public/sw.js'])assert.ok(readFileSync(file).length>0);const worker=readFileSync('public/sw.js','utf8');assert.match(worker,/pathname.startsWith\('\/api\/'\)/);assert.ok(!worker.includes('cache.put(request, await fetch(request))'));});
test('concurrent unfinished workouts remain recoverable after merging',()=>{const a=defaultState(),b=defaultState();a.draft=startSession(a);b.draft=startSession(b);b.draft.name='second device';const merged=mergeStates(a,b);assert.equal(merged.draft!.id,a.draft.id);assert.equal(merged.recoveredDrafts.length,1);assert.match(merged.recoveredDrafts[0].name,/second device/);assert.equal(mergeStates(merged,b).recoveredDrafts.length,1);assert.equal(migrate({local:a,remote:b}).recoveredDrafts.length,1);});

import {cardioFields,cardioValue,cardioPatch,cardioSummary,nextCardioInterval,CARDIO_CSV_FIELDS} from '../lib/cardio';
import {shortsSearchUrl} from '../lib/exercise-video';
import {boxingBellSamples} from '../lib/round-bell';
import {preserveMissingMetrics} from '../lib/preserve-metrics';
test('treadmills and stairs expose the measurements their consoles report',()=>{
 const fields=(name:string)=>cardioFields(name).filter(f=>!f.optional).map(f=>f.key);
 assert.deepEqual(fields('인클라인 트레드밀 워크'),['duration','distance','incline','elevationGain','calories','speed']);
 assert.deepEqual(fields('트레드밀'),['duration','distance','calories','speed']);
 assert.deepEqual(fields('천국의 계단'),['duration','steps','calories','floors']);
 for(const name of ['인클라인 트레드밀 워크','트레드밀','천국의 계단'])assert.equal(find(name).type,'cardio');
 assert.ok(fields('사이클').includes('rpm'));
 assert.ok(cardioFields('로잉머신').some(f=>f.key==='split'&&f.unit==='분:초/500m'));
 assert.ok(!fields('천국의 계단').includes('distance'));
});
test('rowing metres round-trip to canonical kilometres without changing existing records',()=>{
 const field=cardioFields('로잉머신').find(f=>f.key==='distance')!;
 const row=makeSet({distance:1.235});assert.equal(cardioValue(row,field),1235);
 assert.deepEqual(cardioPatch(field,2500),{distance:2.5});
 assert.match(cardioSummary('로잉머신',makeSet({distance:2.5,metrics:{split:125,calories:103}})),/이동거리 2,500m.*500m 페이스 02:05\/500m/);
});
test('cardio metrics survive JSON backup and validation, including zero incline and descending grade',()=>{
 const state=saved('인클라인 트레드밀 워크');const row=state.sessions[0].exercises[0].sets[0];
 row.metrics={incline:0,speed:5.5,elevationGain:168,calories:234,heartRate:132};
 const loaded=migrate(JSON.parse(JSON.stringify(state)));assert.deepEqual(loaded.sessions[0].exercises[0].sets[0].metrics,row.metrics);
 assert.match(cardioSummary('인클라인 트레드밀 워크',row),/경사 0%/);
 row.metrics.incline=-3;assert.equal(stateSchema.safeParse(state).success,true);
 for(const metrics of [{calories:-1},{steps:2.4},{heartRate:Infinity},{speed:NaN}]){row.metrics=metrics;assert.equal(stateSchema.safeParse(state).success,false);}
 delete row.metrics;assert.equal(stateSchema.safeParse(state).success,true);
});
test('unrecorded measurements are empty; the app never invents calories or vertical gain',()=>{
 const row=makeSet({duration:1800,distance:2.5,metrics:{incline:10,speed:5}});
 assert.equal(cardioValue(row,cardioFields('인클라인 트레드밀 워크').find(f=>f.key==='calories')!),undefined);
 assert.doesNotMatch(cardioSummary('인클라인 트레드밀 워크',row),/칼로리|수직 이동거리/);
 assert.deepEqual(cardioPatch(cardioFields('트레드밀').find(f=>f.key==='calories')!,undefined),{metrics:{calories:undefined}});
 assert.equal(CARDIO_CSV_FIELDS.find(f=>f.key==='elevationGain')?.header,'elevation_gain_m');
 assert.equal(CARDIO_CSV_FIELDS.find(f=>f.key==='split')?.header,'split_seconds_per_500m');
});
test('new cardio intervals copy machine settings but clear prior effort and totals',()=>{
 const prev=makeSet({duration:900,distance:1.2,reps:50,metrics:{incline:12,speed:4.8,resistance:7,elevationGain:140,calories:99,steps:420,floors:22,heartRate:140}});
 const next=makeSet(nextCardioInterval(prev));
 assert.deepEqual(next.metrics,{incline:12,speed:4.8,resistance:7});assert.equal(next.duration,0);assert.equal(next.distance,0);assert.equal(next.reps,0);assert.equal(next.done,false);assert.equal(next.rpe,0);
});
test('legacy cardio extras migrate out of the archive with units intact',()=>{
 const source=structuredClone(legacy) as any;Object.assign(source.sessions[0].exercises[0].sets[0],{incline:0,speed:6.5,calories:220,elevationGain:145});source.sessions[0].exercises[2].sets[0].split='02:05';
 const state=migrate(source);assert.deepEqual(state.sessions[0].exercises[0].sets[0].metrics,{incline:0,speed:6.5,calories:220,elevationGain:145});assert.equal(state.sessions[0].exercises[2].sets[0].metrics?.split,125);assert.deepEqual(state.legacyArchive,source);
});
test('older clients cannot erase server metrics; latest clients can explicitly clear them',async()=>{
 const db=database();try {const state=saved('트레드밀');state.sessions[0].exercises[0].sets[0].metrics={incline:4,calories:200};
 assert.equal((await PUT(req('metrics-user',{state,revision:0}))).status,200);
 const old=structuredClone(state);delete old.sessions[0].exercises[0].sets[0].metrics;old.sessions[0].exercises[0].sets[0].duration=1600;
 assert.equal((await PUT(req('metrics-user',{state:old,revision:1}))).status,200);
 const loaded=await(await GET(req('metrics-user'))).json() as any;assert.deepEqual(loaded.state.sessions[0].exercises[0].sets[0].metrics,{incline:4,calories:200});assert.equal(loaded.state.sessions[0].exercises[0].sets[0].duration,1600);
 loaded.state.sessions[0].exercises[0].sets[0].metrics={};assert.equal((await PUT(req('metrics-user',{state:loaded.state,revision:2}))).status,200);
 const cleared=await(await GET(req('metrics-user'))).json() as any;assert.deepEqual(cleared.state.sessions[0].exercises[0].sets[0].metrics,{});
 }finally{db.close();}
});
test('metric preservation follows a draft into finished records and does not leak between sessions',()=>{
 const previous=saved('트레드밀');previous.draft=previous.sessions.pop()!;previous.draft.exercises[0].sets[0].metrics={calories:200};
 const incoming=structuredClone(previous);incoming.sessions=[incoming.draft!];incoming.draft=null;delete incoming.sessions[0].exercises[0].sets[0].metrics;
 const preserved=preserveMissingMetrics(incoming,previous);assert.equal(preserved.sessions[0].exercises[0].sets[0].metrics?.calories,200);
 incoming.sessions[0].id='unrelated';delete incoming.sessions[0].exercises[0].sets[0].metrics;preserveMissingMetrics(incoming,previous);assert.equal(incoming.sessions[0].exercises[0].sets[0].metrics,undefined);
});
test('Shorts searches encode Korean names and punctuation as one external query',()=>{
 const name='인클라인 트레드밀 & 로잉? #1',url=new URL(shortsSearchUrl(name));assert.equal(url.origin,'https://www.youtube.com');assert.equal(url.pathname,'/results');assert.equal(url.searchParams.get('search_query'),name+' 운동 자세 쇼츠 #shorts');assert.equal([...url.searchParams].length,1);assert.equal(url.hash,'');
});
test('round bell audio has three distinct strikes, no clipping, and a quiet tail at common sample rates',()=>{
 for(const rate of [44100,48000]){const samples=boxingBellSamples(rate);assert.equal(samples.length,Math.ceil(2.8*rate));assert.ok(samples.every(n=>Number.isFinite(n)&&Math.abs(n)<1));
 const rms=(start:number,end:number)=>Math.sqrt(samples.slice(Math.floor(start*rate),Math.floor(end*rate)).reduce((sum,n)=>sum+n*n,0)/((end-start)*rate));
 assert.ok(rms(.005,.05)>.05);assert.ok(rms(.285,.33)>rms(.23,.27));assert.ok(rms(.565,.61)>rms(.51,.55));assert.ok(rms(2.7,2.8)<.001);
 }
 assert.throws(()=>boxingBellSamples(NaN));assert.throws(()=>boxingBellSamples(0));
});
