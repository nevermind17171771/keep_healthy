import { Download } from 'lucide-react';
import MuscleMap from '@/components/muscle-map';
import { exercise, timeLabel, volume, type AppState, type Session } from '@/lib/model';
import { workoutCardData } from '@/lib/workout-card';

const number = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 });

export default function WorkoutRecap({state, session, onShare}: {state: AppState; session: Session; onShare: () => void}) {
  const recap = workoutCardData(state, session);
  const cardio = session.exercises
    .filter(item => exercise(item.exerciseId)?.type === 'cardio')
    .flatMap(item => item.sets.filter(set => set.done && set.kind !== 'warmup'));
  const caloriesLogged = cardio.filter(set => typeof set.metrics?.calories === 'number');
  const calories = caloriesLogged.reduce((sum, set) => sum + (set.metrics?.calories ?? 0), 0);
  const totalWeight = volume(session);
  const stats = [
    {label: '운동 시간', value: timeLabel(session.duration)},
    {label: '완료 종목', value: `${recap.rows.length}개`},
    ...(recap.workSets ? [{label: '본·드롭 세트', value: `${recap.workSets}세트`}] : []),
    ...(totalWeight ? [{label: '중량 볼륨', value: `${number.format(totalWeight)} kg·회`}] : []),
    ...(recap.cardioIntervals ? [{label: '유산소', value: `${recap.cardioIntervals}구간`}] : []),
  ];
  return <section aria-label="운동 결과 요약">
    <p className="subtext"><time dateTime={recap.date}>{recap.date}</time> · 완료한 운동</p>
    {!!recap.primary.length && <div className="panel" style={{marginBlock: 12, padding: 16}}>
      <MuscleMap primary={recap.primary} secondary={recap.secondary} compact />
      <p className="micro">오늘의 주동근 · {recap.muscleLabels.join(' · ')}</p>
    </div>}
    <dl className="finish-stats" style={{gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', marginBlock: 12}}>
      {stats.map(({label, value}) => <div key={label}><dt><span>{label}</span></dt><dd style={{margin: 0}}><b>{value}</b></dd></div>)}
    </dl>
    {!!caloriesLogged.length && <p className="micro">입력한 유산소 칼로리 {number.format(calories)}kcal{caloriesLogged.length < cardio.length ? ' · 일부 구간만 입력됨' : ''}</p>}
    <button className="secondary full" onClick={onShare}><Download size={16}/>오운완 카드 만들기</button>
    <h3 style={{marginBlock: '24px 8px'}}>운동별 세트 기록</h3>
  </section>;
}
