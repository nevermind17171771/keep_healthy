import test from 'node:test';
import assert from 'node:assert/strict';
import {renderToString} from 'react-dom/server';
import WorkoutApp from '../app/workout-app';
for(const [page,title] of Object.entries({home:'오늘의 운동',session:'WORKOUT IN PROGRESS',history:'쌓여가는 기록',routines:'나의 루틴',library:'운동 사전',analysis:'기록으로 보는 성장',settings:'나에게 맞게'}))test(`screen ${page} renders with recorded workouts and an active draft`,()=>{const html=renderToString(<WorkoutApp initialPage={page}/>);assert.ok(html.includes(title));assert.ok(!html.includes('NaN'));assert.ok(html.includes('설정 열기'));if(page==='session'){assert.ok(html.includes('20:30'));assert.ok(html.includes('RPE'));}if(page==='home')assert.ok(html.includes('근육 지도'));});

import CardioSets from '../components/cardio-sets';
import {makeSet} from '../lib/model';
test('incline treadmill and stair climber render distinct accessible inputs and optional blanks',()=>{
 const props={sets:[makeSet({duration:1230,distance:2.5,metrics:{incline:0,calories:180,elevationGain:210,steps:660,floors:42.5}})],onChange:()=>{},onComplete:()=>{}};
 const incline=renderToString(<CardioSets name="인클라인 트레드밀 워크" {...props}/>);
 assert.match(incline,/aria-label="인클라인 트레드밀 워크 1구간 수직 이동거리"/);assert.match(incline,/value="210"/);assert.match(incline,/value="20:30"/);assert.match(incline,/value="0"/);
 const stairs=renderToString(<CardioSets name="천국의 계단" {...props}/>);assert.match(stairs,/aria-label="천국의 계단 1구간 스텝 수"/);assert.match(stairs,/value="42.5"/);assert.doesNotMatch(stairs,/이동거리|경사<|속도</);
 const rowing=renderToString(<CardioSets name="로잉머신" {...props}/>);assert.match(rowing,/value="2500"/);assert.match(rowing,/500m 페이스/);
});
test('active exercises have outbound video search links and settings have a bell preview',()=>{
 const html=renderToString(<WorkoutApp initialPage="session"/>);assert.match(html,/트레드밀 유튜브 쇼츠 검색 \(새 탭\)/);assert.match(html,/target="_blank" rel="noopener noreferrer"/);assert.ok(!html.includes('<iframe'));assert.ok(html.includes('구간 추가'));assert.ok(!html.includes('트레드밀 1세트 중량'));
 const settings=renderToString(<WorkoutApp initialPage="settings"/>);assert.match(settings,/복싱 라운드 벨/);assert.match(settings,/미리 듣기/);
});
