import { day, exercise, historicalRecording, liveSessions, MUSCLES, type AppState, type Session, type SetEntry } from './model';
import { weightText } from './recording-settings';
import { cardioSummary } from './cardio';
export type CardExercise = { name: string; muscles: string; equipment: string; lines: string[] };
export type WorkoutCard = {
  date: string; name: string; durationMinutes: number; workSets: number; warmups: number; cardioIntervals: number;
  volume: number; completion: string; effort: string; comparison: string; primary: string[]; secondary: string[];
  muscleLabels: string[]; rows: CardExercise[];
};
const work = (set: SetEntry) => set.done && set.kind !== 'warmup';
const n = (value: number) => new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 }).format(value);
export function workoutCardData(state: AppState, session: Session): WorkoutCard {
  const rows: CardExercise[] = [], primary = new Set<string>(), secondary = new Set<string>();
  let workSets = 0, warmups = 0, cardioIntervals = 0, volume = 0, planned = 0, complete = 0;
  const compared = new Set<string>(), improved = new Set<string>(), efforts: number[] = [];
  const previous = liveSessions(state).filter(s => s.id !== session.id && s.gymId === session.gymId && Date.parse(s.date) < Date.parse(session.date));
  for (const row of session.exercises) {
    const ex = exercise(row.exerciseId), recording = historicalRecording(row), done = row.sets.filter(s => s.done);
    const cardio = ex?.type === 'cardio', sets = done.filter(work);
    planned += row.sets.filter(s => s.kind !== 'warmup').length; complete += sets.length;
    if (!done.length) continue;
    if (sets.length) { for (const id of ex?.primary || []) primary.add(id); for (const id of ex?.secondary || []) secondary.add(id); }
    warmups += done.filter(s => s.kind === 'warmup').length;
    if (cardio) cardioIntervals += sets.length; else workSets += sets.length;
    if (ex?.type === 'weight') volume += sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
    for (const s of sets) if (s.rpe > 0) efforts.push(s.rpe);
    const old = previous.flatMap(s => s.exercises.filter(e => e.exerciseId === row.exerciseId && e.equipmentId === row.equipmentId && e.sets.some(work))).at(0);
    if (old && ['weight', 'bodyweight', 'assisted'].includes(ex?.type || '')) {
      const oldSets = old.sets.filter(work), matched = sets.filter(s => oldSets.some(p => Math.abs(p.weight - s.weight) < 1e-6));
      const key = `${row.exerciseId}/${row.equipmentId}`;
      if (matched.length) { compared.add(key); if (matched.some(s => s.reps > Math.max(...oldSets.filter(p => Math.abs(p.weight - s.weight) < 1e-6).map(p => p.reps)))) improved.add(key); }
    }
    const equipment = state.gyms.find(g => g.id === session.gymId)?.equipment.find(e => e.id === row.equipmentId)?.name || '';
    const lines = done.map(set => {
      const index = row.sets.indexOf(set) + 1, kind = set.kind === 'warmup' ? '워밍업' : set.kind === 'drop' ? '드롭' : cardio ? '구간' : '세트';
      let actual: string;
      if (cardio) actual = cardioSummary(row.name, set, recording);
      else if (ex?.type === 'time') actual = `${Math.floor(set.duration / 60)}분 ${Math.round(set.duration % 60)}초`;
      else if (ex?.type === 'bodyweight') actual = `${set.weight ? `추가 ${weightText(set.weight, recording)}` : '맨몸'} × ${set.reps}회`;
      else actual = `${ex?.type === 'assisted' ? '보조 ' : ''}${weightText(set.weight, recording)} × ${set.reps}회`;
      return `${index}${kind}  ${actual}${set.rpe ? ` · RPE ${n(set.rpe)}` : ''}`;
    });
    rows.push({ name: row.name, muscles: ex?.primaryLabels.join(' · ') || '부위 미지정', equipment, lines });
  }
  const pri = [...primary], sec = [...secondary].filter(id => !primary.has(id));
  return {
    date: day(session.date), name: session.name, durationMinutes: Math.round(session.duration / 60), workSets, warmups, cardioIntervals, volume,
    completion: `${complete}/${planned} 완료 · ${planned ? Math.round(complete / planned * 100) : 0}%`,
    effort: efforts.length ? `평균 RPE ${n(efforts.reduce((a, b) => a + b, 0) / efforts.length)} · ${efforts.length}세트 입력` : 'RPE 미입력',
    comparison: compared.size ? `같은 중량 최고 반복수 ↑ ${improved.size}/${compared.size}종목` : '비교할 이전 동일 중량 기록 없음',
    primary: pri, secondary: sec, muscleLabels: pri.map(id => MUSCLES[id]).filter(Boolean), rows
  };
}
