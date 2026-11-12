import { exercise, historicalRecording, liveSessions, recordingFor, type AppState, type Session, type SessionExercise, type Routine } from './model';

/** Structural changes are explicit; performed weights never silently become routine defaults. */
export function routineUpdate(state: AppState, session: Session) {
  const routine=state.routines.find(r=>r.id===session.routineId&&!r.deletedAt);
  if(!routine) return null;
  const exercises: Routine['exercises']=session.exercises.filter(e=>e.sets.some(s=>s.kind==='work')).map(e=>{
    const old=routine.exercises.find(x=>x.exerciseId===e.exerciseId);
    const reps=e.repMin||old?.reps||8;
    return {exerciseId:e.exerciseId,sets:Math.min(30,e.sets.filter(s=>s.kind==='work').length),reps,repMax:Math.max(reps,e.repMax||old?.repMax||12),weight:old?.weight||0,rest:e.rest,effortCap:e.effortCap||old?.effortCap};
  });
  if(!exercises.length) return null;
  const signature=(rows:Routine['exercises'])=>JSON.stringify(rows.map(e=>[e.exerciseId,e.sets,e.reps,e.repMax,e.rest,e.effortCap||8]));
  return {routine,exercises,changed:signature(exercises)!==signature(routine.exercises),conflict:session.routineUpdatedAt!==routine.updatedAt};
}
export function applyRoutineUpdate(state:AppState,session:Session,now=Date.now()) {
  const update=routineUpdate(state,session);
  if(!update||!update.changed||update.conflict)return false;
  update.routine.exercises=update.exercises;update.routine.updatedAt=now;return true;
}

export function growthSuggestion(state:AppState,session:Session,item:SessionExercise) {
  const hold=(reason:string)=>({reason,targets:[] as {weight:number;reps:number;duration:number;distance:number}[]});
  if(!['weight','bodyweight'].includes(exercise(item.exerciseId)?.type||''))return hold('이 종목은 지난 기록을 기준으로 직접 조절해 주세요.');
  if(session.condition==='피곤함')return hold('오늘은 피곤한 날로 기록했어요. 증량 없이 편안한 목표로 진행하세요.');
  const count=item.sets.filter(s=>s.kind==='work').length;
  const config=recordingFor(state,item,session.gymId);
  const rows=liveSessions(state).filter(s=>s.id!==session.id&&s.gymId===session.gymId).map(s=>({session:s,row:s.exercises.find(e=>e.exerciseId===item.exerciseId&&e.equipmentId===item.equipmentId)})).filter(x=>x.row).slice(0,2);
  if(rows.length<2||!count)return hold('같은 기구의 최근 기록 2회가 쌓이면 다음 목표를 제안해요.');
  const low=item.repMin||8,high=Math.max(low,item.repMax||12);
  const sets=rows.map(({row})=>row!.sets.filter(s=>s.kind==='work'));
  if(rows.some(({row,session:s})=>{const r=historicalRecording(row!);return s.condition==='피곤함'||r.weightBasis!==config.weightBasis||r.weightUnit!==config.weightUnit;})||sets.some(ss=>ss.length!==count||ss.some(s=>!s.done||s.reps<low||(exercise(item.exerciseId)?.type==='weight'&&s.weight<=0)||s.rpe>(item.effortCap||8))))return hold('완료 세트 수·입력 조건·컨디션을 확인해 주세요. 이번에는 지난 기록을 유지해요.');
  const latest=sets[0],older=sets[1];
  if(latest.some((s,i)=>s.weight!==older[i].weight||s.reps<older[i].reps))return hold('중량이 바뀌었거나 횟수가 줄었어요. 같은 조건으로 한 번 더 기록해 주세요.');
  const top=sets.every(ss=>ss.every(s=>s.reps>=high));
  if(top&&latest.every(s=>s.weight>0&&s.weight===latest[0].weight)&&config.weightStep<=latest[0].weight*.1){
    return {reason:'최근 2회 모두 목표 상한을 완료했어요. 설정한 중량 한 단계 증가를 제안해요.',targets:latest.map(s=>({weight:Math.round((s.weight+config.weightStep)*1e6)/1e6,reps:low,duration:0,distance:0}))};
  }
  if(top)return hold('목표 상한을 달성했어요. 기구의 증량 단위를 확인하고 중량은 직접 조절해 주세요.');
  return {reason:'최근 2회 기록이 유지됐어요. 같은 중량에서 본세트당 최대 1회 증가를 제안해요.',targets:latest.map(s=>({weight:s.weight,reps:Math.max(s.reps,Math.min(high,s.reps+1)),duration:0,distance:0}))};
}
