'use client';

import { useId } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { NativeSelect } from '@/components/ui/native-select';
import { cardioFields, cardioValue, cardioPatch, type CardioField, type CardioMetric } from '@/lib/cardio';
import { timeLabel, parseTime, type SetEntry } from '@/lib/model';
import { toast } from 'sonner';
import type {RecordingSettings} from '@/lib/recording-settings';
export default function CardioSets({
  name,
  sets,
  onChange,
  onComplete, recording, indexOffset=0
}: {
  name: string;
  sets: SetEntry[];
  onChange: (id: string, patch: Partial<SetEntry>) => void;
  onComplete: (id: string) => void;
  recording?:RecordingSettings;
  indexOffset?:number;
}) {
  const fields = cardioFields(name,recording),
    prefix = useId();
  function input(set: SetEntry, field: CardioField, index: number) {
    const value = cardioValue(set, field),
      label = `${name} ${index + indexOffset + 1}구간 ${field.label}`;
    const commit = (n: number | undefined) => {
      const patch = cardioPatch(field, n);
      if (patch.metrics) {
        const metrics = {
          ...set.metrics,
          ...patch.metrics
        };
        if (n === undefined) delete metrics[field.key as CardioMetric];
        onChange(set.id, {
          metrics
        });
      } else onChange(set.id, patch);
    };
    const id = `${prefix}-${set.id}-${field.key}`;
    return <label className="cardio-field" key={field.key} htmlFor={id}><span>{field.label}<small>{field.unit}</small></span>{field.clock ? <input id={id} aria-label={label} key={String(value)} defaultValue={value ? timeLabel(value) : ''} placeholder="00:00" inputMode="text" maxLength={7} onBlur={e => {
        const v = e.target.value.trim();
        if (!v) {
          commit(undefined);
          return;
        }
        if (!/^\d{1,4}:[0-5]\d$/.test(v) || parseTime(v) > field.max) {
          toast.error('시간은 분:초 형식으로 입력하세요. 예: 20:30');
          e.target.value = value ? timeLabel(value) : '';
          return;
        }
        commit(parseTime(v));
      }} /> : <input id={id} aria-label={label} type="number" inputMode={field.step === 1 ? 'numeric' : 'decimal'} min={field.min ?? 0} max={field.max} step={field.step ?? 1} placeholder="미입력" value={value === undefined || ['duration', 'distance', 'weight', 'reps'].includes(field.key) && value === 0 ? '' : value} onChange={e => {
        if (!e.target.value) {
          commit(undefined);
          return;
        }
        const n = Number(e.target.value);
        if (!Number.isFinite(n) || n < (field.min ?? 0) || n > field.max || field.step === 1 && !Number.isInteger(n)) {
          toast.error(`${field.label} 입력 범위를 확인해 주세요.`);
          return;
        }
        commit(n);
      }} />}</label>;
  }
  return <div className="cardio-records"><p className="micro">기구에 표시된 수치를 입력하세요. 없는 항목은 비워두어도 돼요. 경사·속도가 바뀌면 구간을 나누고, 시간·거리·칼로리는 각 구간의 값으로 입력하세요.</p>{sets.map((set, index) => <section key={set.id} className={'cardio-segment ' + (set.done ? 'done' : '')} aria-label={`${name} ${index + indexOffset + 1}구간`}><div className="cardio-segment-header"><strong>{index + indexOffset + 1}구간</strong><label className="cardio-complete"><Checkbox checked={set.done} onCheckedChange={() => onComplete(set.id)} aria-label={`${name} ${index + indexOffset + 1}구간 완료`} /><span>완료</span></label></div>{set.target && <p className="set-reference">오늘 목표 · {set.target.duration?timeLabel(set.target.duration):'시간 미지정'}{set.target.distance?` · ${set.target.distance}km`:''}<span>완료한 값은 아래에 직접 기록하세요.</span></p>}<div className="cardio-fields">{fields.filter(f => !f.optional).map(f => input(set, f, index))}</div><details className="cardio-extra" open={fields.some(f => f.optional && cardioValue(set, f) !== undefined) || undefined}><summary>더 보기 · 선택 항목</summary><div className="cardio-fields">{fields.filter(f => f.optional).map(f => input(set, f, index))}<label className="cardio-field"><span>체감 강도<small>RPE</small></span><NativeSelect aria-label={`${name} ${index + indexOffset + 1}구간 RPE`} value={set.rpe} onChange={e => onChange(set.id, {
              rpe: Number(e.target.value)
            })}><option value={0}>미입력</option>{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => <option key={v} value={v}>{v}</option>)}</NativeSelect></label></div><p className="micro">유산소 체감 강도는 숫자가 클수록 힘들게 느껴진 구간이에요.</p></details></section>)}</div>;
}
