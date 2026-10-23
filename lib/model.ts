import legacy from './legacy-catalog.json';
import { z } from 'zod';
import { legacyCardioMetrics } from './legacy-cardio';
import { recordingSettingsSchema, defaultRecording, type RecordingSettings } from './recording-settings';
export const VERSION = 4;
import { uid } from './id';
export { uid };
const num = z.number().finite().min(0).max(1000000);
const timestamp = z.number().finite().min(0).max(8640000000000000);
export const cardioMetricsSchema = z.object({
  calories: num.optional(),
  speed: num.max(200).optional(),
  incline: z.number().finite().min(-20).max(100).optional(),
  elevationGain: num.optional(),
  inclineLevel: num.max(1000).optional(),
  steps: num.int().optional(),
  floors: num.optional(),
  rpm: num.max(1000).optional(),
  resistance: num.max(1000).optional(),
  watts: num.max(10000).optional(),
  strokeRate: num.max(300).optional(),
  split: num.optional(),
  rounds: num.int().optional(),
  heartRate: num.max(300).optional()
});
export const setSchema = z.object({
  id: z.string(),
  weight: num,
  reps: num.int(),
  duration: num,
  distance: num,
  metrics: cardioMetricsSchema.optional(),
  target: z.object({weight:num,reps:num.int(),duration:num,distance:num}).optional(),
  done: z.boolean(),
  kind: z.enum(['work', 'warmup', 'drop']),
  rpe: z.number().min(0).max(10).default(0)
});
const exSchema = z.object({
  id: z.string(),
  exerciseId: z.string(),
  name: z.string().max(160),
  equipmentId: z.string().default(''),
  recording: recordingSettingsSchema.optional(),
  repMin: z.number().int().min(1).max(100).optional(),
  repMax: z.number().int().min(1).max(100).optional(),
  effortCap: z.number().min(5).max(9).optional(),
  note: z.string().max(2000).default(''),
  rest: num.default(90),
  superset: z.string().default(''),
  sets: z.array(setSchema).max(100)
});
const sessionSchema = z.object({
  id: z.string(),
  name: z.string().max(200),
  date: z.string().refine(v => !isNaN(Date.parse(v))),
  duration: num,
  exercises: z.array(exSchema).max(100),
  note: z.string().max(4000).default(''),
  gymId: z.string().default('main'),
  updatedAt: timestamp,
  deletedAt: timestamp.optional(),
  condition: z.string().max(100).default(''),
  startedAt: timestamp.optional(),
  pausedAt: timestamp.optional(),
  pausedMs: timestamp.optional()
});
const routineExSchema = z.object({
  exerciseId: z.string(),
  sets: z.number().int().min(1).max(30),
  reps: z.number().int().min(1).max(100),
  weight: num,
  rest: num,
  effortCap: z.number().min(5).max(9).optional(),
  repMax: num.default(12)
});
export const stateSchema = z.object({
  version: z.literal(4),
  sessions: z.array(sessionSchema).max(5000),
  draft: sessionSchema.nullable(),
  recoveredDrafts: z.array(sessionSchema).max(100).default([]),
  routines: z.array(z.object({
    id: z.string(),
    name: z.string().max(100),
    exercises: z.array(routineExSchema).max(100),
    updatedAt: timestamp,
    deletedAt: timestamp.optional()
  })).max(300),
  gyms: z.array(z.object({
    id: z.string(),
    name: z.string().max(100),
    equipment: z.array(z.object({
      id: z.string(),
      name: z.string().max(100),
      exerciseId: z.string(),
      setup: z.string().max(1000),
      step: z.number().min(.1).max(100),
      recording: recordingSettingsSchema.optional(),
      updatedAt: timestamp
    })).max(500),
    updatedAt: timestamp
  })).max(50),
  body: z.array(z.object({
    id: z.string(),
    date: z.string(),
    weight: num,
    fat: num.optional(),
    muscle: num.optional(),
    waist: num.optional(),
    updatedAt: timestamp,
    deletedAt: timestamp.optional()
  })).max(5000),
  profile: z.object({
    name: z.string().max(80),
    goalWeight: num.nullable(),
    weeklyTarget: z.number().int().min(1).max(7),
    sessionView: z.enum(['focus','all']).optional(),
    recordingPreferences: z.record(recordingSettingsSchema).optional(),
    gymId: z.string(),
    focus: z.array(z.string()),
    theme: z.enum(['dark', 'light']),
    weekPlan: z.record(z.string()),
    updatedAt: timestamp
  }),
  favorites: z.array(z.string()).max(1000),
  exerciseNotes: z.record(z.string().max(2000)),
  legacyArchive: z.unknown().optional()
});
export type AppState = z.infer<typeof stateSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type SetEntry = z.infer<typeof setSchema>;
export type SessionExercise = z.infer<typeof exSchema>;
export type Routine = AppState['routines'][number];
export type Muscle = 'chest' | 'front-deltoids' | 'back-deltoids' | 'biceps' | 'triceps' | 'forearm' | 'abs' | 'obliques' | 'trapezius' | 'upper-back' | 'lower-back' | 'gluteal' | 'quadriceps' | 'hamstring' | 'calves' | 'adductors';
export const MUSCLES: Record<string, string> = {
  chest: '대흉근',
  'front-deltoids': '전면 삼각근',
  'side-deltoids': '측면 삼각근',
  'back-deltoids': '후면 삼각근',
  biceps: '상완이두근',
  triceps: '상완삼두근',
  forearm: '전완근',
  abs: '복직근',
  obliques: '복사근',
  trapezius: '승모근',
  lats: '광배근',
  'upper-back': '능형근·등 상부',
  'lower-back': '척추기립근',
  gluteal: '둔근',
  quadriceps: '대퇴사두근',
  hamstring: '햄스트링',
  calves: '종아리',
  adductors: '내전근'
};
export const GROUPS = ['전체', '가슴', '등', '어깨', '팔', '하체', '코어', '유산소', '스트레칭'];
type Exercise = {
  id: string;
  name: string;
  group: string;
  equipment: string;
  type: 'weight' | 'bodyweight' | 'assisted' | 'time' | 'cardio';
  primary: string[];
  secondary: string[];
  primaryLabels: string[];
  secondaryLabels: string[];
  how: string;
  caution: string;
  step: number;
  unilateral: boolean;
};
function mappedMuscle(s: string): string {
  if (/후삼각|후면.*삼각/.test(s)) return 'back-deltoids';
  if (/측삼각|측면.*삼각/.test(s)) return 'side-deltoids';
  if (/삼각/.test(s)) return 'front-deltoids';
  if (/대흉|소흉|가슴/.test(s)) return 'chest';
  if (/삼두/.test(s)) return 'triceps';
  if (/상완이두|^이두|상완근/.test(s)) return 'biceps';
  if (/광배|대원/.test(s)) return 'lats';
  if (/능형/.test(s)) return 'upper-back';
  if (/승모/.test(s)) return 'trapezius';
  if (/기립|허리/.test(s)) return 'lower-back';
  if (/사두|대퇴.*직/.test(s)) return 'quadriceps';
  if (/햄|대퇴이두/.test(s)) return 'hamstring';
  if (/둔근/.test(s)) return 'gluteal';
  if (/내전/.test(s)) return 'adductors';
  if (/비복|가자미|종아리/.test(s)) return 'calves';
  if (/복사/.test(s)) return 'obliques';
  if (/복|코어/.test(s)) return 'abs';
  if (/전완|완요|손목/.test(s)) return 'forearm';
  return '';
}
const baseTargets: Record<string, string[]> = {
  '가슴': ['대흉근'],
  '등': ['광배근'],
  '어깨': ['삼각근'],
  '팔': ['상완이두근', '상완삼두근'],
  '하체': ['대퇴사두근', '둔근'],
  '코어': ['복직근']
};
export const EXERCISES: Exercise[] = Object.entries(legacy.EX).flatMap(([group, names]) => names.map(name => ({
  group,
  name
}))).filter((x, i, a) => a.findIndex(y => y.name === x.name) === i).map(({
  group: g,
  name
}, i) => {
  const group = g.startsWith('팔') || g === '전완/악력' ? '팔' : g.startsWith('하체') ? '하체' : /스트레칭|기능성/.test(g) ? '스트레칭' : g;
  const muscles = (legacy.EX_MUSCLES as Record<string, {
    primary: string[];
    secondary: string[];
  }>)[name];
  let primaryLabels = muscles?.primary || (g === '팔(이두)' ? ['상완이두근'] : g === '팔(삼두)' ? ['상완삼두근'] : g === '전완/악력' ? ['전완근'] : g === '하체(햄/둔근)' ? ['햄스트링', '둔근'] : g === '하체(종아리)' ? ['비복근', '가자미근'] : baseTargets[group] || []),
    secondaryLabels = muscles?.secondary || [];
  if (/레터럴|사이드 레이즈/.test(name) && !/리어|벤트오버|후면/.test(name)) {
    primaryLabels = ['측면 삼각근'];
    secondaryLabels = ['승모근'];
  }
  if (/리어.*플라이|리버스 펙|벤트오버.*레터럴|리어.*레이즈/.test(name)) {
    primaryLabels = ['후면 삼각근'];
    secondaryLabels = ['능형근', '승모근 중부'];
  }
  if (/인클라인.*프레스/.test(name) && group === '가슴') {
    primaryLabels = ['대흉근 쇄골부 (상부)'];
    secondaryLabels = ['전면 삼각근', '상완삼두근'];
  }
  if (/레그 컬|레그컬|노르딕|햄스트링 컬/.test(name)) {
    primaryLabels = ['햄스트링'];
    secondaryLabels = ['비복근'];
  }
  if (/레그 익스텐션/.test(name)) {
    primaryLabels = ['대퇴사두근'];
    secondaryLabels = [];
  }
  if (/힙 쓰러스트|힙 스러스트|글루트 브릿지|글루트 킥백/.test(name)) {
    primaryLabels = ['대둔근'];
    secondaryLabels = ['햄스트링'];
  }
  if (/힙 어브덕션/.test(name)) {
    primaryLabels = ['중둔근', '소둔근'];
    secondaryLabels = [];
  }
  if (/힙 어덕션/.test(name)) {
    primaryLabels = ['고관절 내전근'];
    secondaryLabels = [];
  }
  if (/슈러그|쉬러그/.test(name)) {
    primaryLabels = ['승모근 상부'];
    secondaryLabels = ['전완근'];
  }
  if (/프론트 레이즈/.test(name)) {
    primaryLabels = ['전면 삼각근'];
    secondaryLabels = ['대흉근 쇄골부'];
  }
  const fmt = (legacy.EX_FORMAT as Record<string, {
    type: string;
  }>)[name];
  let type = (fmt?.type || 'weight') as Exercise['type'];
  if (/어시스트|어시스티드/.test(name)) type = 'assisted';
  const equipment = /머신|펙 덱|프레스$|렛풀다운|랫풀다운|레그 컬/.test(name) && !/바벨|덤벨|케이블|프렌치/.test(name) ? '머신' : /덤벨/.test(name) ? '덤벨' : /바벨|이지바/.test(name) ? '바벨' : /케이블/.test(name) ? '케이블' : /밴드/.test(name) ? '밴드' : /케틀벨/.test(name) ? '케틀벨' : type === 'bodyweight' || type === 'time' ? '맨몸' : '기타';
  const guide = (legacy.EX_GUIDE as Record<string, {
    how: string;
    caution: string;
  }>)[name];
  return {
    id: 'ex-' + i,
    name,
    group,
    equipment,
    type,
    primary: [...new Set(primaryLabels.map(mappedMuscle).filter(Boolean))],
    secondary: [...new Set(secondaryLabels.map(mappedMuscle).filter(Boolean))].filter(x => !primaryLabels.map(mappedMuscle).includes(x)),
    primaryLabels,
    secondaryLabels,
    how: guide?.how || '기구의 축과 관절 위치를 맞추고, 제어 가능한 범위에서 천천히 반복하세요.',
    caution: guide?.caution || '목표 부위와 안정적인 자세를 확인하고 중량을 조절하세요.',
    step: equipment === '덤벨' ? 2 : 2.5,
    unilateral: /싱글|원암|원 암/.test(name)
  };
});
export const exercise = (id: string) => EXERCISES.find(x => x.id === id) || EXERCISES.find(x => x.name === id);
export const makeSet = (v: Partial<SetEntry> = {}): SetEntry => ({
  id: uid(),
  weight: 0,
  reps: 10,
  duration: 0,
  distance: 0,
  metrics: {},
  done: false,
  kind: 'work',
  rpe: 0,
  ...v
});
export function defaultState(): AppState {
  const now = Date.now();
  const presets = legacy.PRESET_ROUTINES.map((r, i) => ({
    id: 'routine-' + i,
    name: r.name,
    updatedAt: now,
    exercises: r.exercises.map(e => ({
      exerciseId: exercise(e.name)?.id || e.name,
      sets: e.sets || 3,
      reps: e.reps || 10,
      repMax: (e.reps || 10) + 2,
      weight: 0,
      rest: e.rest || 90
    }))
  }));
  return {
    version: 4,
    sessions: [],
    draft: null,
    recoveredDrafts: [],
    routines: presets,
    gyms: [{
      id: 'main',
      name: '내 헬스장',
      equipment: [],
      updatedAt: now
    }],
    body: [],
    profile: {
      name: '',
      goalWeight: null,
      weeklyTarget: 3,
      gymId: 'main',
      focus: ['가슴', '어깨'],
      theme: 'dark',
      weekPlan: {},
      updatedAt: now
    },
    favorites: [],
    exerciseNotes: {}
  };
}
export function day(date: string | number = Date.now()) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(date));
}
export function timeLabel(sec: number) {
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
}
export function parseTime(v: unknown): number {
  if (typeof v === 'number') return Math.max(0, v);
  if (typeof v !== 'string' || !v) return 0;
  const p = v.split(':').map(Number);
  return p.every(Number.isFinite) ? p.length === 2 ? p[0] * 60 + p[1] : Number(v) : 0;
}
export function oneRM(weight: number, reps: number) {
  return weight > 0 && reps > 0 && reps <= 12 ? reps === 1 ? weight : Math.round(weight * (1 + reps / 30) * 10) / 10 : 0;
}
export const liveSessions = (s: AppState) => s.sessions.filter(x => !x.deletedAt).sort((a, b) => b.date.localeCompare(a.date));
export function volume(s: Session) {
  return s.exercises.reduce((sum, e) => sum + e.sets.filter(x => x.done && x.kind !== 'warmup').reduce((n, x) => n + (['weight'].includes(exercise(e.exerciseId)?.type || 'weight') ? x.weight * x.reps : 0), 0), 0);
}
export const completedSets = (s: Session) => s.exercises.reduce((n, e) => n + e.sets.filter(x => x.done && x.kind !== 'warmup').length, 0);
export function elapsed(s: Session, now = Date.now()) {
  return s.startedAt ? Math.max(0, Math.floor(((s.pausedAt || now) - s.startedAt - (s.pausedMs || 0)) / 1000)) : s.duration;
}
export function latestSets(state: AppState, id: string, equipmentId = '') {
  for (const s of liveSessions(state).filter(s=>s.gymId===(state.draft?.gymId||state.profile.gymId)&&s.id!==state.draft?.id)) {
    const e = s.exercises.find(e => e.exerciseId === id && e.equipmentId === equipmentId);
    if (e?.sets.some(x => x.done && x.kind === 'work')) return e.sets.filter(x => x.done && x.kind === 'work');
  }
  return [];
}
export function recommendation(state: AppState, id: string, equipmentId = '', low = 8, high = 12, effortCap = 8) {
  const ex = exercise(id);
  const sets = latestSets(state, id, equipmentId);
  if (ex && ['time', 'cardio', 'bodyweight'].includes(ex.type)) return {
    weight: 0,
    reps: low,
    reason: '시간·횟수와 동작의 질을 기준으로 기록하세요',
    action: '동작에 집중'
  };
  if (!sets.length) return {
    weight: 0,
    reps: low,
    reason: '첫 기록 · 익숙한 중량으로 기준을 만들어보세요',
    action: '기준 만들기'
  };
  const last = sets[0];
  const step = recordingFor(state,{exerciseId:id,equipmentId}).weightStep;
  const allHit = sets.every(s => s.weight === sets[0].weight && s.reps >= high && s.rpe > 0 && s.rpe <= effortCap);
  const assisted = ex?.type === 'assisted';
  return allHit ? {
    weight: Math.max(0, Math.round((last.weight + (assisted ? -step : step)) * 1000000) / 1000000),
    reps: low,
    reason: `최근 ${sets.length}세트가 ${high}회 이상 · RPE ${effortCap} 이하. ${assisted ? '보조중량 감소' : '최소 단위 증량'} 후보예요.`,
    action: assisted ? '보조 줄이기' : '증량 제안'
  } : {
    weight: last.weight,
    reps: Math.min(high, Math.max(low, last.reps)),
    reason: sets.some(s => !s.rpe) ? '지난 중량 유지 · 운동 강도를 남기면 다음 제안이 더 정확해져요' : '지난 중량에서 목표 반복 범위를 채워보세요',
    action: '반복 쌓기'
  };
}
export function recordingFor(state:AppState, item:Pick<SessionExercise,'exerciseId'|'equipmentId'|'recording'>, gymId=state.draft?.gymId||state.profile.gymId):RecordingSettings {
  if(item.recording) return item.recording;
  const eq=state.gyms.find(g=>g.id===gymId)?.equipment.find(e=>e.id===item.equipmentId);
  return eq?.recording || (!item.equipmentId ? state.profile.recordingPreferences?.[`${gymId}/${item.exerciseId}`] : undefined) || defaultRecording(exercise(item.exerciseId)?.equipment==='덤벨',eq?.step||exercise(item.exerciseId)?.step||2.5);
}
export function historicalRecording(item:Pick<SessionExercise,'exerciseId'|'recording'>):RecordingSettings {
  return item.recording || defaultRecording(exercise(item.exerciseId)?.equipment==='덤벨');
}
export function preferredEquipment(state:AppState,exerciseId:string,gymId=state.profile.gymId):string {
  const available=state.gyms.find(g=>g.id===gymId)?.equipment.filter(e=>e.exerciseId===exerciseId)||[];
  for(const s of liveSessions(state).filter(s=>s.gymId===gymId)){
    const row=s.exercises.find(e=>e.exerciseId===exerciseId);
    if(row) return available.some(e=>e.id===row.equipmentId)?row.equipmentId:'';
  }
  return available.length===1?available[0].id:'';
}
/** Seed actual inputs from the last completed work sets for this exact gym/machine. */
export function previousSetInputs(state: AppState, exerciseId: string, equipmentId: string, count: number, fallback: Partial<SetEntry> = {}) {
  const previous = latestSets(state, exerciseId, equipmentId);
  const type = exercise(exerciseId)?.type;
  return Array.from({length:count}, (_, index) => {
    const before = previous[Math.min(index, previous.length - 1)];
    return makeSet({ ...fallback, ...(before && type !== 'cardio' ? {weight:before.weight,reps:before.reps,duration:type==='time'?before.duration:(fallback.duration||0)} : {}), done:false, rpe:0 });
  });
}
export function startSession(state: AppState, routine?: Routine): Session {
  const now = Date.now();
  return {
    id: uid(),
    name: routine?.name || '자유 운동',
    date: new Date(now).toISOString(),
    duration: 0,
    startedAt: now,
    pausedMs: 0,
    gymId: state.profile.gymId,
    condition: '',
    note: '',
    updatedAt: now,
    exercises: (routine?.exercises || []).map(e => {
      const x = exercise(e.exerciseId);
      const equipmentId=preferredEquipment(state,e.exerciseId);
      const recording=recordingFor(state,{exerciseId:e.exerciseId,equipmentId});
      return {
        id: uid(),
        exerciseId: e.exerciseId,
        name: x?.name || e.exerciseId,
        equipmentId,
        recording,
        repMin:e.reps,
        repMax:Math.max(e.reps,e.repMax),
        effortCap:e.effortCap||8,
        note: state.exerciseNotes[e.exerciseId] || '',
        rest: e.rest,
        superset: '',
        sets: previousSetInputs(state, e.exerciseId, equipmentId, e.sets, {
          weight: e.weight,
          reps: x?.type === 'cardio' ? 0 : e.reps,
          duration: x?.type === 'time' ? 30 : 0,
          metrics: x?.type === 'cardio' ? {...recording.defaults} : {}
        })
      };
    })
  };
}
export function mergeStates(a: AppState, b: AppState): AppState {
  const merge = <T extends {
    id: string;
    updatedAt: number;
  },>(x: T[], y: T[]) => {
    const m = new Map(x.map(v => [v.id, v]));
    for (const v of y) if (!m.has(v.id) || v.updatedAt > m.get(v.id)!.updatedAt) m.set(v.id, v);
    return [...m.values()];
  };
  const combineSession = (x: Session, y: Session): Session => {
    const newer = x.updatedAt >= y.updatedAt ? x : y, older = newer === x ? y : x;
    const exercises = new Map(newer.exercises.map(e => [e.id, structuredClone(e)]));
    for (const row of older.exercises) {
      const current = exercises.get(row.id);
      if (!current) { exercises.set(row.id, structuredClone(row)); continue; }
      const sets = new Map(current.sets.map(set => [set.id, set]));
      for (const set of row.sets) if (!sets.has(set.id) || (set.done && !sets.get(set.id)!.done)) sets.set(set.id, set);
      current.sets = [...sets.values()];
    }
    return {...newer, exercises:[...exercises.values()]};
  };
  const sessions = merge(a.sessions, b.sessions);
  for (const row of a.sessions) { const other=b.sessions.find(s=>s.id===row.id); if(other) sessions[sessions.findIndex(s=>s.id===row.id)]=combineSession(row,other); }
  let draft = a.draft && b.draft && a.draft.id === b.draft.id ? combineSession(a.draft,b.draft) : a.draft || b.draft;
  if (draft && sessions.some(s=>s.id===draft!.id)) {
    const i=sessions.findIndex(s=>s.id===draft!.id), finished=sessions[i];
    sessions[i]={...combineSession(draft,finished),duration:finished.duration};
    delete sessions[i].startedAt; delete sessions[i].pausedAt; delete sessions[i].pausedMs;
    draft=null;
  }
  const recoveredDrafts = merge(a.recoveredDrafts || [], b.recoveredDrafts || []);
  if (a.draft && b.draft && a.draft.id !== b.draft.id && !sessions.some(s=>s.id===b.draft!.id)) {
    const saved = {
      ...b.draft,
      id: 'recovery-' + b.draft.id + '-' + b.draft.updatedAt,
      name: '복구본 · ' + b.draft.name,
      duration: elapsed(b.draft)
    };
    delete saved.startedAt;
    delete saved.pausedAt;
    delete saved.pausedMs;
    if (!recoveredDrafts.some(x => x.id === saved.id)) recoveredDrafts.push(saved);
  }
  return {
    ...a,
    recoveredDrafts,
    sessions,
    routines: merge(a.routines, b.routines),
    gyms: merge(a.gyms, b.gyms),
    body: merge(a.body, b.body),
    profile: b.profile.updatedAt > a.profile.updatedAt ? b.profile : a.profile,
    favorites: [...new Set([...a.favorites, ...b.favorites])],
    exerciseNotes: {
      ...a.exerciseNotes,
      ...b.exerciseNotes
    },
    draft,
    legacyArchive: a.legacyArchive || b.legacyArchive
  };
}
export function legacyDuration(name: string, value: unknown) {
  if (typeof value === 'string' && value.includes(':')) return parseTime(value);
  const n = finite(value);
  return (legacy.EX_FORMAT as any)[name]?.units?.duration === '초' ? n : n * 60;
}
function finite(v: unknown, fallback = 0) {
  const x = Number(v);
  return Number.isFinite(x) && x >= 0 ? x : fallback;
}
export function migrate(input: unknown): AppState {
  if (!input || typeof input !== 'object') throw Error('운동 백업 파일이 아니에요.');
  const d = input as Record<string, any>;
  if (d.local && d.remote) return mergeStates(migrate(d.local), migrate(d.remote));
  if (d.version === 4) return stateSchema.parse(d);
  if (!Array.isArray(d.sessions)) throw Error('운동 기록 목록을 찾을 수 없어요.');
  const state = defaultState();
  const now = Date.now();
  state.legacyArchive = d;
  state.sessions = d.sessions.map((s: any, i: number) => {
    if (!Array.isArray(s.exercises) || isNaN(Date.parse(s.date))) throw Error(`${i + 1}번째 운동의 날짜 또는 종목 형식을 확인하세요.`);
    return {
      id: String(s.id || 'legacy-' + i + '-' + s.date),
      name: String(s.name || '이전 운동'),
      date: new Date(s.date).toISOString(),
      duration: Math.round(finite(s.duration) / 1000),
      gymId: 'main',
      note: String(s.notes || ''),
      condition: '',
      updatedAt: now,
      exercises: s.exercises.map((e: any, j: number) => {
        const ex = exercise(e.name);
        return {
          id: String(e.id || 'legacy-ex-' + j),
          exerciseId: ex?.id || String(e.name),
          name: String(e.name),
          equipmentId: '',
          note: '',
          rest: 90,
          superset: e.ssWithNext ? 'legacy-group' : '',
          sets: [...(e.warmupSets || []).map((x: any) => ({
            ...x,
            isWarmup: true
          })), ...(e.sets || [])].map((x: any) => makeSet({
            weight: finite(x.weight),
            reps: finite(x.reps),
            duration: legacyDuration(e.name, x.duration),
            distance: finite(x.distance) / ((legacy.EX_FORMAT as any)[e.name]?.units?.distance === 'm' ? 1000 : 1),
            metrics: legacyCardioMetrics(x),
            done: !!x.done,
            kind: x.isWarmup ? 'warmup' : x.isDrop ? 'drop' : 'work',
            rpe: Math.min(10, finite(x.rpe))
          }))
        };
      })
    };
  });
  state.body = [...(d.inbodyRecords || []).map((x: any) => ({
    id: String(x.id || 'legacy-body-' + x.date + '-' + x.weight),
    date: String(x.date).slice(0, 10),
    weight: finite(x.weight),
    fat: finite(x.bodyFat),
    muscle: finite(x.muscleMass || x.skeletalMuscle),
    updatedAt: now
  })), ...(d.weightLog || []).map((x: any) => ({
    id: 'legacy-weight-' + x.date + '-' + x.weight,
    date: String(x.date).slice(0, 10),
    weight: finite(x.weight),
    updatedAt: now
  }))];
  state.favorites = (d.favorites || []).map((n: string) => exercise(n)?.id || n);
  state.profile.goalWeight = finite(d.goals?.bodyWeight) || null;
  state.profile.weekPlan = d.weeklyPlan || {};
  if (Array.isArray(d.savedRoutines)) state.routines.push(...d.savedRoutines.map((r: any) => ({
    id: String(r.id || 'legacy-routine-' + (r.name || r.routineName || JSON.stringify(r))),
    name: String(r.name || r.routineName || '이전 루틴'),
    updatedAt: now,
    exercises: (r.exercises || []).map((e: any) => ({
      exerciseId: exercise(e.name)?.id || e.name,
      sets: Array.isArray(e.sets) ? e.sets.length : Math.max(1, finite(e.sets, 3)),
      reps: finite(e.reps, 10),
      repMax: finite(e.reps, 10) + 2,
      weight: finite(e.weight),
      rest: finite(e.restSeconds || e.rest, 90)
    }))
  })));
  return stateSchema.parse(state);
}
export const searchMatch = (name: string, query: string) => {
  const initials = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
  const key = [...name].map(c => {
    const n = c.charCodeAt(0) - 44032;
    return n >= 0 && n < 11172 ? initials[Math.floor(n / 588)] : c;
  }).join('');
  return name.toLowerCase().replaceAll(' ', '').includes(query.toLowerCase().replaceAll(' ', '')) || key.replaceAll(' ', '').includes(query.replaceAll(' ', ''));
};
