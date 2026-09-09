import test from 'node:test';
import assert from 'node:assert/strict';
import {renderToString} from 'react-dom/server';
import WorkoutApp from '../app/workout-app';
for(const [page,title] of Object.entries({home:'오늘의 운동',session:'WORKOUT IN PROGRESS',history:'쌓여가는 기록',routines:'나의 루틴',library:'운동 사전',analysis:'기록으로 보는 성장',settings:'나에게 맞게'}))test(`screen ${page} renders with recorded workouts and an active draft`,()=>{const html=renderToString(<WorkoutApp initialPage={page}/>);assert.ok(html.includes(title));assert.ok(!html.includes('NaN'));assert.ok(html.includes('설정 열기'));if(page==='session'){assert.ok(html.includes('20:30'));assert.ok(html.includes('RPE'));}if(page==='home')assert.ok(html.includes('근육 지도'));});
