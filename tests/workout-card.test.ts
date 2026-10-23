import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultState,startSession,makeSet,EXERCISES} from '../lib/model';
import {defaultRecording,toStoredWeight} from '../lib/recording-settings';
import {workoutCardData} from '../lib/workout-card';
import {workoutCardPages,wrapCardText} from '../lib/workout-card-image';
import {muscleRegionIds,muscleFill} from '../lib/muscle-map-data';
import {stepReps} from '../lib/set-inputs';
import {BellPlayer} from '../lib/bell-player';
import {boxingBellWav} from '../lib/round-bell';
const ex=(name:string)=>{const x=EXERCISES.find(e=>e.name===name);assert.ok(x);return x;};
function fixture(){const state=defaultState(),s=startSession(state);s.date='2026-10-23T01:00:00Z';s.duration=3600;delete s.startedAt;s.exercises=[{id:'row',exerciseId:ex('바벨 벤치프레스').id,name:'바벨 벤치프레스',equipmentId:'',note:'',rest:90,superset:'',sets:[makeSet({weight:40,reps:12,done:true,rpe:8}),makeSet({weight:30,reps:15,done:true,kind:'drop',rpe:9}),makeSet({weight:20,reps:20,done:true,kind:'warmup'}),makeSet({weight:90,reps:10,done:false})]}];state.sessions=[s];return {state,s};}
test('card totals and highlights use completed work; warmups and unfinished loads stay separate',()=>{
 const {state,s}=fixture(),card=workoutCardData(state,s);
 assert.equal(card.volume,930);assert.equal(card.workSets,2);assert.equal(card.warmups,1);assert.equal(card.durationMinutes,60);assert.equal(card.completion,'2/3 완료 · 67%');assert.equal(card.effort,'평균 RPE 8.5 · 2세트 입력');assert.equal(card.rows[0].lines.length,3);assert.match(card.rows[0].lines[0],/40kg × 12회 · RPE 8/);assert.match(card.rows[0].lines[2],/워밍업/);assert.doesNotMatch(card.rows[0].lines.join(' '),/90kg/);
 s.exercises[0].sets.forEach(x=>x.kind='warmup');assert.deepEqual(workoutCardData(state,s).primary,[]);
});
test('card preserves recorded lb/pair units and machine metrics without inventing calories',()=>{
 const {state,s}=fixture(),row=s.exercises[0],settings={...defaultRecording(true),weightUnit:'lb' as const,weightBasis:'pair' as const};
 row.recording=settings;row.sets=[makeSet({weight:toStoredWeight(80,settings),reps:10,done:true})];assert.match(workoutCardData(state,s).rows[0].lines[0],/80lb \(양쪽 합계\) × 10회/);
 const incline=ex('인클라인 트레드밀 워크');s.exercises.push({...row,id:'cardio',name:incline.name,exerciseId:incline.id,recording:defaultRecording(),sets:[makeSet({duration:1200,distance:2,done:true,metrics:{incline:0,speed:6,elevationGain:150}})]});
 const card=workoutCardData(state,s);assert.equal(card.workSets,1);assert.equal(card.cardioIntervals,1);assert.match(card.rows[1].lines[0],/경사 0%/);assert.match(card.rows[1].lines[0],/150m/);assert.doesNotMatch(card.rows[1].lines[0],/칼로리/);
});
test('assistance and bodyweight never inflate card volume or hide their meaning',()=>{
 const {state,s}=fixture(),row=s.exercises[0];const assisted=EXERCISES.find(e=>e.type==='assisted')!,body=EXERCISES.find(e=>e.type==='bodyweight')!;
 s.exercises=[{...row,exerciseId:assisted.id,name:assisted.name,sets:[makeSet({weight:30,reps:8,done:true})]},{...row,id:'body',exerciseId:body.id,name:body.name,sets:[makeSet({weight:0,reps:12,done:true})]}];const card=workoutCardData(state,s);assert.equal(card.volume,0);assert.match(card.rows[0].lines[0],/보조 30kg/);assert.match(card.rows[1].lines[0],/맨몸 × 12회/);assert.equal(card.effort,'RPE 미입력');
});
test('card comparison only uses previous same gym and equipment, not future/deleted/current records',()=>{
 const {state,s}=fixture();s.exercises[0].sets=[makeSet({weight:40,reps:12,done:true})];
 const old=structuredClone(s);old.id='old';old.date='2026-10-20T01:00:00Z';old.exercises[0].sets[0].reps=10;
 const other=structuredClone(old);other.id='other';other.date='2026-10-22T01:00:00Z';other.gymId='other-gym';other.exercises[0].sets[0].reps=100;
 const future=structuredClone(other);future.id='future';future.date='2026-10-25T01:00:00Z';future.gymId=s.gymId;
 const deleted=structuredClone(future);deleted.id='deleted';deleted.date='2026-10-22T01:00:00Z';deleted.deletedAt=1;
 state.sessions.push(old,other,future,deleted);assert.equal(workoutCardData(state,s).comparison,'같은 중량 최고 반복수 ↑ 1/1종목');
 old.exercises[0].equipmentId='another-machine';assert.match(workoutCardData(state,s).comparison,/기록 없음/);
});
test('long cards paginate every set, escape names, and keep page bounds finite',()=>{
 const {state,s}=fixture(),card=workoutCardData(state,s);card.name='<test & card>';card.rows=Array.from({length:24},(_,i)=>({name:`종목${i+1}`,muscles:'대흉근',equipment:'',lines:Array.from({length:12},(_,j)=>`UNIQUE_${i}_${j} 40kg × 10회`)}));
 const pages=workoutCardPages(card),svg=pages.map(p=>p.svg).join('');assert.ok(pages.length>1);assert.ok(pages.every(p=>p.width===1080&&p.height>=1350&&p.height<3250));assert.match(svg,/&lt;test &amp; card&gt;/);assert.ok(!svg.includes('<test & card>'));for(let i=0;i<24;i++)for(let j=0;j<12;j++)assert.equal(svg.split(`UNIQUE_${i}_${j} `).length-1,1);assert.ok(wrapCardText('가'.repeat(100),200,20).every(s=>s.length<=10));
});
test('card and main body map share distinct lats, shoulder heads, and highlight priority',()=>{
 assert.deepEqual(muscleRegionIds('back','upper-back','back-upper-back-left-1'),['lats']);assert.deepEqual(muscleRegionIds('back','deltoids','any'),['back-deltoids']);assert.deepEqual(muscleRegionIds('front','deltoids','any'),['front-deltoids','side-deltoids']);assert.equal(muscleFill(['chest'],['chest'],['chest']),'#f16b59');
});
test('repetition stepper clamps bounds and changes exactly one repetition',()=>{assert.equal(stepReps(10,1),11);assert.equal(stepReps(10,-1),9);assert.equal(stepReps(0,-1),0);assert.equal(stepReps(1000000,1),1000000);});
test('boxing bell PCM file declares playable mono samples with nonzero audio',()=>{
 const wav=boxingBellWav(8000),view=new DataView(wav);assert.equal(new TextDecoder().decode(wav.slice(0,4)),'RIFF');assert.equal(view.getUint32(4,true),wav.byteLength-8);assert.equal(view.getUint16(22,true),1);assert.equal(view.getUint32(24,true),8000);assert.equal(view.getUint32(40,true),wav.byteLength-44);assert.ok(new Int16Array(wav,44).some(x=>Math.abs(x)>100));
});
function fakeContext(){let started=0;const context:any={state:'running',sampleRate:8000,destination:{},close:async()=>{context.state='closed';},resume:async()=>{context.state='running';},createBuffer:(_c:number,n:number)=>({getChannelData:()=>new Float32Array(n)}),createGain:()=>({gain:{value:0},connect(){},disconnect(){}}),createBufferSource:()=>({connect(){},disconnect(){},start(){started++;},stop(){}})};return {context,started:()=>started};}
function media(play:()=>Promise<void>){return {play,pause(){},currentTime:0,muted:false,volume:1,preload:''} as HTMLAudioElement;}
test('bell falls back from rejected media to Web Audio and replaces interrupted context',async()=>{
 const contexts:ReturnType<typeof fakeContext>[]=[];const player=new BellPlayer(()=>{const c=fakeContext();contexts.push(c);return c.context;},()=>media(async()=>{throw Error('blocked');}));
 assert.equal(await player.play(),true);assert.equal(contexts[0].started(),1);contexts[0].context.state='interrupted';assert.equal(await player.play(),true);assert.equal(contexts.length,2);assert.equal(contexts[0].context.state,'closed');assert.equal(contexts[1].started(),1);player.dispose();
});
test('cancelled delayed audio cannot trigger a fallback bell after dismissal',async()=>{
 let resolve!:()=>void;const c=fakeContext(),player=new BellPlayer(()=>c.context,()=>media(()=>new Promise<void>(r=>{resolve=r;})));
 const playing=player.play();player.stop();resolve();assert.equal(await playing,false);assert.equal(c.started(),0);player.dispose();
});
test('audio failures return a result instead of rejecting the rest completion flow',async()=>{
 const c=fakeContext();c.context.state='suspended';c.context.resume=()=>{throw Error('interrupted');};const player=new BellPlayer(()=>c.context,()=>media(async()=>{throw Error('blocked');}));assert.equal(await player.play(),false);player.dispose();
});

import {uid} from '../lib/id';
test('local preview IDs use secure random bytes with valid v4 shape',()=>{
 const source={getRandomValues:crypto.getRandomValues.bind(crypto)};const a=uid(source),b=uid(source);assert.match(a,/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);assert.notEqual(a,b);
});
