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
 const settings=renderToString(<WorkoutApp initialPage="settings"/>);assert.match(settings,/복싱 라운드 벨/);assert.match(settings,/벨 테스트/);
});

import FocusWorkout from '../components/focus-workout';
import RecordingEditor from '../components/recording-editor';
import StrengthSets from '../components/strength-sets';
import {state as fixture} from './ui-store-fixture';
import {defaultRecording,degreesToPercent} from '../lib/recording-settings';
test('focus view renders one exercise with a current set, previous reference and live rest controls',()=>{
 const state=structuredClone(fixture),session=state.draft!;const html=renderToString(<FocusWorkout state={state} session={session} restRemaining={75} onSkipRest={()=>{}} onExtendRest={()=>{}} onChange={()=>{}} onComplete={()=>{}} onSettings={()=>{}} onEquipment={()=>{}} onTargets={()=>{}} onAddSet={()=>{}} onRest={()=>{}} onNotes={()=>{}}/>);
 assert.match(html,/집중할 운동/);assert.match(html,/지난 기록/);assert.match(html,/오늘 목표/);assert.match(html,/01:15/);assert.match(html,/휴식 끝내기/);assert.equal((html.match(/class="focus-title"/g)||[]).length,1);assert.match(html,/1세트 완료/);
});
test('recording editor exposes unit selection, ordering, optional fields and defaults',()=>{
 const html=renderToString(<RecordingEditor name="인클라인 트레드밀 워크" cardio dumbbell={false} value={defaultRecording()} onSave={()=>{}}/>);assert.match(html,/경사율 \(%\)/);assert.match(html,/각도 \(°\)/);assert.match(html,/기구 레벨/);assert.match(html,/기본 속도/);assert.match(html,/칼로리 먼저 표시/);assert.match(html,/속도 위로/);
 const dumbbell=renderToString(<RecordingEditor name="덤벨 벤치프레스" cardio={false} dumbbell value={defaultRecording(true)} onSave={()=>{}}/>);assert.match(dumbbell,/양쪽 합계/);assert.match(dumbbell,/>lb</);
});
test('weight pairs and degree cardio render in selected units with unchanged canonical records',()=>{
 const row=makeSet({weight:20,reps:10}),settings={...defaultRecording(true),weightBasis:'pair' as const};const html=renderToString(<StrengthSets name="덤벨 벤치프레스" type="weight" sets={[row]} previous={[row]} recording={settings} index={0} onChange={()=>{}} onComplete={()=>{}}/>);assert.match(html,/양쪽 합계 kg/);assert.match(html,/value="40"/);assert.match(html,/40kg \(양쪽 합계\)/);assert.equal(row.weight,20);
 const cardio=renderToString(<CardioSets name="인클라인 트레드밀 워크" recording={{...defaultRecording(),inclineUnit:'degree'}} sets={[makeSet({metrics:{incline:degreesToPercent(15)}})]} onChange={()=>{}} onComplete={()=>{}}/>);assert.match(cardio,/value="15"/);assert.match(cardio,/>°</);
});

import ProgramLibrary from '../components/program-library';
test('program library renders reviewable order, volume, alternatives and opt-in schedule replacement',()=>{
 const html=renderToString(<ProgramLibrary onImport={()=>true}/>);assert.match(html,/프로그램 선택/);assert.match(html,/직접 세트/);assert.match(html,/보조 참여/);assert.match(html,/주간 계획도 교체/);assert.match(html,/대체 운동/);assert.match(html,/기존 기본 루틴 개정본 15개/);assert.doesNotMatch(html,/CBum/);
});
