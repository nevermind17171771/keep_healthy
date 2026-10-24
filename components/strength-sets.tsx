'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { NativeSelect } from '@/components/ui/native-select';
import { timeLabel, parseTime, type SetEntry } from '@/lib/model';
import { displayedWeight, toStoredWeight, weightLabel, weightText, type RecordingSettings } from '@/lib/recording-settings';
import { stepReps } from '@/lib/set-inputs';
import { toast } from 'sonner';
type Props = {
  name: string;
  type?: string;
  sets: SetEntry[];
  previous: SetEntry[];
  recording: RecordingSettings;
  index?: number;
  onChange: (id: string, patch: Partial<SetEntry>) => void;
  onComplete: (id: string) => void;
};
export default function StrengthSets({
  name,
  type,
  sets,
  previous,
  recording,
  index,
  onChange,
  onComplete
}: Props) {
  const timed = type === 'time';
  return <div className={'strength-sets ' + (index !== undefined ? 'focused-sets' : '')}>{sets.map((set, i) => {
      if (index !== undefined && i !== index) return null;
      const ordinal = sets.slice(0, i + 1).filter(s => s.kind === 'work').length - 1;
      const prior = set.kind === 'work' ? previous[ordinal] : undefined;
      const summary = (s: Pick<SetEntry, 'weight' | 'reps' | 'duration'>) => timed ? timeLabel(s.duration) : `${weightText(s.weight, recording)} × ${s.reps}회`;
      return <section className={'strength-row ' + (set.done ? 'done' : '')} key={set.id} aria-label={`${name} ${i + 1}세트`}>
   <div className="strength-row-top"><button type="button" className="set-kind" aria-label={`${name} ${i + 1}세트 유형`} onClick={() => onChange(set.id, {
            kind: set.kind === 'work' ? 'warmup' : set.kind === 'warmup' ? 'drop' : 'work'
          })}>{set.kind === 'warmup' ? 'W · 워밍업' : set.kind === 'drop' ? 'D · 드롭' : `${ordinal + 1} · 본세트`}</button><label className="cardio-complete"><Checkbox className="set-check" checked={set.done} aria-label={`${name} ${i + 1}세트 완료`} onCheckedChange={() => onComplete(set.id)} /><span>{set.done ? '완료됨' : '완료'}</span></label></div>
   <div className="set-reference"><span>지난 기록 <b>{prior ? summary(prior) : '없음'}</b></span><span>오늘 목표 <b>{set.target ? summary(set.target) : '미설정'}</b></span>{set.target && !set.done && <button type="button" className="text-button" onClick={() => onChange(set.id, timed ? {
            duration: set.target!.duration
          } : {
            weight: set.target!.weight,
            reps: set.target!.reps
          })}>목표값 입력</button>}</div>
   <div className="strength-input-grid"><label className="field"><span>{timed ? '시간 (분:초)' : `${type === 'assisted' ? '보조 ' : type === 'bodyweight' ? '추가 ' : ''}${weightLabel(recording)}`}</span>{timed ? <input aria-label={`${name} ${i + 1}세트 시간`} key={String(set.duration)} defaultValue={timeLabel(set.duration)} placeholder="00:30" inputMode="text" onBlur={e => {
              if (!/^\d{1,3}:[0-5]\d$/.test(e.target.value)) {
                toast.error('분:초 형식으로 입력하세요.');
                e.target.value = timeLabel(set.duration);
                return;
              }
              onChange(set.id, {
                duration: parseTime(e.target.value)
              });
            }} /> : <div className="weight-control"><button type="button" aria-label={`${name} ${i + 1}세트 중량 줄이기`} onClick={() => onChange(set.id, {
                weight: Math.max(0, Math.round((set.weight - recording.weightStep) * 1e6) / 1e6)
              })}>−</button><input aria-label={`${name} ${i + 1}세트 중량`} type="number" inputMode="decimal" min="0" step="any" max="1000000" key={recording.weightUnit + recording.weightBasis} value={displayedWeight(set.weight, recording) || ''} placeholder="0" onChange={e => {
                const n = Number(e.target.value);
                if (Number.isFinite(n) && n >= 0 && n <= 1000000) onChange(set.id, {
                  weight: toStoredWeight(n, recording)
                });
              }} /><button type="button" aria-label={`${name} ${i + 1}세트 중량 늘리기`} onClick={() => onChange(set.id, {
                weight: Math.round((set.weight + recording.weightStep) * 1e6) / 1e6
              })}>+</button></div>}</label>
   {!timed && <label className="field"><span>횟수</span><div className="weight-control reps-control"><button type="button" aria-label={`${name} ${i + 1}세트 횟수 줄이기`} disabled={set.reps<=0} onClick={()=>onChange(set.id,{reps:stepReps(set.reps,-1)})}>−</button><input aria-label={`${name} ${i + 1}세트 횟수`} type="number" inputMode="numeric" min="0" max="1000000" step="1" value={set.reps || ''} placeholder="0" onChange={e => {
              const n = Number(e.target.value);
              if (Number.isInteger(n) && n >= 0 && n <= 1000000) onChange(set.id, {
                reps: n
              });
            }} /><button type="button" aria-label={`${name} ${i + 1}세트 횟수 늘리기`} disabled={set.reps>=1000000} onClick={()=>onChange(set.id,{reps:stepReps(set.reps,1)})}>+</button></div></label>}
   <label className="field"><span>RPE · 선택</span><NativeSelect aria-label={`${name} ${i + 1}세트 RPE`} value={set.rpe} onChange={e => onChange(set.id, {
              rpe: Number(e.target.value)
            })}><option value={0}>미입력</option>{[5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n}</option>)}</NativeSelect></label></div>
  </section>;
    })}</div>;
}
