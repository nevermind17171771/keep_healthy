'use client';

import { useEffect, useState } from 'react';
import { Timer, Video, SlidersHorizontal, Plus } from 'lucide-react';
import { NativeSelect } from '@/components/ui/native-select';
import StrengthSets from '@/components/strength-sets';
import CardioSets from '@/components/cardio-sets';
import { exercise, recordingFor, timeLabel, type AppState, type Session, type SetEntry, type SessionExercise } from '@/lib/model';
import { previousWorkSets } from '@/lib/session-actions';
import { cardioSummary } from '@/lib/cardio';
import { shortsSearchUrl } from '@/lib/exercise-video';
type Props = {
  state: AppState;
  session: Session;
  restRemaining: number;
  restActive?: boolean;
  onSkipRest: () => void;
  onExtendRest: () => void;
  onAdjustRest?: (seconds: number) => void;
  onChange: (exerciseId: string, setId: string, patch: Partial<SetEntry>) => void;
  onComplete: (exerciseId: string, setId: string) => void;
  onSwap?: (item: SessionExercise) => void;
  onSettings: (item: SessionExercise) => void;
  onEquipment: (item: SessionExercise, id: string) => void;
  onTargets: (item: SessionExercise) => void;
  onDeleteSet?: (item: SessionExercise, setId: string) => void;
  onDefer?: (item: SessionExercise) => string | null;
  onAddSet: (item: SessionExercise) => void;
  onRest: (item: SessionExercise, seconds: number) => void;
  onNotes: (item: SessionExercise) => void;
};
export default function FocusWorkout(props: Props) {
  const {
    session
  } = props;
  const [selected, setSelected] = useState(() => session.exercises.find(e => e.sets.some(s => !s.done))?.id || session.exercises[0]?.id || '');
  useEffect(()=>{try{const saved=JSON.parse(sessionStorage.getItem('keep-healthy-focus')||'null');if(saved?.sessionId===session.id)setSelected(saved.exerciseId);}catch{}},[session.id]);
  const select=(id:string)=>{setSelected(id);try{sessionStorage.setItem('keep-healthy-focus',JSON.stringify({sessionId:session.id,exerciseId:id}));}catch{}};
  const current = session.exercises.find(e => e.id === selected) || session.exercises[0];
  if (!current) return null;
  const currentIndex = session.exercises.indexOf(current),
    total = session.exercises.reduce((n, e) => n + e.sets.length, 0),
    done = session.exercises.reduce((n, e) => n + e.sets.filter(s => s.done).length, 0);
  return <div className="focus-workout"><div className="focus-overview"><label><span>지금 할 운동</span><NativeSelect aria-label="집중할 운동" value={current.id} onChange={e => select(e.target.value)}>{session.exercises.map((e, i) => <option key={e.id} value={e.id}>{i + 1}. {e.name} · {e.sets.filter(s => s.done).length}/{e.sets.length}</option>)}</NativeSelect></label><span className="focus-progress">{done}<small> / {total} 완료</small></span></div><button className="text-button" disabled={!props.onDefer || !current.sets.some(s=>!s.done) || session.exercises.filter(e=>e.sets.some(s=>!s.done)).length<2} onClick={()=>{const next=props.onDefer?.(current);if(next)select(next);}}>기구 사용 중 · 나중에 하기</button><FocusExercise key={current.id} {...props} item={current} /><div className="focus-navigation"><button className="secondary" disabled={currentIndex === 0} onClick={() => select(session.exercises[currentIndex - 1].id)}>이전 운동</button><span>{currentIndex + 1} / {session.exercises.length}</span><button className="primary" disabled={currentIndex === session.exercises.length - 1} onClick={() => select(session.exercises[currentIndex + 1].id)}>다음 운동</button></div></div>;
}
function FocusExercise(props: Props & {
  item: SessionExercise;
}) {
  const {
      item,
      state,
      session
    } = props,
    ex = exercise(item.exerciseId),
    recording = recordingFor(state, item),
    previous = previousWorkSets(state, item),
    cardio = ex?.type === 'cardio';
  const [index, setIndex] = useState(() => Math.max(0, item.sets.findIndex(s => !s.done)));
  const actualIndex = Math.min(index, item.sets.length - 1),
    set = item.sets[actualIndex];
  const equipment = state.gyms.find(g => g.id === session.gymId)?.equipment.filter(e => e.exerciseId === item.exerciseId) || [];
  const eq = equipment.find(e => e.id === item.equipmentId);
  useEffect(()=>{try{const saved=JSON.parse(sessionStorage.getItem('keep-healthy-focus-set')||'null');if(saved?.sessionId===session.id&&saved.exerciseId===item.id){const i=item.sets.findIndex(s=>s.id===saved.setId);if(i>=0)setIndex(i);}}catch{}},[session.id,item.id]);
  const selectSet=(i:number)=>{setIndex(i);try{sessionStorage.setItem('keep-healthy-focus-set',JSON.stringify({sessionId:session.id,exerciseId:item.id,setId:item.sets[i]?.id}));}catch{}};
  if (!set) return <section className="panel focus-exercise"><h2>{item.name}</h2><p>세트가 없어요. 추가해서 이어서 기록하세요.</p><button className="primary" onClick={()=>{props.onAddSet(item);setIndex(0);}}>세트 추가</button></section>;
  const complete = () => {
    props.onComplete(item.id, set.id);
    if (!set.done) {
      const next = item.sets.findIndex((s, i) => i > actualIndex && !s.done);
      if (next >= 0) selectSet(next);
    }
  };
  return <section className="panel focus-exercise"><div className="focus-title"><span className="eyebrow">{cardio ? 'CARDIO' : 'NEXT SET'}</span><h2>{item.name}</h2><p>{ex?.primaryLabels.join(' · ') || '내 운동'}</p></div>{item.repMin&&<p className="micro">목표 {item.repMin}–{item.repMax||item.repMin}회 · RPE {item.effortCap||8} 이하를 출발점으로 조절하세요.</p>}<div className="focus-tools"><NativeSelect aria-label={`${item.name} 기구`} value={item.equipmentId} onChange={e => props.onEquipment(item, e.target.value)}><option value="">기본 기록</option>{equipment.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</NativeSelect><button className="secondary" onClick={() => props.onSettings(item)}><SlidersHorizontal size={17} />입력 설정</button><button className="text-button" onClick={() => props.onNotes(item)}>메모</button>{props.onSwap&&<button className="text-button" onClick={()=>props.onSwap!(item)}>대체 운동</button>}<a className="text-button video-link" href={shortsSearchUrl(item.name)} target="_blank" rel="noopener noreferrer" aria-label={`${item.name} 유튜브 쇼츠 검색 (새 탭)`}><Video size={17} />쇼츠 검색</a></div>
 {(eq?.setup || item.note) && <p className="focus-note">{[eq?.setup, item.note].filter(Boolean).join(' · ')}</p>}
 <div className="focus-set-nav" aria-label="세트 선택">{item.sets.map((s, i) => <button key={s.id} className={(i === actualIndex ? 'selected ' : '') + (s.done ? 'completed' : '')} aria-pressed={i === actualIndex} onClick={() => selectSet(i)}>{s.kind === 'warmup' ? 'W' : s.kind === 'drop' ? 'D' : i + 1}{s.done ? ' ✓' : ''}</button>)}<button aria-label={cardio ? '구간 추가' : '세트 추가'} onClick={() => {
        props.onAddSet(item);
        setIndex(item.sets.length);
      }}><Plus size={18} /></button></div>
 <button className="text-button danger" onClick={()=>props.onDeleteSet?.(item,set.id)}>{cardio ? '이 구간 삭제' : '이 세트 삭제'}</button>
 <div className="focus-target-action"><span>{previous.sets.length ? `지난 기록 자동 입력 · ${new Date(previous.date).toLocaleDateString('ko-KR', {
          timeZone: 'Asia/Seoul',
          month: 'numeric',
          day: 'numeric'
        })}` : '이 기구의 첫 기록'}</span><button className="text-button" disabled={!previous.sets.length} onClick={() => props.onTargets(item)}>지난 세트를 오늘 목표로</button></div>
 {cardio ? <>{previous.sets[actualIndex] && <p className="set-reference">지난 구간 · {cardioSummary(item.name, previous.sets[actualIndex], recording)}</p>}<CardioSets name={item.name} sets={[set]} recording={recording} indexOffset={actualIndex} onChange={(id, p) => props.onChange(item.id, id, p)} onComplete={complete} /></> : <StrengthSets name={item.name} type={ex?.type} sets={item.sets} previous={previous.sets} recording={recording} index={actualIndex} onChange={(id, p) => props.onChange(item.id, id, p)} onComplete={complete} />}
 {!cardio && <div className="focus-rest-settings"><Timer size={17} /><NativeSelect aria-label={`${item.name} 휴식 시간`} value={item.rest} onChange={e => props.onRest(item, Number(e.target.value))}>{[30, 45, 60, 90, 120, 150, 180, 240, 300].map(n => <option key={n} value={n}>{timeLabel(n)} 휴식</option>)}</NativeSelect></div>}
 {(props.restActive || props.restRemaining > 0) && <div className="focus-rest" role="status"><div><span>{props.restRemaining ? '다음 세트까지' : '휴식 끝 · 준비됐어요'}</span><strong>{timeLabel(props.restRemaining)}</strong></div><div className="focus-rest-actions" role="group" aria-label="진행 중인 휴식 시간 조절"><button className="secondary" aria-label="휴식 15초 줄이기" disabled={!props.onAdjustRest || props.restRemaining<=0} onClick={()=>props.onAdjustRest?.(-15)}>−15초</button><button className="secondary" aria-label="휴식 15초 늘리기" disabled={!props.onAdjustRest} onClick={()=>props.onAdjustRest?.(15)}>+15초</button><button className="secondary" aria-label="휴식 30초 늘리기" onClick={props.onExtendRest}>+30초</button></div><button className="text-button" onClick={props.onSkipRest}>휴식 끝내기</button></div>}
 <button className={'primary full focus-complete ' + (set.done ? 'is-done' : '')} onClick={complete}>{set.done ? '완료 취소' : `${actualIndex + 1}${cardio ? '구간' : '세트'} 완료`}</button>
 </section>;
}
