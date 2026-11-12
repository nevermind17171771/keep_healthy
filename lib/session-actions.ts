import { liveSessions, makeSet, recordingFor, previousSetInputs, type AppState, type SessionExercise } from './model';

/** Never compare a machine with a different machine, gym, or the workout being edited. */
export function previousWorkSets(state: AppState, item: SessionExercise) {
  const gymId = state.draft?.gymId || state.profile.gymId;
  for (const session of liveSessions(state)) {
    if (session.id === state.draft?.id || session.gymId !== gymId) continue;
    const row = session.exercises.find(e => e.exerciseId === item.exerciseId && e.equipmentId === item.equipmentId);
    const sets = row?.sets.filter(s => s.done && s.kind === 'work') || [];
    if (sets.length) return {
      sets,
      date: session.date
    };
  }
  return {
    sets: [],
    date: ''
  };
}
export function loadPreviousTargets(state: AppState, item: SessionExercise) {
  const previous = previousWorkSets(state, item).sets;
  if (!previous.length) return false;
  let workIndex = 0;
  for (const set of item.sets) {
    if (set.kind !== 'work') continue;
    const before = previous[workIndex++];
    if (!before || set.done) continue;
    set.target = {
      weight: before.weight,
      reps: before.reps,
      duration: before.duration,
      distance: before.distance
    };
  }
  // Add missing target rows without changing completed, warmup, or drop sets.
  for (let i = workIndex; i < previous.length; i++) {
    const before = previous[i];
    item.sets.push(makeSet({
      weight: 0,
      reps: 0,
      target: {
        weight: before.weight,
        reps: before.reps,
        duration: before.duration,
        distance: before.distance
      }
    }));
  }
  return true;
}
export function chooseEquipment(state: AppState, item: SessionExercise, equipmentId: string) {
  if (item.sets.some(s => s.done)) return false;
  item.equipmentId = equipmentId;
  delete item.recording;
  item.recording = recordingFor(state, item);
  const seeded = previousSetInputs(state,item.exerciseId,equipmentId,item.sets.filter(s=>s.kind==='work').length);
  let workIndex=0;
  item.sets = item.sets.map(old => makeSet({
    reps: old.reps,
    metrics: {
      ...item.recording!.defaults
    },
    ...(old.kind==='work'?seeded[workIndex++]:{}),
    id:old.id, kind:old.kind
  }));
  return true;
}

/** Reorder pending exercise slots only; completed exercises and records stay intact. */
export function deferExercise(session: import('./model').Session, id: string): string | null {
  const indices=session.exercises.map((e,i)=>e.sets.some(s=>!s.done)?i:-1).filter(i=>i>=0);
  const at=indices.findIndex(i=>session.exercises[i].id===id);
  if(at<0||indices.length<2)return null;
  const pending=indices.map(i=>session.exercises[i]);
  const [moved]=pending.splice(at,1);pending.push(moved);
  indices.forEach((index,i)=>{session.exercises[index]=pending[i];});
  return pending[Math.min(at,pending.length-2)].id;
}
