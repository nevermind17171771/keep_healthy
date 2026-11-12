import { displayedWeight, toStoredWeight, percentToDegrees, degreesToPercent, type RecordingSettings } from './recording-settings';
/** Canonical storage: duration/split in seconds, distance in kilometres, elevation in metres. */
export type CardioMetric = 'calories' | 'speed' | 'incline' | 'inclineLevel' | 'elevationGain' | 'steps' | 'floors' | 'rpm' | 'resistance' | 'watts' | 'strokeRate' | 'split' | 'rounds' | 'heartRate';
export type CardioField = {
  key: 'duration' | 'distance' | 'weight' | 'reps' | CardioMetric;
  label: string;
  unit: string;
  step?: number;
  min?: number;
  max: number;
  clock?: boolean;
  optional?: boolean;
  recording?: RecordingSettings;
};
const duration: CardioField = {
  key: 'duration',
  label: '시간',
  unit: '분:초',
  clock: true,
  max: 86400
};
const distance: CardioField = {
  key: 'distance',
  label: '이동거리',
  unit: 'km',
  step: .01,
  max: 1000
};
const metres: CardioField = {
  ...distance,
  unit: 'm',
  step: 1,
  max: 1000000
};
const calories: CardioField = {
  key: 'calories',
  label: '칼로리',
  unit: 'kcal',
  step: .1,
  max: 100000
};
const speed: CardioField = {
  key: 'speed',
  label: '속도',
  unit: 'km/h',
  step: .1,
  max: 200
};
const incline: CardioField = {
  key: 'incline',
  label: '경사',
  unit: '%',
  step: .5,
  min: -20,
  max: 100
};
const elevation: CardioField = {
  key: 'elevationGain',
  label: '수직 이동거리',
  unit: 'm',
  step: .1,
  max: 100000
};
const steps: CardioField = {
  key: 'steps',
  label: '스텝 수',
  unit: '스텝',
  step: 1,
  max: 1000000
};
const floors: CardioField = {
  key: 'floors',
  label: '올라간 층 수',
  unit: '층',
  step: .1,
  max: 100000
};
const rpm: CardioField = {
  key: 'rpm',
  label: '회전수',
  unit: 'RPM',
  step: 1,
  max: 1000
};
const resistance: CardioField = {
  key: 'resistance',
  label: '기구 레벨',
  unit: '레벨',
  step: 1,
  max: 1000,
  optional: true
};
const watts: CardioField = {
  key: 'watts',
  label: '출력',
  unit: 'W',
  step: 1,
  max: 10000,
  optional: true
};
const strokes: CardioField = {
  key: 'strokeRate',
  label: '스트로크율',
  unit: '회/분',
  step: 1,
  max: 300,
  optional: true
};
const split: CardioField = {
  key: 'split',
  label: '500m 페이스',
  unit: '분:초/500m',
  clock: true,
  max: 3600,
  optional: true
};
const reps: CardioField = {
  key: 'reps',
  label: '반복 횟수',
  unit: '회',
  step: 1,
  max: 1000000
};
const weight: CardioField = {
  key: 'weight',
  label: '중량',
  unit: 'kg',
  step: .5,
  max: 1000
};
const rounds: CardioField = {
  key: 'rounds',
  label: '라운드',
  unit: '회',
  step: 1,
  max: 10000
};
const heartRate: CardioField = {
  key: 'heartRate',
  label: '평균 심박수',
  unit: 'bpm',
  step: 1,
  max: 300,
  optional: true
};
export function cardioFields(name: string, recording?:RecordingSettings): CardioField[] {
  let fields: CardioField[];
  if (/인클라인.*트레드밀|경사.*트레드밀/.test(name)) fields = [duration, distance, incline, elevation, calories, speed];else if (/트레드밀|러닝머신|런닝머신/.test(name)) fields = [duration, distance, calories, speed, {
    ...incline,
    optional: true
  }, {
    ...elevation,
    optional: true
  }];else if (/천국의 계단|스텝밀|스테어마스터/.test(name)) fields = [duration, steps, calories, floors, resistance];else if (/로잉|스키어그/.test(name)) fields = [duration, metres, calories, split, strokes, watts, resistance];else if (/사이클|스핀바이크|어썰트|바이크/.test(name)) fields = [duration, distance, calories, rpm, {
    ...speed,
    optional: true
  }, resistance, watts];else if (/일립티컬/.test(name)) fields = [duration, distance, calories, rpm, resistance];else if (/스테퍼/.test(name)) fields = [duration, steps, calories, resistance];else if (/파머스/.test(name)) fields = [duration, metres, weight];else if (/슬레드/.test(name)) fields = [duration, metres, weight];else if (/셔틀 런/.test(name)) fields = [duration, metres, rounds];else if (/줄넘기/.test(name)) fields = [duration, reps, calories];else if (/케틀벨 스윙|덤벨 스러스터|데빌 프레스|월 볼/.test(name)) fields = [duration, reps, weight, {
    ...calories,
    optional: true
  }];else if (/버피|마운틴 클라이머|박스 스텝오버/.test(name)) fields = [duration, reps, {
    ...calories,
    optional: true
  }];else if (/타바타|HIIT|인터벌/.test(name)) fields = [duration, rounds, calories];else fields = [duration, calories];
  const all=[...fields,heartRate].map(field=>{
    let f={...field};
    if(recording&&f.key==='incline'){
      if(recording.inclineUnit==='degree') f={...f,unit:'°',min:-10,max:45,step:.1};
      if(recording.inclineUnit==='level') f={...f,key:'inclineLevel',label:'경사 레벨',unit:'레벨',min:0,max:1000,step:1};
    }
    if(recording&&f.key==='weight')f={...f,unit:recording.weightUnit,recording};
    if(recording?.fieldOrder.length) f.optional=recording.hiddenFields.includes(f.key);
    if(f.key==='duration')f.optional=false;
    return f;
  });
  if(recording?.fieldOrder.length){const order=recording.fieldOrder;all.sort((a,b)=>(order.indexOf(a.key)<0?99:order.indexOf(a.key))-(order.indexOf(b.key)<0?99:order.indexOf(b.key)));}
  return all;
}
export type CardioValues = {
  duration: number;
  distance: number;
  weight: number;
  reps: number;
  metrics?: Partial<Record<CardioMetric, number>>;
};
export function cardioValue(set: CardioValues, field: CardioField): number | undefined {
  if (field.key === 'duration' || field.key === 'distance' || field.key === 'weight' || field.key === 'reps') {
    const value = set[field.key];
    if(field.key==='weight'&&field.recording)return displayedWeight(value,field.recording);
    return field.key === 'distance' && field.unit === 'm' ? Math.round(value * 1000000) / 1000 : value;
  }
  const value=set.metrics?.[field.key];
  return field.key==='incline'&&field.unit==='°'&&value!==undefined ? Math.round(percentToDegrees(value)*100)/100 : value;
}
export function cardioPatch(field: CardioField, value: number | undefined): Partial<CardioValues> {
  if(field.key==='weight'&&field.recording)return {weight:toStoredWeight(value??0,field.recording)};
  if (field.key === 'duration' || field.key === 'distance' || field.key === 'weight' || field.key === 'reps') return {
    [field.key]: field.key === 'distance' && field.unit === 'm' ? (value ?? 0) / 1000 : value ?? 0
  };
  return {
    metrics: {
      [field.key]: value!==undefined&&field.key==='incline'&&field.unit==='°'?degreesToPercent(value):value
    }
  };
}
export function cardioSummary(name: string, set: CardioValues, recording?:RecordingSettings): string {
  const fields=cardioFields(name,recording);
  if(set.metrics?.inclineLevel!==undefined&&!fields.some(f=>f.key==='inclineLevel'))fields.push({key:'inclineLevel',label:'경사 레벨',unit:'레벨',max:1000});
  if(set.metrics?.incline!==undefined&&!fields.some(f=>f.key==='incline'))fields.push(incline);
  return fields.flatMap(f => {
    const n = cardioValue(set, f);
    if (n === undefined || n === 0 && ['duration', 'distance', 'weight', 'reps'].includes(f.key)) return [];
    if (f.clock) return [`${f.label} ${Math.floor(n / 60).toString().padStart(2, '0')}:${Math.floor(n % 60).toString().padStart(2, '0')}${f.key === 'split' ? '/500m' : ''}`];
    return [`${f.label} ${new Intl.NumberFormat('ko-KR', {
      maximumFractionDigits: 3
    }).format(n)}${f.unit}`];
  }).join(' · ') || '입력한 수치 없음';
}
/** A new interval carries settings, never totals from the preceding interval. */
export function nextCardioInterval(previous?: CardioValues): Partial<CardioValues> {
  const metrics: Partial<Record<CardioMetric, number>> = {};
  for (const key of ['speed', 'incline', 'inclineLevel', 'resistance'] as const) if (previous?.metrics?.[key] !== undefined) metrics[key] = previous.metrics[key];
  return {
    duration: 0,
    distance: 0,
    reps: 0,
    weight: previous?.weight ?? 0,
    metrics
  };
}
export const CARDIO_CSV_FIELDS: {
  key: CardioMetric;
  header: string;
}[] = [['calories', 'calories_kcal'], ['speed', 'speed_kmh'], ['incline', 'incline_percent'], ['inclineLevel','incline_level'], ['elevationGain', 'elevation_gain_m'], ['steps', 'steps'], ['floors', 'floors'], ['rpm', 'rpm'], ['resistance', 'resistance_level'], ['watts', 'watts'], ['strokeRate', 'stroke_rate_spm'], ['split', 'split_seconds_per_500m'], ['rounds', 'rounds'], ['heartRate', 'average_heart_rate_bpm']].map(([key, header]) => ({
  key: key as CardioMetric,
  header
}));
