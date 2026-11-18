'use client';
import { useMemo } from 'react';
import { ChevronDown, Trophy } from 'lucide-react';
import { day, exercise, recordingFor, type AppState, type Session, type SessionExercise } from '@/lib/model';
import { groupedSets, matchingAttempts, personalBests } from '@/lib/workout-insights';
import ExercisePose from '@/components/exercise-pose';

export function RecentAttempts({state, session, item}: {state: AppState; session: Session; item: SessionExercise}) {
  const settings = recordingFor(state, item, session.gymId);
  const attempts = useMemo(() => matchingAttempts(state.sessions, session, {...item, recording: settings}).slice(0, 3),
    [state.sessions, session.id, session.gymId, item.exerciseId, item.equipmentId, settings.weightBasis]);
  return <details className="recent-attempts"><summary>최근 3회 비교 <ChevronDown size={15}/></summary>
    <p className="micro">같은 헬스장·기구·중량 기준의 완료 본세트만 표시해요.</p>
    {attempts.length ? attempts.map(a => <div className="attempt-row" key={a.id}>
      <time dateTime={a.date}>{day(a.date)}</time>
      <div className="set-chips">{groupedSets(item, a.sets, settings).map(g => <span key={g.first}>{g.label}{g.count > 1 ? ` × ${g.count}세트` : ''}</span>)}</div>
    </div>) : <p className="micro">비교할 기록이 아직 없어요.</p>}
  </details>;
}
export function WorkoutHistoryRows({session, sessions}: {session: Session; sessions: Session[]}) {
  return <div className="history-detail pose-history">{session.exercises.map(item => {
    const ex = exercise(item.exerciseId), groups = groupedSets(item, item.sets);
    const best = personalBests(sessions, session, item);
    const completed = item.sets.filter(s => s.done);
    return <article className="pose-history-row" key={item.id}>
      <div className="pose-heading"><ExercisePose name={ex?.name || item.name}/><div><h3>{item.name}</h3>
        {!!ex?.primaryLabels.length && <p>{ex.primaryLabels.slice(0, 2).join(' · ')}</p>}</div></div>
      {groups.length ? <div className="set-chips">{groups.map(g => <span key={g.first} className={g.kind !== 'work' ? 'aux-set' : ''}>
        {g.kind === 'warmup' ? '워밍업 ' : g.kind === 'drop' ? '드롭 ' : ''}{g.label}{g.count > 1 ? ` × ${g.count}${ex?.type === 'cardio' ? '구간' : '세트'}` : ''}
      </span>)}</div> : <p>완료 세트 없음</p>}
      {best.length > 0 && <div className="best-stats" aria-label="개인 최고 기록"><Trophy size={15}/>{best.map(b => <span key={b}>{b}</span>)}</div>}
      {completed.some(s => s.rpe > 0) && <details><summary>세트별 RPE 보기</summary><p>{completed.map((set, i) => `${i + 1}. ${set.rpe ? `RPE ${set.rpe}` : '미입력'}`).join(' · ')}</p></details>}
      {item.note && <small>{item.note}</small>}
    </article>;
  })}</div>;
}
