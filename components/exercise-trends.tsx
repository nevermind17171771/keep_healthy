'use client';
import { useState, useMemo, lazy, Suspense } from 'react';
import { NativeSelect } from '@/components/ui/native-select';
import { day, exercise, historicalRecording, type AppState, type Session } from '@/lib/model';
import { weightLabel } from '@/lib/recording-settings';
import { metricLabels, workoutMetric, type TrendMetric } from '@/lib/workout-insights';
const Chart = lazy(() => import('@/components/progress-chart'));

export default function ExerciseTrends({state, sessions}: {state: AppState; sessions: Session[]}) {
  const [exerciseId, setExerciseId] = useState('');
  const [selection, setSelection] = useState('');
  const [range, setRange] = useState('90');
  const [metric, setMetric] = useState<TrendMetric>('weight');
  const ids = useMemo(() => new Map(sessions.flatMap(s => s.exercises.filter(e => exercise(e.exerciseId)?.type === 'weight').map(e => [e.exerciseId, e.name] as const))), [sessions]);
  const groups = useMemo(() => {
    const out = new Map<string, {name: string; recording: ReturnType<typeof historicalRecording>; points: Map<string, {date: string; sets: Session['exercises'][number]['sets']}>}>();
    for (const s of sessions) for (const row of s.exercises) {
      if (row.exerciseId !== exerciseId) continue;
      const sets = row.sets.filter(x => x.done && x.kind === 'work' && x.weight > 0 && x.reps > 0);
      if (!sets.length) continue;
      const gym = state.gyms.find(g => g.id === s.gymId), r = historicalRecording(row);
      const key = JSON.stringify([s.gymId, row.equipmentId, r.weightBasis]);
      let g = out.get(key);
      if (!g) {
        g = {name: `${gym?.name || '이전 운동 장소'} · ${row.equipmentId ? gym?.equipment.find(e => e.id === row.equipmentId)?.name || '이전 기구' : '기본 기록'} · ${weightLabel(r)}`, recording: r, points: new Map()};
        out.set(key, g);
      }
      const previous = g.points.get(s.id);
      if (previous) previous.sets.push(...sets);
      else g.points.set(s.id, {date: s.date, sets});
    }
    return out;
  }, [sessions, exerciseId, state.gyms]);
  const key = groups.has(selection) ? selection : (groups.keys().next().value || '');
  const group = groups.get(key);
  const displayUnit = group ? (metric === 'reps' ? '회' : metric === 'volume' ? weightLabel(group.recording) + '·회' : weightLabel(group.recording)) : '';
  const since = range === 'all' ? -Infinity : Date.now() - Number(range) * 86400000;
  const data = Array.from(group?.points.values() || []).filter(x => Date.parse(x.date) >= since)
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
    .map(x => ({label: day(x.date).slice(5), value: workoutMetric(x.sets, metric, group!.recording)})).filter(x => x.value > 0);
  return <section className="panel trend-options">
    <div className="section-title"><h3>종목별 기록 추이</h3><span>{displayUnit}</span></div>
    <NativeSelect aria-label="분석할 운동" value={exerciseId} onChange={e => {setExerciseId(e.target.value);setSelection('');}}>
      <option value="">종목 선택</option>{Array.from(ids, ([id, name]) => <option key={id} value={id}>{name}</option>)}
    </NativeSelect>
    {exerciseId && group && <><NativeSelect aria-label="비교 기구와 중량 기준" value={key} onChange={e => setSelection(e.target.value)}>
      {Array.from(groups, ([id, g]) => <option key={id} value={id}>{g.name}</option>)}
    </NativeSelect><div className="form-grid"><NativeSelect aria-label="비교 지표" value={metric} onChange={e => setMetric(e.target.value as TrendMetric)}>
      {Object.entries(metricLabels).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
    </NativeSelect><NativeSelect aria-label="비교 기간" value={range} onChange={e => setRange(e.target.value)}><option value="30">최근 30일</option><option value="90">최근 90일</option><option value="365">최근 1년</option><option value="all">전체</option></NativeSelect></div></>}
    {data.length > 0 ? <><div className="trend-current"><strong>{data.at(-1)?.value.toLocaleString('ko-KR')}</strong> {displayUnit} · 마지막 기록</div>
      <Suspense fallback={<div className="chart-loading">차트를 준비하고 있어요.</div>}><Chart line data={data}/></Suspense></> :
      <p className="subtext">{exerciseId ? '선택한 기준의 완료 본세트가 아직 없어요.' : '기록한 중량 운동을 선택해 주세요.'}</p>}
    {metric === 'estimate' && <p className="micro">1~12회 본세트의 Epley 추정치이며 실제 최대 중량은 아니에요.</p>}
  </section>;
}
