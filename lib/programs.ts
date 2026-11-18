import { exercise, EXERCISES, MUSCLES, type Routine, type AppState } from './model';
import { PROGRAMS, type TrainingProgram } from './program-data';
export { PROGRAMS };
export type PlanMode = 'standard' | 'short' | 'easy';
export function programRoutines(p: TrainingProgram, mode: PlanMode = 'standard'): Routine[] {
  return p.days.map((d, i) => ({
    id: `plan43-${p.id}-${mode}-${i}`,
    name: `${p.name} / ${d.name}${mode === 'short' ? ' · 단축' : mode === 'easy' ? ' · 가볍게' : ''}`,
    updatedAt: Date.now(),
    exercises: (mode === 'short' ? d.exercises.filter(e => e.core).slice(0, 3) : d.exercises).map(e => {
      const ex = EXERCISES.find(x => x.name === e.name);
      if (!ex) throw new Error(`Unknown exercise: ${e.name}`);
      return {
        exerciseId: ex.id,
        sets: mode === 'standard' ? e.sets : 2,
        reps: e.low,
        repMax: e.high,
        weight: 0,
        rest: e.rest,
        effortCap: mode === 'easy' ? 7 : p.effort
      };
    })
  }));
}
export function planVolume(routines: Routine[], week: number[]) {
  const totals = new Map<string, {
    direct: number;
    support: number;
  }>();
  for (const index of week) {
    const r = routines[index];
    if (!r) continue;
    for (const row of r.exercises) {
      const ex = exercise(row.exerciseId);
      if (!ex) continue;
      for (const [key, list] of [['direct', ex.primary], ['support', ex.secondary]] as const) for (const muscle of new Set(list)) {
        const t = totals.get(muscle) || {
          direct: 0,
          support: 0
        };
        t[key] += row.sets;
        totals.set(muscle, t);
      }
    }
  }
  return [...totals].map(([muscle, t]) => ({
    muscle,
    label: MUSCLES[muscle] || muscle,
    ...t
  }));
}
export function routineWarnings(r: Routine) {
  const warnings: string[] = [];
  const previous: NonNullable<ReturnType<typeof exercise>>[] = [];
  for (const row of r.exercises) {
    const ex = exercise(row.exerciseId);
    if (!ex) continue;
    if (/프레스|벤치|딥스|로우|풀다운|풀업/.test(ex.name)) {
      const fatigued = previous.find(p => /컬|푸시다운|트라이셉스|플라이|레터럴|프론트 레이즈/.test(p.name) && p.primary.some(m => ex.primary.includes(m) || ex.secondary.includes(m)));
      if (fatigued) warnings.push(`${ex.name} 전에 ${fatigued.name}로 관련 근육이 피로할 수 있어요. 주력 운동이라면 앞으로 옮겨보세요.`);
    }
    if (/바벨 로우|펜들레이/.test(ex.name) && previous.some(p => /데드리프트|굿모닝/.test(p.name))) warnings.push('힌지 운동 뒤 바벨 로우는 허리·그립 피로가 겹쳐요. 가슴 지지 로우를 고려하세요.');
    if (/프레스|스쿼트|로우|풀다운|데드리프트/.test(ex.name) && row.rest < 90) warnings.push(`${ex.name}: 휴식 ${row.rest}초에 반복수가 크게 줄면 휴식을 늘려보세요.`);
    if (row.repMax < row.reps) warnings.push(`${ex.name}: 최대 목표 횟수가 최소 목표보다 낮아요.`);
    previous.push(ex);
  }
  if (r.exercises.reduce((n, e) => n + e.sets, 0) > 22) warnings.push('총 세트 수가 많아요. 후반 수행과 다음 운동의 회복 상태에 따라 보조 세트를 줄여보세요.');
  return [...new Set(warnings)];
}
export function importProgram(state: AppState, routines: Routine[], week: number[], schedule: boolean) {
  const existing = new Set(state.routines.map(r => r.id));
  const additions = routines.filter(r => !existing.has(r.id));
  if (additions.length !== routines.length) return false;
  state.routines.push(...structuredClone(additions));
  if (schedule) {
    const keys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    for (let i = 0; i < 7; i++) state.profile.weekPlan[keys[i]] = routines[week[i]]?.id || '';
    state.profile.updatedAt = Date.now();
  }
  return true;
}
