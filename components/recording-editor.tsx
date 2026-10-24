'use client';

import { useState } from 'react';
import { NativeSelect } from '@/components/ui/native-select';
import { Checkbox } from '@/components/ui/checkbox';
import { cardioFields, cardioPatch, cardioValue } from '@/lib/cardio';
import { defaultRecording, displayedWeight, toStoredWeight, type RecordingSettings } from '@/lib/recording-settings';
import { toast } from 'sonner';
export default function RecordingEditor({
  name,
  cardio,
  dumbbell,
  value,
  onSave
}: {
  name: string;
  cardio: boolean;
  dumbbell: boolean;
  value: RecordingSettings;
  onSave: (settings: RecordingSettings) => void;
}) {
  const [resetKey, setResetKey] = useState(0);
  const [settings, setSettings] = useState(() => structuredClone(value));
  const fields = cardioFields(name, settings);
  const order = settings.fieldOrder.length ? settings.fieldOrder : fields.map(f => f.key);
  const mainKeys = settings.fieldOrder.length ? fields.filter(f => !settings.hiddenFields.includes(f.key)).map(f => f.key) : fields.filter(f => !f.optional).map(f => f.key);
  const patch = (next: Partial<RecordingSettings>) => setSettings(s => ({
    ...s,
    ...next
  }));
  function move(key: typeof order[number], delta: number) {
    const list = fields.map(f => f.key),
      i = list.indexOf(key),
      to = i + delta;
    if (to < 0 || to >= list.length) return;
    [list[i], list[to]] = [list[to], list[i]];
    patch({
      fieldOrder: list,
      hiddenFields: fields.filter(f => !mainKeys.includes(f.key)).map(f => f.key)
    });
  }
  const defaultsSet = {
    weight: 0,
    reps: 0,
    distance: 0,
    duration: 0,
    metrics: settings.defaults
  };
  return <form key={resetKey} className="recording-editor" onSubmit={e => {
    e.preventDefault();
    onSave(settings);
  }}>
 <p className="subtext">{name} · 다음 운동에도 이 설정을 사용해요.</p>
 {(!cardio || fields.some(f => f.key === 'weight')) && <div className="form-grid"><label className="field"><span>중량 단위</span><NativeSelect aria-label="중량 단위" value={settings.weightUnit} onChange={e => patch({
          weightUnit: e.target.value as 'kg' | 'lb'
        })}><option value="kg">kg</option><option value="lb">lb</option></NativeSelect></label>{dumbbell && <label className="field"><span>덤벨 입력 기준</span><NativeSelect aria-label="덤벨 입력 기준" value={settings.weightBasis === 'pair' ? 'pair' : 'single'} onChange={e => patch({
          weightBasis: e.target.value as 'single' | 'pair'
        })}><option value="single">한쪽 무게</option><option value="pair">양쪽 합계</option></NativeSelect></label>}<label className="field"><span>중량 버튼 간격 ({settings.weightUnit})</span><input aria-label="중량 버튼 간격" type="number" min="0.000001" max={displayedWeight(100, settings)} step="any" key={settings.weightUnit + settings.weightBasis} defaultValue={displayedWeight(settings.weightStep, settings)} onBlur={e => {
          const n = Number(e.target.value);
          const kg = toStoredWeight(n, settings);
          if (!Number.isFinite(kg) || kg <= 0 || kg > 100) {
            toast.error('중량 간격을 확인해 주세요.');
            e.target.value = String(displayedWeight(settings.weightStep, settings));
            return;
          }
          patch({
            weightStep: kg
          });
        }} /></label></div>}
 {cardio && fields.some(f => f.key === 'incline' || f.key === 'inclineLevel') && <label className="field"><span>기구에 표시되는 경사 단위</span><NativeSelect aria-label="경사 단위" value={settings.inclineUnit} onChange={e => {
        const unit = e.target.value as RecordingSettings['inclineUnit'];
        const next = {
          ...settings.defaults
        };
        if (unit === 'level') delete next.incline;else delete next.inclineLevel;
        patch({
          inclineUnit: unit,
          defaults: next,
          fieldOrder: order.map(k => k === 'incline' || k === 'inclineLevel' ? unit === 'level' ? 'inclineLevel' : 'incline' : k),
          hiddenFields: fields.filter(f => !mainKeys.includes(f.key)).map(f => f.key).map(k => k === 'incline' || k === 'inclineLevel' ? unit === 'level' ? 'inclineLevel' : 'incline' : k)
        });
      }}><option value="percent">경사율 (%)</option><option value="degree">각도 (°)</option><option value="level">기구 레벨</option></NativeSelect><small>%와 °는 변환해서 표시해요. 레벨은 별도 값으로 기록해요.</small></label>}
 {cardio && <><h3>먼저 보여줄 항목</h3><p className="micro">체크하지 않은 항목은 ‘더 보기’로 옮겨요. 저장한 값은 유지돼요.</p><div className="recording-field-list">{fields.map((f, i) => <div className="recording-field-option" key={f.key}><label><Checkbox aria-label={`${f.label} 먼저 표시`} disabled={f.key === 'duration'} checked={f.key === 'duration' || mainKeys.includes(f.key)} onCheckedChange={checked => patch({
              fieldOrder: fields.map(x => x.key),
              hiddenFields: fields.filter(x => x.key !== f.key && !mainKeys.includes(x.key) || x.key === f.key && !checked).map(x => x.key)
            })} /><span>{f.label}<small>{f.unit}</small></span></label><div><button type="button" className="text-button" aria-label={`${f.label} 위로`} disabled={i === 0} onClick={() => move(f.key, -1)}>위로</button><button type="button" className="text-button" aria-label={`${f.label} 아래로`} disabled={i === fields.length - 1} onClick={() => move(f.key, 1)}>아래로</button></div></div>)}</div>
 <h3>자주 쓰는 기구 설정</h3><p className="micro">새 운동에만 채워요. 시간·거리·칼로리는 자동으로 채우지 않아요.</p><div className="form-grid">{fields.filter(f => ['speed', 'incline', 'inclineLevel', 'resistance'].includes(f.key)).map(f => <label className="field" key={f.key}><span>{f.label} ({f.unit})</span><input aria-label={`기본 ${f.label}`} type="number" min={f.min ?? 0} max={f.max} step="any" key={f.key + f.unit} defaultValue={cardioValue(defaultsSet, f) ?? ''} placeholder="미설정" onBlur={e => {
            const raw = e.target.value,
              n = raw === '' ? undefined : Number(raw);
            if (n !== undefined && (!Number.isFinite(n) || n < (f.min ?? 0) || n > f.max)) {
              toast.error(`${f.label} 값을 확인해 주세요.`);
              e.target.value = String(cardioValue(defaultsSet, f) ?? '');
              return;
            }
            const changed = cardioPatch(f, n).metrics || {};
            const defaults = {
              ...settings.defaults,
              ...changed
            };
            if (n === undefined) delete defaults[f.key as keyof typeof defaults];
            patch({
              defaults
            });
          }} /></label>)}</div></>}
 <p className="micro">단위를 바꿔도 운동량은 같아요. 이전에 저장한 운동의 표시 설정은 그대로 유지돼요.</p><div className="modal-actions"><button type="button" className="secondary" onClick={() => {
        setSettings(defaultRecording(dumbbell));
        setResetKey(n => n + 1);
      }}>기본값으로</button><button className="primary" type="submit">설정 저장</button></div>
 </form>;
}
