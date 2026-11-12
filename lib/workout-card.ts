import { day, exercise, historicalRecording, MUSCLES, type AppState, type Session, type SetEntry } from './model';
import { displayedWeight, type RecordingSettings } from './recording-settings';
import { cardioFields, cardioValue } from './cardio';
export type CardExercise = { name: string; summary: string; sets: number };
export type WorkoutCard = {
  date: string; name: string; durationMinutes: number; workSets: number; warmups: number; cardioIntervals: number;
  volume: number; primary: string[]; secondary: string[]; muscleLabels: string[]; rows: CardExercise[];
};
const number = (value: number) => new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 }).format(value);
function range(values: number[]) {
  const low = Math.min(...values), high = Math.max(...values);
  return low === high ? number(low) : `${number(low)}–${number(high)}`;
}
function minutes(seconds: number) {
  const m = Math.floor(seconds / 60), s = Math.round(seconds % 60);
  return s ? `${m ? `${m}분 ` : ''}${s}초` : `${m}분`;
}
function compactSummary(name: string, type: string | undefined, sets: SetEntry[], recording: RecordingSettings) {
  if (type === 'cardio') {
    const parts = [minutes(sets.reduce((sum, s) => sum + s.duration, 0))];
    const distance = sets.reduce((sum, s) => sum + s.distance, 0);
    const steps = sets.reduce((sum, s) => sum + (s.metrics?.steps || 0), 0);
    const floors = sets.reduce((sum, s) => sum + (s.metrics?.floors || 0), 0);
    if (distance) parts.push(`${number(distance)}km`);
    else if (steps) parts.push(`${number(steps)}계단`);
    if (floors) parts.push(`${number(floors)}층`);
    else {
      const incline = cardioFields(name, recording).find(f => f.key === 'incline' || f.key === 'inclineLevel');
      const grades = incline ? sets.map(s => cardioValue(s, incline)).filter((v): v is number => v !== undefined) : [];
      if (incline && grades.length) parts.push(`경사 ${range(grades)}${incline.unit}`);
      else {
        const calories = sets.filter(s => s.metrics?.calories !== undefined);
        if (calories.length === sets.length) parts.push(`${number(calories.reduce((sum, s) => sum + s.metrics!.calories!, 0))}kcal`);
      }
    }
    return parts.slice(0, 3).join(' · ');
  }
  if (type === 'time') return `${range(sets.map(s => s.duration))}초 × ${sets.length}세트`;
  const weights = sets.map(s => displayedWeight(s.weight, recording)), reps = range(sets.map(s => s.reps));
  const basis = recording.weightBasis === 'single' ? '한쪽 ' : recording.weightBasis === 'pair' ? '양쪽 ' : '';
  const load = type === 'bodyweight' && weights.every(w => w === 0) ? '맨몸' : `${type === 'assisted' ? '보조 ' : type === 'bodyweight' ? '추가 ' : ''}${basis}${range(weights)}${recording.weightUnit}`;
  const uniform = weights.every(w => w === weights[0]) && sets.every(s => s.reps === sets[0].reps);
  return uniform ? `${load} × ${reps}회 × ${sets.length}세트` : `${load} · ${reps}회 · ${sets.length}세트`;
}
/** Compact completed-work summary. Detailed set order and RPE stay in workout history. */
export function workoutCardData(_state: AppState, session: Session): WorkoutCard {
  const rows: CardExercise[] = [], primary = new Set<string>(), secondary = new Set<string>();
  let workSets = 0, warmups = 0, cardioIntervals = 0, volume = 0;
  for (const row of session.exercises) {
    const ex = exercise(row.exerciseId), done = row.sets.filter(s => s.done);
    const sets = done.filter(s => s.kind !== 'warmup');
    warmups += done.length - sets.length;
    if (!sets.length) continue;
    for (const id of ex?.primary || []) primary.add(id);
    for (const id of ex?.secondary || []) secondary.add(id);
    if (ex?.type === 'cardio') cardioIntervals += sets.length; else workSets += sets.length;
    if (ex?.type === 'weight') volume += sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
    rows.push({ name: row.name, summary: compactSummary(row.name, ex?.type, sets, historicalRecording(row)), sets: sets.length });
  }
  const pri = [...primary], sec = [...secondary].filter(id => !primary.has(id));
  return { date: day(session.date), name: session.name, durationMinutes: Math.round(session.duration / 60), workSets, warmups, cardioIntervals, volume,
    primary: pri, secondary: sec, muscleLabels: pri.map(id => MUSCLES[id]).filter(Boolean), rows };
}
