'use client';
import {growthSuggestion} from '@/lib/adaptive-training';
import {recordingFor,type AppState,type Session,type SessionExercise,type SetEntry} from '@/lib/model';
import {weightText} from '@/lib/recording-settings';
export default function GrowthTarget({state,session,item,onChange}:{state:AppState;session:Session;item:SessionExercise;onChange:(id:string,patch:Partial<SetEntry>)=>void}){
 const suggestion=growthSuggestion(state,session,item),recording=recordingFor(state,item,session.gymId);
 const work=item.sets.filter(s=>s.kind==='work');
 const applied=suggestion.targets.length>0&&work.every((s,i)=>s.done||(s.target?.weight===suggestion.targets[i]?.weight&&s.target?.reps===suggestion.targets[i]?.reps));
 return <aside className="growth-target" aria-label={`${item.name} 성장 목표`}><strong>기록 기반 다음 목표</strong><p>{suggestion.reason}</p>{suggestion.targets.length>0&&<><p>{suggestion.targets.map((t,i)=>`${i+1}세트 · ${weightText(t.weight,recording)} × ${t.reps}회`).join(' / ')}</p><button className="secondary" disabled={applied||work.every(s=>s.done)} onClick={()=>work.forEach((s,i)=>{if(!s.done)onChange(s.id,{target:suggestion.targets[i]});})}>{applied?'목표 적용됨':'남은 본세트 목표로 적용'}</button><small>입력값은 유지돼요. 세트의 ‘목표값 입력’을 누르면 반영돼요. 힘들거나 불편하면 지난 기록을 유지하세요.</small></>}</aside>;
}
