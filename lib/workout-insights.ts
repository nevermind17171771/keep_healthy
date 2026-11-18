import { exercise, historicalRecording, oneRM, type Session, type SessionExercise, type SetEntry } from './model';
import { displayedWeight, weightText, type RecordingSettings } from './recording-settings';
import { cardioSummary } from './cardio';
import { timeLabel } from './model';

export function matchingAttempts(sessions: Session[], context: Session, item: SessionExercise, earlierOnly = false) {
  const basis = historicalRecording(item).weightBasis;
  return sessions.filter(s => !s.deletedAt && s.id !== context.id && s.gymId === context.gymId &&
    (!earlierOnly || Date.parse(s.date) < Date.parse(context.date)))
    .toSorted((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .flatMap(s => {
      const sets = s.exercises.filter(e => e.exerciseId === item.exerciseId && e.equipmentId === item.equipmentId &&
        historicalRecording(e).weightBasis === basis).flatMap(e => e.sets.filter(x => x.done && x.kind === 'work'));
      return sets.length ? [{ date: s.date, id: s.id, sets }] : [];
    });
}
export function formatSet(item: SessionExercise, set: SetEntry, r: RecordingSettings) {
  const type = exercise(item.exerciseId)?.type;
  if (type === 'cardio') return cardioSummary(item.name, set, r) || '기록 없음';
  if (type === 'time') return timeLabel(set.duration);
  const reps = `${set.reps}회`;
  if (type === 'bodyweight' && !set.weight) return reps;
  return `${type === 'assisted' ? '보조 ' : type === 'bodyweight' ? '추가 ' : ''}${weightText(set.weight, r)} × ${reps}`;
}
export function groupedSets(item: SessionExercise, sets: SetEntry[], r = historicalRecording(item)) {
  const groups: {label: string; kind: SetEntry['kind']; count: number; first: number}[] = [];
  sets.filter(s => s.done).forEach((set, i) => {
    const label = formatSet(item, set, r), last = groups.at(-1);
    if (last?.label === label && last.kind === set.kind) last.count++;
    else groups.push({label, kind: set.kind, count: 1, first: i});
  });
  return groups;
}
export function personalBests(sessions: Session[], session: Session, item: SessionExercise) {
  if (exercise(item.exerciseId)?.type !== 'weight') return [];
  const current = item.sets.filter(s => s.done && s.kind === 'work' && s.weight > 0 && s.reps > 0);
  const previous = matchingAttempts(sessions, session, item, true).flatMap(x => x.sets).filter(s => s.weight > 0 && s.reps > 0);
  if (!previous.length || !current.length) return [];
  const records: string[] = [];
  const highWeight = Math.max(...current.map(s => s.weight));
  const r = historicalRecording(item);
  if (highWeight > Math.max(...previous.map(s => s.weight))) records.push(`최고 중량 ${weightText(highWeight, r)}`);
  const repBest = current.filter(s => previous.some(p => p.weight === s.weight) &&
    previous.every(p => p.weight !== s.weight || p.reps < s.reps)).sort((a, b) => b.weight - a.weight || b.reps - a.reps)[0];
  if (repBest) records.push(`반복 신기록 ${weightText(repBest.weight, r)} × ${repBest.reps}회`);
  const maxSet = Math.max(...current.map(s => s.weight * s.reps));
  if (maxSet > Math.max(...previous.map(s => s.weight * s.reps))) {
    records.push(`세트 볼륨 신기록 ${Math.round(displayedWeight(maxSet, r) * 100) / 100} ${r.weightUnit}·회`);
  }
  return records;
}
export const metricLabels = {estimate:'추정 1RM', weight:'최대 중량', reps:'본세트 최다 반복', volume:'본세트 볼륨'} as const;
export type TrendMetric = keyof typeof metricLabels;
export function workoutMetric(sets: SetEntry[], metric: TrendMetric, r: RecordingSettings) {
  const valid = sets.filter(s => s.done && s.kind === 'work' && s.reps > 0 && s.weight > 0);
  if (metric === 'reps') return Math.max(0, ...valid.map(s => s.reps));
  if (metric === 'volume') return displayedWeight(valid.reduce((n, s) => n + s.reps * s.weight, 0), r);
  return displayedWeight(Math.max(0, ...valid.map(s => metric === 'weight' ? s.weight : oneRM(s.weight, s.reps))), r);
}
