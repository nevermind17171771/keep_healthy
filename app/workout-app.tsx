'use client';
import ProgramLibrary, {RoutineReview} from '@/components/program-library';
import {importProgram} from '@/lib/programs';
import {alternatives} from '@/lib/program-data';

import { useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import { Activity, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BarChart3, BookOpen, CalendarDays, Check, CheckCheck, ChevronRight, Cloud, CloudOff, Copy, Download, Dumbbell, Flame, Heart, History, House, Info, Link2, Minus, MoreHorizontal, Pause, Play, Plus, RotateCcw, Save, Search, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, Star, Timer, Trash2, Upload, Video, Volume2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { NativeSelect } from '@/components/ui/native-select';
import { Progress } from '@/components/ui/progress';
import { Toaster, toast } from 'sonner';
import MuscleMap from '@/components/muscle-map';
import CardioSets from '@/components/cardio-sets';
import StrengthSets from '@/components/strength-sets';
import { useRestTimer } from '@/lib/use-rest-timer';
import FocusWorkout from '@/components/focus-workout';
import RecordingEditor from '@/components/recording-editor';
import { defaultRecording, weightText, displayedWeight, type RecordingSettings } from '@/lib/recording-settings';
import { previousWorkSets, loadPreviousTargets, chooseEquipment } from '@/lib/session-actions';
import { cardioSummary, nextCardioInterval, CARDIO_CSV_FIELDS } from '@/lib/cardio';
import { shortsSearchUrl } from '@/lib/exercise-video';
import { EXERCISES, GROUPS, MUSCLES, uid, day, timeLabel, parseTime, oneRM, volume, completedSets, elapsed, exercise, latestSets, recordingFor, historicalRecording, preferredEquipment, recommendation, startSession, previousSetInputs, makeSet, migrate, mergeStates, liveSessions, type AppState, type Session, type Routine, type SetEntry, type SessionExercise } from '@/lib/model';
import { useWorkout } from '@/lib/use-workout';
import { download } from '@/lib/cache';
const number = (v: number) => new Intl.NumberFormat('ko-KR', {
  maximumFractionDigits: 1
}).format(v);
const dateText = (v: string) => new Date(v).toLocaleDateString('ko-KR', {
  timeZone: 'Asia/Seoul',
  month: 'long',
  day: 'numeric',
  weekday: 'short'
});
const days = ['월', '화', '수', '목', '금', '토', '일'];
const weekKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const pill = (text: string) => <span className="pill">{text}</span>;
function Field({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return <label className="field"><span>{label}</span>{children}</label>;
}
function Empty({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return <div className="empty-state"><Dumbbell size={30} /><h3>{title}</h3><p>{description}</p>{action}</div>;
}
const LazyProgressChart = lazy(() => import('@/components/progress-chart'));
function ProgressChart(props: React.ComponentProps<typeof LazyProgressChart>) {
  return <Suspense fallback={<div className="chart-loading">차트를 준비하고 있어요.</div>}><LazyProgressChart {...props} /></Suspense>;
}
export default function WorkoutApp({
  initialPage = 'home'
}: {
  initialPage?: string;
} = {}) {
  const {
    state,
    ready,
    status,
    error,
    conflict,
    readOnly,
    needsLogin,
    change,
    sync,
    resolve
  } = useWorkout();
  const [page, setPage] = useState(initialPage),
    [modal, setModal] = useState(''),
    [query, setQuery] = useState(''),
    [group, setGroup] = useState('전체'),
    [gearFilter, setGearFilter] = useState('전체'),
    [favOnly, setFavOnly] = useState(false),
    [selected, setSelected] = useState(EXERCISES.find(e => e.name === '머신 체스트 프레스')!.id),
    [pickerFor, setPickerFor] = useState('session'),
    [swapId, setSwapId] = useState('');
  const [editRoutine, setEditRoutine] = useState<Routine | null>(null),
    [detailSession, setDetailSession] = useState<Session | null>(null),
    [importState, setImportState] = useState<AppState | null>(null),
    [confirm, setConfirm] = useState<{
      title: string;
      detail: string;
      action: () => void;
    } | null>(null),
    [now, setNow] = useState(Date.now()),
    [recordFilter, setRecordFilter] = useState(''),
    [statsEx, setStatsEx] = useState(''),
    [statsEquipment, setStatsEquipment] = useState(''),
    [shareSession, setShareSession] = useState<Session | null>(null),
    [backups, setBackups] = useState<{
      id: string;
      created: string;
    }[]>([]);
  const [recordingContext,setRecordingContext]=useState<{exerciseId:string;equipmentId:string;gymId:string;sessionId?:string}|null>(null);
  const [notesId, setNotesId] = useState(''),
    [quickText, setQuickText] = useState(''),
    [focusRoutine, setFocusRoutine] = useState(''),
    [updateReady, setUpdateReady] = useState<ServiceWorker | null>(null);
  const fileRef = useRef<HTMLInputElement>(null),
    wakeLock = useRef<any>(null);
  const sessions = useMemo(() => liveSessions(state), [state]),
    draft = state.draft,
    routines = state.routines.filter(r => !r.deletedAt),
    selectedEx = exercise(selected) || EXERCISES[0],
    activeGym = state.gyms.find(g => g.id === state.profile.gymId) || state.gyms[0];
  const todayKey = weekKeys[(new Date(day() + 'T12:00:00Z').getUTCDay() + 6) % 7];
  const plannedRest = !focusRoutine && Object.prototype.hasOwnProperty.call(state.profile.weekPlan,todayKey) && !state.profile.weekPlan[todayKey];
  const planned = plannedRest ? undefined : routines.find(r => r.id === (focusRoutine || state.profile.weekPlan[todayKey])) || routines.find(r => /Push|푸시|가슴/.test(r.name)) || routines[0];
  const plannedMuscles = [...new Set((draft?.exercises || planned?.exercises || []).flatMap(e => exercise(e.exerciseId)?.primary || []))];
  const plannedSecondary = [...new Set((draft?.exercises || planned?.exercises || []).flatMap(e => exercise(e.exerciseId)?.secondary || []))].filter(x => !plannedMuscles.includes(x));
  const weekStart = useMemo(() => {
      const d = new Date(day() + 'T12:00:00Z');
      d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7);
      return Date.parse(d.toISOString().slice(0, 10) + 'T00:00:00+09:00');
    }, []),
    weekSessions = sessions.filter(s => Date.parse(s.date) >= weekStart && Date.parse(s.date) < weekStart + 7 * 86400000),
    weekDays = new Set(weekSessions.map(s => day(s.date))).size;
  const recentBody = [...state.body].filter(b => !b.deletedAt).sort((a, b) => b.date.localeCompare(a.date));
  const matched = useMemo(() => EXERCISES.filter(e => (group === '전체' || e.group === group || e.primary.includes(group)) && (gearFilter === '전체' || e.equipment === gearFilter) && (!favOnly || state.favorites.includes(e.id)) && searchName(e.name, query)), [group, gearFilter, favOnly, query, state.favorites]);
  const {restEnd,restLength,restRemaining,start:rest,adjust:adjustRest,cancel:cancelRest,testSound,testNotification} = useRestTimer(draft?.id,ready);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = state.profile.theme;
  }, [state.profile.theme]);
  useEffect(() => {
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV === 'development') return;
    void navigator.serviceWorker.register('/sw.js').then(r => {
      if (r.waiting) setUpdateReady(r.waiting);
      r.addEventListener('updatefound', () => {
        const w = r.installing;
        w?.addEventListener('statechange', () => {
          if (w.state === 'installed' && navigator.serviceWorker.controller) setUpdateReady(w);
        });
      });
    }).catch(() => {});
  }, []);
  useEffect(() => {
    if (!draft) return;
    const keep = async () => {
      try {
        if (document.visibilityState === 'visible' && 'wakeLock' in navigator) wakeLock.current = await (navigator as any).wakeLock.request('screen');
      } catch {}
    };
    void keep();
    document.addEventListener('visibilitychange', keep);
    return () => {
      document.removeEventListener('visibilitychange', keep);
      void wakeLock.current?.release();
    };
  }, [!!draft]);
  function searchName(name: string, q: string) {
    const first = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
    const initial = [...name].map(c => {
      const k = c.charCodeAt(0) - 44032;
      return k >= 0 && k < 11172 ? first[Math.floor(k / 588)] : c;
    }).join('');
    return name.toLowerCase().replaceAll(' ', '').includes(q.toLowerCase().replaceAll(' ', '')) || initial.replaceAll(' ', '').includes(q.replaceAll(' ', ''));
  }
  const openPicker = (target = 'session', swap = '') => {
    setPickerFor(target);
    setSwapId(swap);
    setQuery('');
    setGroup('전체');
    setGearFilter('전체');
    setModal('picker');
  };
  const start = (r?: Routine, past = false) => {
    if (draft) {
      setPage('session');
      toast('진행 중인 운동을 이어가요.');
      return;
    }
    change(s => {
      s.draft = startSession(s, r);
      if (past) {
        delete s.draft.startedAt;
        s.draft.duration = 3600;
        s.draft.name = '과거 운동';
      }
    });
    cancelRest();
    setPage('session');
    setModal('');
  };
  function addExercise(id: string) {
    const ex = exercise(id);
    if (!ex) return;
    if (swapId&&draft?.exercises.find(e=>e.id===swapId)?.sets.some(s=>s.done))toast('완료한 기록은 남기고 대체 운동을 새 종목으로 추가해요.');
    if (pickerFor === 'routine' && page === 'routines') {
      setEditRoutine(r => r ? {
        ...r,
        exercises: [...r.exercises, {
          exerciseId: id,
          sets: 3,
          reps: 10,
          repMax: 12,
          weight: 0,
          rest: 90
        }]
      } : r);
      setModal('routine');
      return;
    }
    change(s => {
      if (!s.draft) s.draft = startSession(s);
      const equipmentId=preferredEquipment(s,id,s.draft.gymId);
      const recording=recordingFor(s,{exerciseId:id,equipmentId},s.draft.gymId);
      const item = {
        id: uid(),
        exerciseId: id,
        name: ex.name,
        equipmentId,
        recording,
        rest: 90,
        note: s.exerciseNotes[id] || '',
        superset: '',
        sets: previousSetInputs(s, id, equipmentId, ex.type === 'cardio' ? 1 : 3, {
          weight: 0,
          reps: ex.type === 'cardio' ? 0 : 10,
          duration: ex.type === 'time' ? 30 : 0,
          metrics: ex.type === 'cardio' ? {...recording.defaults} : {}
        })
      };
      const i = s.draft.exercises.findIndex(e => e.id === swapId);
      if (i >= 0 && !s.draft.exercises[i].sets.some(x=>x.done)) {const old=s.draft.exercises[i];Object.assign(item,{repMin:old.repMin,repMax:old.repMax,effortCap:old.effortCap,rest:old.rest});item.sets=previousSetInputs(s,id,equipmentId,old.sets.length,{reps:old.repMin||10});s.draft.exercises[i]=item;}else s.draft.exercises.push(item);
      s.draft.updatedAt = Date.now();
    });
    setSelected(id);
    setModal('');
    setPage('session');
    setSwapId('');
  }
  const changeDraft = (fn: (s: Session) => void) => change(s => {
    if (s.draft) {
      fn(s.draft);
      s.draft.updatedAt = Date.now();
    }
  });
  const patchSet=(eid:string,sid:string,patch:Partial<SetEntry>)=>changeDraft(s=>{const row=s.exercises.find(e=>e.id===eid)?.sets.find(x=>x.id===sid);if(row)Object.assign(row,patch);});
  function openRecording(item:SessionExercise){setRecordingContext({exerciseId:item.exerciseId,equipmentId:item.equipmentId,gymId:draft!.gymId,sessionId:item.id});setModal('recording');}
  function saveRecording(settings:RecordingSettings){if(!recordingContext)return;const c=recordingContext;const okay=change(s=>{
    if(c.equipmentId){const gym=s.gyms.find(g=>g.id===c.gymId),eq=gym?.equipment.find(e=>e.id===c.equipmentId);if(eq){eq.recording=settings;eq.updatedAt=Date.now();gym!.updatedAt=Date.now();}}
    else {s.profile.recordingPreferences||={};s.profile.recordingPreferences[`${c.gymId}/${c.exerciseId}`]=settings;s.profile.updatedAt=Date.now();}
    const row=s.draft?.exercises.find(e=>e.id===c.sessionId);if(row){row.recording=settings;s.draft!.updatedAt=Date.now();}
  });if(okay){setModal('');toast.success('입력 설정을 저장했어요. 다음 운동에도 적용돼요.');}}
  function selectEquipment(item:SessionExercise,id:string){
    if(item.sets.some(s=>s.done)){toast('완료한 세트가 있어요. 다른 기구는 운동을 새로 추가해서 기록해 주세요.');return;}
    const apply=()=>change(s=>{const row=s.draft?.exercises.find(e=>e.id===item.id);if(row&&chooseEquipment(s,row,id))s.draft!.updatedAt=Date.now();});
    if(item.sets.some(s=>s.weight||s.duration||s.distance||Object.keys(s.metrics||{}).length))setConfirm({title:'기구를 변경할까요?',detail:'선택한 기구의 지난 무게·횟수를 불러와요. 이전 기록이 없으면 기본값으로 시작해요.',action:apply});else apply();
  }
  function loadTargets(item:SessionExercise){const okay=change(s=>{const row=s.draft?.exercises.find(e=>e.id===item.id);if(row&&loadPreviousTargets(s,row))s.draft!.updatedAt=Date.now();});if(okay)toast.success('미완료 본세트에 목표를 표시했어요. 실제 수행값과 완료 여부는 직접 기록하세요.');}
  function addSet(item:SessionExercise){changeDraft(s=>{const row=s.exercises.find(e=>e.id===item.id)!;const prev=row.sets.at(-1);row.sets.push(makeSet({...(exercise(row.exerciseId)?.type==='cardio'?nextCardioInterval(prev):prev),id:uid(),done:false,rpe:0,kind:'work',target:undefined}));});}
  function toggleSet(eid: string, sid: string) {
    let seconds = 0;
    changeDraft(s => {
      const e = s.exercises.find(e => e.id === eid)!;
      const set = e.sets.find(x => x.id === sid)!;
      set.done = !set.done;
      if (set.done && exercise(e.exerciseId)?.type !== 'cardio') {
        const index = s.exercises.indexOf(e),
          next = s.exercises[index + 1];
        if (e.superset && next?.superset === e.superset) toast('슈퍼세트 · 다음 종목으로 이동하세요.');else seconds = e.rest;
      }
    });
    if (seconds) rest(seconds);
  }
  const updateSet = (eid: string, sid: string, key: keyof SetEntry, v: any) => changeDraft(s => {
    const set = s.exercises.find(e => e.id === eid)!.sets.find(x => x.id === sid)!;
    Object.assign(set, {
      [key]: v
    });
  });
  function finish() {
    if (!draft || !completedSets(draft)) {
      toast.error('완료한 본세트를 1개 이상 기록해 주세요.');
      return;
    }
    const saved = structuredClone(draft);
    for(const item of saved.exercises)item.recording ||= recordingFor(state,item,saved.gymId);
    saved.name = saved.name.trim() || '나의 운동';
    saved.duration = elapsed(saved);
    delete saved.startedAt;
    delete saved.pausedAt;
    delete saved.pausedMs;
    saved.updatedAt = Date.now();
    const okay = change(s => {
      const i = s.sessions.findIndex(x => x.id === saved.id);
      if (i >= 0) s.sessions[i] = saved;else s.sessions.push(saved);
      s.draft = null;
    });
    if (!okay) return;
    cancelRest();
    setModal('');
    setPage('home');
    setShareSession(saved);
    toast.success('오늘의 운동을 기록했어요.');
  }
  const exportJSON = () => {
    download(state, `keep-healthy-${day()}.json`);
    toast.success('백업 파일을 내보냈어요.');
  };
  function exportCSV() {
    const cell = (v: unknown) => '"' + String(v ?? '').replace(/^[=+@-]/, "'$&").replaceAll('"', '""') + '"';
    const rows = [['date', 'workout', 'exercise', 'equipment', 'set', 'type', 'weight_kg', 'reps', 'duration_seconds', 'distance_km', 'rpe', 'weight_display_value', 'weight_display_unit', 'weight_basis', 'incline_display_unit', ...CARDIO_CSV_FIELDS.map(f => f.header)], ...sessions.flatMap(s => s.exercises.flatMap(e => e.sets.filter(x => x.done).map((x, i) => [s.date, s.name, e.name, e.equipmentId, i + 1, x.kind, x.weight, x.reps, x.duration, x.distance, x.rpe, displayedWeight(x.weight,historicalRecording(e)), historicalRecording(e).weightUnit, historicalRecording(e).weightBasis, historicalRecording(e).inclineUnit, ...CARDIO_CSV_FIELDS.map(f => x.metrics?.[f.key] ?? '')])))];
    download('\uFEFF' + rows.map(r => r.map(cell).join(',')).join('\r\n'), `keep-healthy-${day()}.csv`, 'text/csv;charset=utf-8');
  }
  async function readImport(file?: File) {
    if (!file) return;
    if (file.size > 5000000) {
      toast.error('5MB 이하 JSON 백업 파일을 선택해 주세요.');
      return;
    }
    try {
      setImportState(migrate(JSON.parse(await file.text())));
      setModal('import');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '파일을 읽을 수 없어요.');
    }
  }
  function saveRoutine() {
    if (editRoutine?.exercises.some(e=>e.repMax<e.reps)){toast.error('최대 목표 횟수는 최소 목표 이상이어야 해요.');return;}
    if (!editRoutine?.name.trim() || !editRoutine.exercises.length) {
      toast.error('루틴 이름과 운동을 추가해 주세요.');
      return;
    }
    const okay = change(s => {
      const r = {
        ...editRoutine,
        name: editRoutine.name.trim(),
        updatedAt: Date.now()
      };
      const i = s.routines.findIndex(x => x.id === r.id);
      if (i < 0) s.routines.push(r);else s.routines[i] = r;
    });
    if (!okay) return;
    setModal('');
    toast.success('루틴을 저장했어요.');
  }
  function previewShare(s: Session) {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1440;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#121417';
    ctx.fillRect(0, 0, 1080, 1440);
    ctx.fillStyle = '#f06b58';
    ctx.fillRect(72, 92, 58, 8);
    ctx.font = '700 38px sans-serif';
    ctx.fillText('KEEP HEALTHY', 72, 172);
    ctx.fillStyle = '#f3f4f5';
    ctx.font = '700 94px sans-serif';
    ctx.fillText('오늘의 운동,', 72, 355);
    ctx.fillText('완료.', 72, 472);
    ctx.font = '500 40px sans-serif';
    ctx.fillStyle = '#a9b0ba';
    ctx.fillText(dateText(s.date), 72, 558);
    ctx.fillStyle = '#f06b58';
    ctx.font = '700 70px sans-serif';
    ctx.fillText(`${Math.round(s.duration / 60)}분  ·  ${completedSets(s)}세트`, 72, 730);
    ctx.font = '500 34px sans-serif';
    ctx.fillStyle = '#e0e3e7';
    s.exercises.filter(e => e.sets.some(x => x.done)).slice(0, 7).forEach((e, i) => ctx.fillText(e.name, 72, 850 + i * 55));
    ctx.fillStyle = '#7e8793';
    ctx.font = '26px sans-serif';
    ctx.fillText('A little stronger, every session.', 72, 1320);
    canvas.toBlob(b => {
      if (!b) return;
      const a = document.createElement('a');
      const url = URL.createObjectURL(b);
      a.href = url;
      a.download = `keep-healthy-${day(s.date)}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    });
  }
  function quickInput() {
    const ex = EXERCISES.find(e => quickText.includes(e.name));
    const kg = quickText.match(/([\d.]+)\s*(?:kg|킬로|키로)/i),
      reps = quickText.match(/(\d+)\s*회/),
      sets = quickText.match(/(\d+)\s*세트/);
    if (ex && ['time', 'cardio'].includes(ex.type)) {
      toast.error('시간·유산소 운동은 운동 추가에서 시간을 기록해 주세요.');
      return;
    }
    if (!ex || !reps) {
      toast.error('종목명과 횟수를 적어 주세요. 예: 머신 체스트 프레스 40kg 10회 3세트');
      return;
    }
    if (Number(sets?.[1] || 3) > 30) {
      toast.error('한 번에 30세트까지 입력할 수 있어요.');
      return;
    }
    change(s => {
      if (!s.draft) s.draft = startSession(s);
      s.draft.exercises.push({
        id: uid(),
        exerciseId: ex.id,
        name: ex.name,
        equipmentId: '',
        note: '',
        rest: 90,
        superset: '',
        sets: Array.from({
          length: Number(sets?.[1] || 3)
        }, () => makeSet({
          weight: Number(kg?.[1] || 0),
          reps: Number(reps[1])
        }))
      });
    });
    setModal('');
    setPage('session');
    toast('입력한 세트를 확인한 뒤 완료를 눌러 주세요.');
  }
  const sessionRow = (s: Session) => <button className="history-row" key={s.id} onClick={() => {
    setDetailSession(s);
    setModal('history');
  }}><div className="history-icon"><Dumbbell size={20} /></div><div><strong>{s.name}</strong><span>{dateText(s.date)} · {Math.round(s.duration / 60)}분 · {completedSets(s)}세트</span></div><div className="history-vol">{number(volume(s))}<small>kg</small></div><ChevronRight size={18} /></button>;
  const exRow = (e: typeof EXERCISES[number], pick = false) => <div className="exercise-row" key={e.id}><button className="exercise-main" onClick={() => {
      setSelected(e.id);
      if (page === 'library') {
        setPickerFor('session');
        setSwapId('');
      }
      setModal('exercise');
    }}><span className={'exercise-icon group-' + e.group}><Dumbbell size={19} /></span><span><strong>{e.name}</strong><small>{e.equipment} · {e.primaryLabels.slice(0, 2).join(' · ') || e.group}</small></span></button><button className={'icon-button ' + (state.favorites.includes(e.id) ? 'starred' : '')} aria-label={`${e.name} 즐겨찾기`} onClick={() => change(s => {
      s.favorites = s.favorites.includes(e.id) ? s.favorites.filter(x => x !== e.id) : [...s.favorites, e.id];
    })}><Star size={18} fill={state.favorites.includes(e.id) ? 'currentColor' : 'none'} /></button>{pick && <button className="icon-button add" aria-label={`${e.name} 추가`} onClick={() => addExercise(e.id)}><Plus size={20} /></button>}</div>;
  const navItems = [{
    id: 'home',
    name: '오늘',
    icon: House
  }, {
    id: 'history',
    name: '운동 기록',
    icon: History
  }, {
    id: 'routines',
    name: '루틴',
    icon: CalendarDays
  }, {
    id: 'library',
    name: '운동 사전',
    icon: BookOpen
  }, {
    id: 'analysis',
    name: '성장 분석',
    icon: BarChart3
  }];
  if (!ready) return <div className="boot"><div className="brand">KEEP<span>HEALTHY</span></div><h1>운동 기록을 불러오는 중</h1><p>기록과 루틴을 준비하고 있어요.</p></div>;
  if (readOnly) return <div className="boot"><div className="brand">KEEP<span>HEALTHY</span></div><h1>다른 창에서 운동을 기록 중이에요</h1><p>그 창을 닫고 이 화면으로 돌아오면 같은 운동을 이어서 기록할 수 있어요.</p><button className="secondary" onClick={()=>location.reload()}>이 창에서 다시 확인</button></div>;
  return <Tabs value={page} onValueChange={v => {
    setPage(v);
    setPickerFor('session');
    setSwapId('');
  }} className="app-shell"><Toaster richColors theme={state.profile.theme} position="top-center" /><input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={e => {
      void readImport(e.target.files?.[0]);
      e.target.value = '';
    }} />
 <aside className="sidebar"><button className="brand" onClick={() => setPage('home')}><span className="brand-mark"><Activity size={21} /></span><span className="brand-words">KEEP<br /><b>HEALTHY</b></span></button><p className="nav-label">MY TRAINING</p><TabsList className="side-nav">{navItems.map(n => <TabsTrigger value={n.id} key={n.id} className="nav-item"><n.icon size={20} /><span>{n.name}</span>{page === n.id && <i />}</TabsTrigger>)}</TabsList><div className="sidebar-bottom"><div className="weekly-mini"><Flame size={19} /><span>이번 주 <b>{weekDays}</b> / {state.profile.weeklyTarget}일</span></div><button className={'nav-item ' + (page === 'settings' ? 'selected' : '')} onClick={() => setPage('settings')}><Settings2 size={19} />설정·데이터</button><div className="identity"><span className="avatar">{state.profile.name?.[0] || 'K'}</span><div><strong>{state.profile.name || '나의 트레이닝'}</strong><small>KEEP HEALTHY · 4.0</small></div></div></div></aside>
 <div className="workspace"><header className="topbar"><span className="breadcrumb">나의 트레이닝 <ChevronRight size={14} /> {page === 'session' ? '진행 중' : navItems.find(n => n.id === page)?.name || '설정'}</span><div className="top-actions"><button className="sync-label" onClick={() => void sync()} aria-label="지금 동기화">{status === '동기화 완료' ? <Cloud size={15} /> : <CloudOff size={15} />}<span>{status}</span></button><button className="icon-button" aria-label="설정 열기" onClick={() => setPage('settings')}><Settings2 size={20} /></button></div></header>
 <main className="main-content">
 {readOnly && <div className="notice"><Info size={18}/><span>다른 창에서 운동을 기록 중이에요. 그 창을 닫고 이 화면으로 돌아오면 이어서 기록할 수 있어요.</span></div>}
 {!!restEnd && !!draft && (page !== 'session' || (state.profile.sessionView||'focus') !== 'focus') && <div className="rest-timer"><div className="rest-timer-main"><Timer size={22} /><div><small>{restRemaining ? '다음 세트까지' : '준비됐어요'}</small><strong>{timeLabel(restRemaining)}</strong></div><button aria-label="휴식 15초 줄이기" onClick={() => adjustRest(-15)}>−15</button><button aria-label="휴식 15초 늘리기" onClick={()=>adjustRest(15)}>+15</button><button className="text-button" onClick={() => cancelRest()}>건너뛰기</button><button className="icon-button" aria-label="휴식 닫기" onClick={() => cancelRest()}><X size={17} /></button></div><Progress value={restLength ? Math.min(100, restRemaining / restLength * 100) : 0} /></div>}
 {error && <div className="notice"><Info size={18} /><span>{error}</span>{conflict ? <button onClick={resolve}>백업 후 합치기</button> : needsLogin ? <a href="/signin-with-chatgpt?return_to=%2F" target="_top">로그인하고 이어하기</a> : <button onClick={() => void sync()}>다시 시도</button>}</div>}
 {updateReady && !draft && <div className="notice"><Sparkles size={18} /><span>새 버전이 준비됐어요.</span><button onClick={() => {
            updateReady.postMessage({
              type: 'ACTIVATE'
            });
            navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), {
              once: true
            });
          }}>업데이트</button></div>}
 {draft && page !== 'session' && <button className="resume-strip" onClick={() => setPage('session')}><span className="pulse" /><strong>{draft.name}</strong><span>{timeLabel(elapsed(draft, now))}</span><span>계속하기 <ArrowRight size={16} /></span></button>}
 {page === 'home' && <><div className="page-heading"><div><p className="eyebrow">{new Date().toLocaleDateString('ko-KR', {
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long',
                  timeZone: 'Asia/Seoul'
                })}</p><h1>오늘의 운동<span className="red-dot">.</span></h1><p className="subtext">오늘의 기록이 다음 운동의 기준이 되도록.</p></div><button className="secondary" onClick={() => start()}><Plus size={18} />자유 운동</button></div>
 <div className="dashboard-grid"><div className="dashboard-left"><section className="workout-feature"><div className="row between"><span className="kicker">MY NEXT SESSION</span><span className="outline-pill"><Dumbbell size={14} />{activeGym?.name}</span></div><h2>{draft?.name || planned?.name || (plannedRest?'오늘은 휴식일':'나만의 운동')}</h2><p>{draft ? '진행 중인 운동을 이어가세요.' : plannedRest ? '주간 계획의 휴식일이에요. 원하면 자유 운동을 기록할 수 있어요.' : `${planned?.exercises.length || 0}개 종목 · 중량은 내 기록에 맞춰`}</p><div className="focus-chips">{[...new Set((planned?.exercises || []).map(e => exercise(e.exerciseId)?.group))].filter(Boolean).slice(0, 4).map(g => <span key={g}>{g}</span>)}</div><div className="workout-feature-bottom"><button className="primary" onClick={() => draft ? setPage('session') : start(planned)}><Play size={18} fill="currentColor" />{draft ? '운동 이어하기' : plannedRest?'자유 운동 시작':'이 루틴으로 시작'}</button><button className="text-button" onClick={() => setPage('routines')}>루틴 변경 <ArrowRight size={16} /></button></div></section>
 <div className="stat-grid"><div className="stat-card"><span><CalendarDays size={16} />이번 주 운동</span><strong>{weekDays}<small> / {state.profile.weeklyTarget}일</small></strong><Progress value={Math.min(100, weekDays / state.profile.weeklyTarget * 100)} className="small-progress" /></div><div className="stat-card"><span><Dumbbell size={16} />이번 주 본세트</span><strong>{weekSessions.reduce((n, s) => n + completedSets(s), 0)}<small> 세트</small></strong><small>완료한 본세트 기준</small></div><div className="stat-card"><span><Activity size={16} />최근 체중</span><strong>{recentBody[0] ? number(recentBody[0].weight) : '—'}<small> kg</small></strong><button className="tiny-link" onClick={() => setModal('body')}>체중 기록 <Plus size={12} /></button></div></div>
 <section className="panel week-panel"><div className="section-title"><h3>이번 주의 흐름</h3><span>{weekDays}일 완료</span></div><div className="week-days">{days.map((d, i) => {
                    const t = day(weekStart + i * 86400000);
                    const done = sessions.some(s => day(s.date) === t);
                    return <button className={(t === day() ? 'today ' : '') + (done ? 'completed' : '')} key={d} onClick={() => {
                      setRecordFilter(t);
                      setPage('history');
                    }}><span>{d}</span><strong>{Number(t.slice(-2))}</strong><i>{done ? <Check size={13} /> : null}</i></button>;
                  })}</div></section>
 <section className="panel"><div className="section-title"><h3>최근 운동 기록</h3><button className="text-button" onClick={() => {
                    setRecordFilter('');
                    setPage('history');
                  }}>전체 보기 <ChevronRight size={15} /></button></div>{sessions.length ? sessions.slice(0, 3).map(sessionRow) : <Empty title="첫 기록을 기다리고 있어요" description="운동을 시작하거나, 이전 앱의 백업을 가져오세요." action={<button className="secondary" onClick={() => fileRef.current?.click()}><Upload size={16} />기존 기록 가져오기</button>} />}</section></div>
 <div className="dashboard-right"><section className="panel target-panel"><div className="section-title"><div><span className="kicker">MUSCLE FOCUS</span><h3>{draft ? '진행 중인 운동의 타겟' : '다음 루틴의 타겟'}</h3></div><button className="icon-button" aria-label="운동 사전 보기" onClick={() => setPage('library')}><ArrowUp className="rotate-arrow" size={20} /></button></div><MuscleMap primary={plannedMuscles} secondary={plannedSecondary} onSelect={m => {
                  setGroup(m);
                  setQuery('');
                  setPage('library');
                }} /><div className="target-labels">{plannedMuscles.slice(0, 5).map(m => <span key={m}>{MUSCLES[m]}</span>)}</div><p className="micro">부위를 누르면 해당 운동을 볼 수 있어요.</p></section><section className="insight-panel"><span className="insight-icon"><Sparkles size={20} /></span><div><h3>다음 세트의 기준</h3><p>{sessions.length ? '지난 기록과 RPE를 바탕으로 다음 중량을 제안해요. 운동 화면에서 확인하세요.' : '처음엔 익숙한 중량으로 시작하세요. 기록이 쌓이면 다음 운동의 기준이 생겨요.'}</p></div></section></div></div></>}
 {page === 'session' && draft && <><div className="page-heading"><div><p className="eyebrow">WORKOUT IN PROGRESS</p><h1>{draft.name}</h1><div className="session-meta"><Timer size={16} /><b>{timeLabel(elapsed(draft, now))}</b><span>· {completedSets(draft)}세트 완료</span><button className="icon-button" aria-label={draft.pausedAt ? '운동 재개' : '운동 일시정지'} onClick={() => changeDraft(s => {
                  if (!s.startedAt) return;
                  if (s.pausedAt) {
                    s.pausedMs = (s.pausedMs || 0) + Date.now() - s.pausedAt;
                    delete s.pausedAt;
                  } else s.pausedAt = Date.now();
                })}>{draft.pausedAt ? <Play size={18} /> : <Pause size={18} />}</button></div></div><button className="primary" onClick={() => setModal('finish')}><CheckCheck size={18} />운동 완료</button></div>
 <div className="workout-toolbar"><button className="secondary" onClick={() => openPicker()}><Plus size={17} />운동 추가</button><button className="secondary" onClick={() => setModal('quick')}><Sparkles size={17} />빠른 입력</button><button className="text-button danger" onClick={() => setConfirm({
              title: '진행 중인 운동을 취소할까요?',
              detail: '지금 입력한 운동은 백업 파일로 남긴 뒤 취소해요.',
              action: () => {
                download(draft, 'cancelled-workout.json');
                change(s => {
                  s.draft = null;
                });
                setPage('home');
                cancelRest();
              }
            })}>취소</button></div>
 {!draft.exercises.length && <Empty title="오늘 할 운동을 추가하세요" description="즐겨찾기나 초성 검색으로 빠르게 찾을 수 있어요." action={<button className="primary" onClick={() => openPicker()}><Plus size={18} />운동 선택</button>} />}
 <div className="session-view-switch"><Tabs value={state.profile.sessionView||'focus'} onValueChange={v=>change(s=>{s.profile.sessionView=v as 'focus'|'all';s.profile.updatedAt=Date.now();})}><TabsList><TabsTrigger value="focus">집중 화면</TabsTrigger><TabsTrigger value="all">전체 운동</TabsTrigger></TabsList></Tabs></div>
 {(state.profile.sessionView||'focus')==='focus'?<FocusWorkout state={state} session={draft} restRemaining={restRemaining} restActive={!!restEnd} onSkipRest={()=>cancelRest()} onExtendRest={()=>adjustRest(30)} onChange={patchSet} onComplete={toggleSet} onSettings={openRecording} onSwap={item=>openPicker('session',item.id)} onEquipment={selectEquipment} onTargets={loadTargets} onAddSet={addSet} onRest={(item,seconds)=>changeDraft(s=>{s.exercises.find(e=>e.id===item.id)!.rest=seconds;})} onNotes={item=>{setNotesId(item.id);setModal('notes');}}/>:<>
 <div className="session-layout"><div className="session-exercises">{draft.exercises.map((e, ei) => {
                const ex = exercise(e.exerciseId),
                  rec = recommendation(state, e.exerciseId, e.equipmentId,e.repMin||8,e.repMax||12,e.effortCap||8),
                  last = previousWorkSets(state,e).sets,
                  recording=recordingFor(state,e),
                  timed = ex?.type === 'time' || ex?.type === 'cardio',
                  eq = state.gyms.flatMap(g => g.equipment).find(x => x.id === e.equipmentId);
                return <section className="panel session-card" key={e.id}><div className="exercise-heading"><button onClick={() => {
                      if (!ex) {
                        toast('직접 추가한 운동은 타겟 근육이 지정되지 않았어요.');
                        return;
                      }
                      setSelected(e.exerciseId);
                      setPickerFor('session');
                      setSwapId('');
                      setModal('exercise');
                    }}><span className="exercise-number">{String(ei + 1).padStart(2, '0')}</span><div><h3>{e.name}</h3><p>{ex?.primaryLabels.join(' · ') || '직접 추가한 운동'}</p></div></button><button className="icon-button" aria-label={`${e.name} 교체`} onClick={() => openPicker('session', e.id)}><RotateCcw size={17} /></button></div>
 <div className="exercise-subbar"><NativeSelect aria-label={`${e.name} 기구`} value={e.equipmentId} onChange={ev => selectEquipment(e,ev.target.value)}><option value="">기본 기록</option>{(state.gyms.find(g => g.id === draft.gymId) || activeGym)?.equipment.filter(x => x.exerciseId === e.exerciseId).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</NativeSelect><button className="text-button" onClick={()=>openRecording(e)}>입력 설정</button><button className="text-button" onClick={() => {
                      setNotesId(e.id);
                      setModal('notes');
                    }}>메모{e.note ? ' •' : ''}</button><a className="text-button video-link" href={shortsSearchUrl(e.name)} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" aria-label={`${e.name} 유튜브 쇼츠 검색 (새 탭)`}><Video size={15} />쇼츠 검색</a>{ex?.type !== 'cardio' && <button className="text-button" onClick={() => changeDraft(s => {
                      s.exercises[ei].sets.unshift(makeSet({
                        weight: Math.round((e.sets.find(x => x.kind === 'work')?.weight || 0) * .5 / 2.5) * 2.5,
                        reps: 10,
                        kind: 'warmup'
                      }));
                    })}>+ 워밍업</button>}</div>
 {eq?.setup && <div className="equipment-note"><SlidersHorizontal size={14} />{eq.setup}</div>}{e.note && <p className="exercise-note">{e.note}</p>}
 {!timed && <div className="recommendation"><Sparkles size={14} /><span><b>{rec.action}</b> {rec.weight > 0 ? `${weightText(rec.weight,recording)} · ${rec.reps}회` : rec.reason}</span><button aria-label="추천 이유" className="icon-button" onClick={() => toast(rec.reason)}><Info size={14} /></button>{rec.weight > 0 && <button onClick={() => changeDraft(s => {
                      s.exercises[ei].sets.forEach(x => {
                        if (!x.done && x.kind === 'work') {
                          x.weight = rec.weight;
                          x.reps = rec.reps;
                        }
                      });
                    })}>적용</button>}</div>}
 {ex?.type === 'cardio' ? <CardioSets name={e.name} sets={e.sets} recording={recording} onChange={(id, patch) => changeDraft(s => {
                    const set = s.exercises.find(x => x.id === e.id)!.sets.find(x => x.id === id)!;
                    Object.assign(set, patch);
                  })} onComplete={id => toggleSet(e.id, id)} /> : <StrengthSets name={e.name} type={ex?.type} sets={e.sets} previous={last} recording={recording} onChange={(id,p)=>patchSet(e.id,id,p)} onComplete={id=>toggleSet(e.id,id)}/>}
 {last.length > 0 && <button className="text-button target-load" onClick={()=>loadTargets(e)}>지난 세트를 오늘 목표로</button>}
 {last.length > 0 && <details className="last-record"><summary>지난 기록 보기</summary><p>{last.map(s => ex?.type === 'cardio' ? cardioSummary(e.name, s,recording) : ex?.type === 'time' ? timeLabel(s.duration) : `${weightText(s.weight,recording)} × ${s.reps}회`).join(' / ')}</p></details>}
 <div className="set-footer"><button onClick={() => changeDraft(s => {
                      const prev = s.exercises[ei].sets.at(-1);
                      s.exercises[ei].sets.push(makeSet({
                        ...(ex?.type === 'cardio' ? nextCardioInterval(prev) : prev),
                        target:undefined,
                        rpe:0,
                        id: uid(),
                        done: false,
                        kind: 'work'
                      }));
                    })}><Plus size={15} />{ex?.type === 'cardio' ? '구간 추가' : '세트'}</button>{ex?.type !== 'cardio' && <button onClick={() => changeDraft(s => {
                      const last = s.exercises[ei].sets.at(-1);
                      s.exercises[ei].sets.push(makeSet({
                        weight: Math.round((last?.weight || 0) * .8 / 2.5) * 2.5,
                        reps: last?.reps || 10,
                        kind: 'drop'
                      }));
                    })}>드롭</button>}<button onClick={() => changeDraft(s => {
                      if (s.exercises[ei].sets.length > 1) s.exercises[ei].sets.pop();
                    })}>{ex?.type === 'cardio' ? '마지막 구간 삭제' : '마지막 세트 삭제'}</button><span className="spacer" /><button aria-label={`${e.name} 위로`} disabled={ei === 0} onClick={() => changeDraft(s => {
                      [s.exercises[ei - 1], s.exercises[ei]] = [s.exercises[ei], s.exercises[ei - 1]];
                    })}><ArrowUp size={15} /></button><button aria-label={`${e.name} 삭제`} onClick={() => setConfirm({
                      title: '이 운동을 삭제할까요?',
                      detail: '이번 세션에서만 제외돼요.',
                      action: () => changeDraft(s => {
                        s.exercises.splice(ei, 1);
                      })
                    })}><Trash2 size={15} /></button></div>
 {ex?.type !== 'cardio' && <div className="rest-options"><Timer size={14} /><NativeSelect aria-label={`${e.name} 휴식 시간`} value={e.rest} onChange={ev => changeDraft(s => {
                      s.exercises[ei].rest = Number(ev.target.value);
                    })}>{[30, 45, 60, 90, 120, 150, 180, 240, 300].map(t => <option key={t} value={t}>{timeLabel(t)} 휴식</option>)}</NativeSelect>{ei < draft.exercises.length - 1 && <button className={e.superset ? 'linked' : ''} onClick={() => changeDraft(s => {
                      const key = s.exercises[ei].superset ? '' : uid();
                      s.exercises[ei].superset = key;
                      s.exercises[ei + 1].superset = key;
                    })}><Link2 size={14} />{e.superset ? '슈퍼세트 연결됨' : '다음 종목과 슈퍼세트'}</button>}</div>}</section>;
              })}<button className="add-workout" onClick={() => openPicker()}><Plus size={19} />운동 추가</button></div><aside className="session-side"><section className="panel"><div className="section-title"><h3>오늘의 타겟</h3><span>{draft.exercises.length}개 종목</span></div><MuscleMap primary={plannedMuscles} secondary={plannedSecondary} compact /><div className="target-labels">{plannedMuscles.map(m => <span key={m}>{MUSCLES[m]}</span>)}</div></section><section className="panel"><h3>오늘의 컨디션</h3><div className="condition-buttons">{['가벼움', '보통', '피곤함'].map(c => <button className={draft.condition === c ? 'selected' : ''} onClick={() => changeDraft(s => {
                    s.condition = c;
                  })} key={c}>{c}</button>)}</div><p className="micro">RPE 7: 약 3회, 8: 약 2회, 9: 약 1회 더 할 수 있는 느낌. 선택 입력이에요.</p></section></aside></div></>}</>}
 {page === 'history' && <><div className="page-heading"><div><p className="eyebrow">YOUR TRAINING LOG</p><h1>쌓여가는 기록<span className="red-dot">.</span></h1><p className="subtext">총 {sessions.length}번의 운동. 하나씩, 꾸준하게.</p></div><button className="primary" onClick={() => start(undefined, true)}><Plus size={18} />과거 운동 기록</button></div><div className="filter-row"><input type="date" aria-label="운동 날짜 필터" value={recordFilter} onChange={e => setRecordFilter(e.target.value)} />{recordFilter && <button className="text-button" onClick={() => setRecordFilter('')}>전체 보기</button>}<span className="spacer" /><button className="secondary" onClick={exportCSV}><Download size={16} />CSV</button></div><section className="panel">{sessions.filter(s => !recordFilter || day(s.date) === recordFilter).length ? sessions.filter(s => !recordFilter || day(s.date) === recordFilter).map(sessionRow) : <Empty title="아직 기록이 없어요" description="선택한 날짜의 운동을 추가하거나 전체 기록을 확인하세요." />}</section></>}
 {page === 'routines' && <><div className="page-heading"><div><p className="eyebrow">BUILD YOUR CONSISTENCY</p><h1>나의 루틴<span className="red-dot">.</span></h1><p className="subtext">내 시간과 운동 환경에 맞게 조절하세요.</p></div><button className="primary" onClick={() => {
              setEditRoutine({
                id: uid(),
                name: '',
                exercises: [],
                updatedAt: Date.now()
              });
              setModal('routine');
            }}><Plus size={18} />루틴 만들기</button></div><ProgramLibrary onImport={(rs,week,schedule)=>{let imported=false;const okay=change(s=>{imported=importProgram(s,rs,week,schedule);});if(okay&&imported){if(schedule)setFocusRoutine('');toast.success('새 프로그램을 루틴에 추가했어요.');return true;}toast('이미 추가한 구성은 내 루틴에서 편집하세요.');return false;}}/><section className="panel"><div className="section-title"><h3>주간 계획</h3><span>요일에 루틴을 연결하세요</span></div><div className="planner">{days.map((d, i) => <div key={d}><strong>{d}</strong><NativeSelect aria-label={`${d}요일 루틴`} value={state.profile.weekPlan[weekKeys[i]] || ''} onChange={e => change(s => {
                  s.profile.weekPlan[weekKeys[i]] = e.target.value;
                  s.profile.updatedAt = Date.now();
                })}><option value="">휴식 / 자유</option>{routines.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</NativeSelect></div>)}</div></section><div className="routine-grid">{routines.map((r, i) => <section className="panel routine-card" key={r.id}><div className="row between"><span className="routine-index">{String(i + 1).padStart(2, '0')}</span><button className="icon-button" aria-label={`${r.name} 편집`} onClick={() => {
                  setEditRoutine(structuredClone(r));
                  setModal('routine');
                }}><Settings2 size={18} /></button></div><h2>{r.name}</h2><p>{r.exercises.length}개 종목 · {r.exercises.reduce((n, e) => n + e.sets, 0)}세트</p><div className="routine-exercises">{r.exercises.slice(0, 4).map((e, j) => <div key={j}><span>{exercise(e.exerciseId)?.name || e.exerciseId}</span><b>{e.sets} × {e.reps}–{Math.max(e.reps,e.repMax)}</b></div>)}{r.exercises.length > 4 && <small>+ {r.exercises.length - 4}개 종목</small>}</div><div className="row"><button className="secondary" onClick={() => {
                  setFocusRoutine(r.id);
                  setPage('home');
                }}>다음 운동으로</button><button className="primary" onClick={() => start(r)}><Play size={15} />시작</button></div></section>)}</div></>}
 {page === 'library' && <><div className="page-heading"><div><p className="eyebrow">KNOW YOUR MOVEMENT</p><h1>운동 사전<span className="red-dot">.</span></h1><p className="subtext">{EXERCISES.length}개 종목. 어디를 움직이는지, 어떻게 기록할지.</p></div><button className="secondary" onClick={() => {
              setPickerFor('session');
              setModal('custom');
            }}><Plus size={17} />직접 추가</button></div><div className="search-box"><Search size={20} /><input placeholder="운동 이름 또는 초성으로 검색" aria-label="운동 검색" value={query} onChange={e => setQuery(e.target.value)} /><button className={favOnly ? 'starred' : ''} aria-label="즐겨찾기만 보기" onClick={() => setFavOnly(!favOnly)}><Star size={20} /></button></div><div className="filter-row"><div className="filter-chips">{GROUPS.map(g => <button key={g} className={group === g ? 'selected' : ''} onClick={() => setGroup(g)}>{g}</button>)}{!GROUPS.includes(group) && <button className="selected" onClick={() => setGroup('전체')}>{MUSCLES[group]} ×</button>}</div><NativeSelect aria-label="장비 필터" value={gearFilter} onChange={e => setGearFilter(e.target.value)}>{['전체', '머신', '덤벨', '바벨', '케이블', '맨몸', '밴드', '기타'].map(v => <option key={v}>{v}</option>)}</NativeSelect></div><div className="library-layout"><section className="panel exercise-list"><div className="section-title"><span>{matched.length}개 운동</span><span>종목을 눌러 타겟 확인</span></div>{matched.slice(0, 80).map(e => exRow(e, true))}{matched.length > 80 && <p className="micro">검색하거나 부위를 선택하면 더 빠르게 찾을 수 있어요.</p>}{!matched.length && <Empty title="검색 결과가 없어요" description="다른 이름이나 초성으로 검색해 보세요." />}</section><aside className="panel library-anatomy"><div className="section-title"><h3>근육으로 찾기</h3></div><MuscleMap primary={group === '전체' ? [] : [group]} onSelect={setGroup} /><p className="micro">근육 지도를 누르면 관련 종목을 찾을 수 있어요.</p><div className="target-labels">{Object.entries(MUSCLES).map(([id, label]) => <button className={group === id ? 'selected' : ''} onClick={() => setGroup(id)} key={id}>{label}</button>)}</div></aside></div></>}
 {page === 'analysis' && <><div className="page-heading"><div><p className="eyebrow">A LITTLE STRONGER</p><h1>기록으로 보는 성장<span className="red-dot">.</span></h1><p className="subtext">어제의 나와 비교하고, 다음 운동을 준비하세요.</p></div><button className="primary" onClick={() => setModal('body')}><Plus size={18} />신체 기록</button></div><div className="stat-grid"><section className="stat-card"><span>누적 운동</span><strong>{sessions.length}<small>회</small></strong></section><section className="stat-card"><span>누적 본세트</span><strong>{number(sessions.reduce((n, s) => n + completedSets(s), 0))}<small>세트</small></strong></section><section className="stat-card"><span>운동 시간</span><strong>{number(sessions.reduce((n, s) => n + s.duration, 0) / 3600)}<small>시간</small></strong></section></div><div className="analysis-grid"><section className="panel"><div className="section-title"><h3>최근 8주 운동량</h3><span>완료한 본세트</span></div><ProgressChart data={Array.from({
                length: 8
              }, (_, i) => {
                const from = weekStart - (7 - i) * 7 * 86400000;
                return {
                  label: day(from).slice(5),
                  value: sessions.filter(s => Date.parse(s.date) >= from && Date.parse(s.date) < from + 7 * 86400000).reduce((n, s) => n + completedSets(s), 0)
                };
              })} /></section><section className="panel"><div className="section-title"><h3>이번 주 부위별 본세트</h3><span>주동근 기준</span></div><div className="muscle-bars">{Object.entries(MUSCLES).map(([id, label]) => ({
                  id,
                  label,
                  count: weekSessions.reduce((n, s) => n + s.exercises.filter(e => exercise(e.exerciseId)?.primary.includes(id)).reduce((n, e) => n + e.sets.filter(x => x.done && x.kind !== 'warmup').length, 0), 0)
                })).filter(x => x.count).sort((a, b) => b.count - a.count).slice(0, 7).map(x => <div key={x.id}><span>{x.label}</span><Progress value={Math.min(100, x.count / 30 * 100)} /><b>{x.count}</b></div>)}</div>{!weekSessions.length && <Empty title="이번 주 기록을 기다리고 있어요" description="완료한 운동의 주동근별 세트 수를 보여드려요." />}<p className="micro">복합 운동은 여러 주동근에 포함돼요. 이 값은 근육별 실제 자극량이나 회복도를 뜻하지 않아요.</p></section><section className="panel"><div className="section-title"><h3>종목별 기록 추이</h3><span>추정 1RM · kg</span></div><NativeSelect aria-label="분석할 운동" value={statsEx} onChange={e => {
                setStatsEx(e.target.value);
                setStatsEquipment('');
              }}><option value="">종목 선택</option>{[...new Set(sessions.flatMap(s => s.exercises.map(e => e.exerciseId)))].filter(id => exercise(id)?.type === 'weight').map(id => <option key={id} value={id}>{exercise(id)?.name || id}</option>)}</NativeSelect>{statsEx ? <><Field label="기구별 비교"><NativeSelect aria-label="분석 기구" value={statsEquipment} onChange={e => setStatsEquipment(e.target.value)}><option value="">기본 기록</option>{[...new Set(sessions.flatMap(s => s.exercises.filter(e => e.exerciseId === statsEx && e.equipmentId).map(e => e.equipmentId)))].map(id => <option key={id} value={id}>{state.gyms.flatMap(g => g.equipment).find(e => e.id === id)?.name || id}</option>)}</NativeSelect></Field><ProgressChart line data={[...sessions].reverse().filter(s => s.exercises.some(e => e.exerciseId === statsEx)).slice(-20).map(s => ({
                  label: day(s.date).slice(5),
                  value: Math.max(0, ...s.exercises.filter(e => e.exerciseId === statsEx && e.equipmentId === statsEquipment).flatMap(e => e.sets.filter(x => x.done && x.kind === 'work').map(x => oneRM(x.weight, x.reps))))
                })).filter(x => x.value > 0)} /><p className="micro">1~12회 본세트의 Epley 추정치예요. 기구별 저항과 가동범위가 다르면 직접 비교하기 어려워요. 1RM은 실제 최대 중량을 보장하지 않아요.</p></> : <Empty title="어떤 운동이 늘었을까요?" description="기록한 중량 운동을 선택하면 변화를 확인할 수 있어요." />}</section><section className="panel"><div className="section-title"><h3>몸의 변화</h3><button className="text-button" onClick={() => setModal('body')}>기록하기 <Plus size={15} /></button></div>{recentBody.length ? <><div className="body-summary"><strong>{number(recentBody[0].weight)}<small>kg</small></strong><span>{recentBody[0].date} 측정{state.profile.goalWeight ? ` · 목표 ${state.profile.goalWeight}kg` : ''}</span></div><ProgressChart line color="#94b8a3" data={[...recentBody].reverse().slice(-30).map(b => ({
                  label: b.date.slice(5),
                  value: b.weight
                }))} /><details><summary>신체 기록 전체 보기 ({recentBody.length})</summary>{recentBody.map(b => <div className="body-row" key={b.id}><span>{b.date}</span><b>{b.weight}kg</b><small>{b.fat ? `체지방 ${b.fat}%` : ''}{b.muscle ? ` · 골격근 ${b.muscle}kg` : ''}</small><button className="icon-button" aria-label={`${b.date} 신체 기록 삭제`} onClick={() => setConfirm({
                      title: '신체 기록을 삭제할까요?',
                      detail: '삭제 전 전체 기록을 파일로 백업해요.',
                      action: () => {
                        exportJSON();
                        change(s => {
                          const x = s.body.find(x => x.id === b.id)!;
                          x.deletedAt = Date.now();
                          x.updatedAt = Date.now();
                        });
                      }
                    })}><Trash2 size={14} /></button></div>)}</details></> : <Empty title="변화의 기준점을 남겨보세요" description="실제 측정한 체중·체지방률·골격근량을 기록해요. 목표 체중은 별도로 관리해요." action={<button className="secondary" onClick={() => setModal('body')}>첫 신체 기록</button>} />}</section></div></>}
 {page === 'settings' && <><div className="page-heading"><div><p className="eyebrow">MAKE IT YOURS</p><h1>나에게 맞게<span className="red-dot">.</span></h1><p className="subtext">운동 환경과 기록을 관리하세요.</p></div></div><div className="settings-grid"><section className="panel"><h3>프로필과 목표</h3><Field label="이름"><input value={state.profile.name} maxLength={80} placeholder="이름 또는 닉네임" onChange={e => change(s => {
                  s.profile.name = e.target.value;
                  s.profile.updatedAt = Date.now();
                })} /></Field><div className="form-grid"><Field label="주간 운동 목표"><NativeSelect value={state.profile.weeklyTarget} onChange={e => change(s => {
                    s.profile.weeklyTarget = Number(e.target.value);
                    s.profile.updatedAt = Date.now();
                  })}>{[1, 2, 3, 4, 5, 6, 7].map(v => <option key={v} value={v}>주 {v}일</option>)}</NativeSelect></Field><Field label="목표 체중 (kg)"><input type="number" min="20" max="400" step="0.1" placeholder="선택 입력" value={state.profile.goalWeight ?? ''} onChange={e => change(s => {
                    s.profile.goalWeight = e.target.value ? Number(e.target.value) : null;
                    s.profile.updatedAt = Date.now();
                  })} /></Field></div><Field label="화면 테마"><NativeSelect value={state.profile.theme} onChange={e => change(s => {
                  s.profile.theme = e.target.value as 'dark' | 'light';
                  s.profile.updatedAt = Date.now();
                })}><option value="dark">다크</option><option value="light">라이트</option></NativeSelect></Field><p className="micro">목표 체중은 실제 측정 기록에 반영되지 않아요.</p></section><section className="panel"><div className="section-title"><h3>내 헬스장과 기구</h3><button className="text-button" onClick={() => setModal('gym')}><Plus size={15} />헬스장</button></div><Field label="현재 운동 장소"><NativeSelect value={state.profile.gymId} onChange={e => change(s => {
                  s.profile.gymId = e.target.value;
                  s.profile.updatedAt = Date.now();
                })}>{state.gyms.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</NativeSelect></Field><p className="micro">같은 운동도 기구마다 무게가 다를 수 있어요. 기구를 등록하고 좌석 번호·그립·최소 중량 단위를 남기세요.</p>{activeGym?.equipment.map(e => <div className="equipment-row" key={e.id}><Dumbbell size={18} /><div><strong>{e.name}</strong><small>{exercise(e.exerciseId)?.name}</small><p>{e.setup}</p></div><button className="secondary" onClick={()=>{setRecordingContext({exerciseId:e.exerciseId,equipmentId:e.id,gymId:activeGym!.id});setModal('recording');}}>입력 설정</button></div>)}<button className="secondary full" onClick={() => setModal('equipment')}><Plus size={16} />기구 등록</button></section><section className="panel"><div className="section-title"><h3>데이터와 백업</h3><ShieldCheck size={20} /></div><p className="subtext">이 기기의 임시 저장본과 계정의 저장본을 함께 관리해요. 다른 기기의 변경과 충돌하면 백업 후 합칠 수 있어요.</p><div className="backup-actions"><button className="secondary" onClick={exportJSON}><Download size={18} />JSON 백업</button><button className="secondary" onClick={() => fileRef.current?.click()}><Upload size={18} />기록 가져오기</button><button className="secondary" onClick={exportCSV}><Download size={18} />CSV 내보내기</button><button className="secondary" onClick={() => void sync()}><Cloud size={18} />지금 동기화</button></div><p className="micro">기존 앱의 설정 → JSON 백업 파일을 가져오세요. 원본 내용도 함께 보관하고 중복된 운동 ID는 합쳐요.</p>{needsLogin && <a className="primary" href="/signin-with-chatgpt?return_to=%2F" target="_top">로그인하고 동기화</a>}<button className="text-button" onClick={async () => {
                try {
                  const r = await fetch('/api/sync?backups=1', {
                    cache: 'no-store'
                  });
                  if (!r.ok) throw Error();
                  const data = (await r.json()) as any;
                  setBackups(data.backups || []);
                  toast(data.backups?.length ? '백업 목록을 불러왔어요.' : '아직 자동 백업이 없어요. 하루 첫 변경 전 저장본이 보관돼요.');
                } catch {
                  toast.error('백업 목록을 불러오지 못했어요. 연결과 로그인을 확인하세요.');
                }
              }}><History size={16} />자동 백업 확인</button>{backups.map(b => <div className="body-row" key={b.id}><span>{new Date(b.created).toLocaleString('ko-KR')}</span><button className="text-button" onClick={async () => {
                  try {
                    const r = await fetch('/api/sync?restore=' + encodeURIComponent(b.id), {
                      cache: 'no-store'
                    });
                    if (!r.ok) throw Error();
                    const data = (await r.json()) as any;
                    setImportState(migrate(data.state));
                    setModal('import');
                  } catch {
                    toast.error('백업을 읽지 못했어요.');
                  }
                }}>가져오기</button></div>)}<details className="trash-list"><summary>충돌로 보관된 운동 ({state.recoveredDrafts.length})</summary>{state.recoveredDrafts.map(r => <div className="body-row" key={r.id}><span>{r.name}</span><button className="text-button" onClick={() => {
                    if (draft) {
                      toast('먼저 진행 중인 운동을 마무리해 주세요.');
                      return;
                    }
                    change(s => {
                      s.draft = structuredClone(r);
                    });
                    setPage('session');
                  }}>열기</button></div>)}</details><details className="trash-list"><summary>삭제한 운동 ({state.sessions.filter(s => s.deletedAt).length})</summary>{state.sessions.filter(s => s.deletedAt).map(s => <div className="body-row" key={s.id}><span>{s.name} · {day(s.date)}</span><button className="text-button" onClick={() => change(a => {
                    const x = a.sessions.find(x => x.id === s.id)!;
                    delete x.deletedAt;
                    x.updatedAt = Date.now();
                  })}>복원</button></div>)}</details></section><section className="panel"><h3>앱처럼 사용하기</h3><p className="subtext">iPhone은 Safari 공유 메뉴 → 홈 화면에 추가, Android는 브라우저 메뉴 → 앱 설치를 선택하세요.</p><p className="micro">휴식은 앱을 다시 열어도 남은 시간을 복원해요. 앱이 실행되는 동안 벨과 알림을 보내요. 다른 앱 사용·화면 잠금으로 실행이 멈추면 알림이 늦을 수 있으며, 현재 백그라운드 예약 푸시는 지원하지 않아요.</p><div className="bell-setting"><div><strong>휴식 알림 · 복싱 라운드 벨</strong><p className="micro">휴식이 끝나면 금속 벨이 세 번 울려요.</p></div><button className="secondary" onClick={()=>void testSound()}><Volume2 size={16} />벨 테스트</button></div><button className="secondary" onClick={()=>void testNotification()}>알림 권한 · 배너 테스트</button><h3 className="section-gap">근육 지도 안내</h3><p className="micro">주동근은 코랄, 보조근은 골드로 표시해요. 도식은 부위를 찾기 위한 참고 자료예요. 가슴 상·하부와 삼각근 세부 구획은 텍스트에서 구분하며, 실제 자극은 자세·가동범위에 따라 달라져요.</p><a className="text-link" href="/MUSCLE-LICENSE.txt" target="_blank" rel="noreferrer">근육 도식 라이선스 (MIT)</a><p className="micro">KEEP HEALTHY 4.4 · 운동 기록과 꾸준함을 위한 앱</p></section></div></>}
 {shareSession && page === 'home' && <div className="share-strip"><CheckCheck size={20} /><span><strong>오늘도 한 걸음.</strong> 운동을 기록했어요.</span><button className="text-button" onClick={() => previewShare(shareSession)}><Download size={16} />오운완 카드</button><button className="icon-button" aria-label="완료 안내 닫기" onClick={() => setShareSession(null)}><X size={17} /></button></div>}
 </main></div>
 <Dialog open={!!modal} onOpenChange={v => {
      if (!v) setModal('');
    }}><DialogContent className={'app-dialog modal-' + modal}><DialogTitle>{({
            picker: '운동 추가',
            exercise: selectedEx.name,
            routine: '루틴 편집',
            body: '신체 기록',
            gym: '헬스장 추가',
            equipment: '기구 등록',
            recording:'기구별 입력 설정',
            notes: '운동 메모',
            quick: '빠른 세트 입력',
            finish: '운동 마무리',
            history: detailSession?.name || '운동 기록',
            import: '기록 가져오기',
            custom: '내 운동 추가'
          } as Record<string, string>)[modal] || '운동'}</DialogTitle><DialogDescription className="sr-only">운동 기록과 설정을 확인하고 저장하세요.</DialogDescription>
 {modal === 'picker' && <>{swapId&&<div className="program-notice"><strong>동작이 비슷한 대체 후보</strong><p>다른 기구의 중량을 그대로 옮기지 않아요. 아래에서 종목을 선택하고 설정·중량을 다시 확인하세요.</p>{alternatives(draft?.exercises.find(e=>e.id===swapId)?.name||'').map(name=>{const e=exercise(name);return e?exRow(e,true):null;})}</div>}<div className="search-box"><Search size={18} /><input autoFocus placeholder="이름 또는 초성으로 검색" aria-label="추가할 운동 검색" value={query} onChange={e => setQuery(e.target.value)} /></div><div className="filter-chips">{GROUPS.map(g => <button key={g} className={group === g ? 'selected' : ''} onClick={() => setGroup(g)}>{g}</button>)}</div><div className="picker-results">{matched.slice(0, 60).map(e => exRow(e, true))}{!matched.length && <Empty title="검색 결과가 없어요" description="운동 이름을 바꾸거나 직접 추가할 수 있어요." />}</div><button className="secondary" onClick={() => setModal('custom')}><Plus size={16} />직접 추가</button></>}
 {modal === 'exercise' && <><div className="exercise-badges">{pill(selectedEx.equipment)}{pill({
              weight: '중량 × 횟수',
              bodyweight: '맨몸 · 횟수',
              assisted: '보조 중량 × 횟수',
              time: '시간',
              cardio: '기구별 기록'
            }[selectedEx.type])}</div><MuscleMap primary={selectedEx.primary} secondary={selectedEx.secondary} compact /><div className="muscle-detail"><div><span className="primary-marker" />주동근<strong>{selectedEx.primaryLabels.join(' · ') || '종목과 동작에 따라 다름'}</strong></div><div><span className="secondary-marker" />보조근<strong>{selectedEx.secondaryLabels.join(' · ') || '별도 표기 없음'}</strong></div></div><div className="guide-block"><h3>동작 포인트</h3><p>{selectedEx.how}</p><h3>체크할 점</h3><p>{selectedEx.caution}</p>{selectedEx.equipment === '덤벨' && <p>중량은 덤벨 한 개 기준으로 일관되게 기록하세요. 볼륨 계산도 입력한 중량을 기준으로 해요.</p>}{selectedEx.type === 'assisted' && <p>기구의 보조 중량을 입력하세요. 보조가 줄어들수록 난도가 높아져요.</p>}</div><a className="secondary video-search" href={shortsSearchUrl(selectedEx.name)} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"><Video size={18} />유튜브 쇼츠 검색<ArrowUp size={15} className="external-arrow" /></a><p className="micro">새 탭에서 종목명으로 검색해요. 필요하면 YouTube의 Shorts 필터를 선택하세요.</p><div className="modal-actions"><button className="secondary" onClick={() => setModal('picker')}><ArrowLeft size={16} />목록</button><button className="primary" onClick={() => addExercise(selectedEx.id)}><Plus size={17} />{swapId ? '이 운동으로 교체' : '운동에 추가'}</button></div></>}
 {modal === 'routine' && editRoutine && <><Field label="루틴 이름"><input value={editRoutine.name} maxLength={100} onChange={e => setEditRoutine({
              ...editRoutine,
              name: e.target.value
            })} placeholder="예: 상체 A · 45분" /></Field><RoutineReview routine={editRoutine}/><div className="routine-edit-list">{editRoutine.exercises.map((e, i) => <div className="routine-edit-row" key={i}><div className="row between"><strong>{exercise(e.exerciseId)?.name || e.exerciseId}</strong><div className="row"><button className="icon-button" disabled={!i} aria-label="운동 위로" onClick={() => {
                    const a = [...editRoutine.exercises];
                    [a[i - 1], a[i]] = [a[i], a[i - 1]];
                    setEditRoutine({
                      ...editRoutine,
                      exercises: a
                    });
                  }}><ArrowUp size={15} /></button><button className="icon-button" aria-label="루틴 종목 삭제" onClick={() => setEditRoutine({
                    ...editRoutine,
                    exercises: editRoutine.exercises.filter((_, j) => i !== j)
                  })}><X size={16} /></button></div></div><div className="form-grid four">{([{
                  key: 'sets',
                  label: '세트',
                  max: 30
                }, {
                  key: 'reps',
                  label: '최소 목표 횟수',
                  max: 100
                }, {
                  key: 'repMax',
                  label: '최대 목표 횟수',
                  max: 100
                }, {
                  key: 'weight',
                  label: '시작 kg',
                  max: 1000
                }, {
                  key: 'rest',
                  label: '휴식 초',
                  max: 600
                }] as const).map(f => <Field key={f.key} label={f.label}><input type="number" min={f.key === 'weight' ? 0 : 1} max={f.max} value={e[f.key]} onChange={ev => setEditRoutine({
                    ...editRoutine,
                    exercises: editRoutine.exercises.map((x, j) => j === i ? {
                      ...x,
                      [f.key]: Number(ev.target.value)
                    } : x)
                  })} /></Field>)}</div></div>)}</div><button className="secondary full" onClick={() => openPicker('routine')}><Plus size={17} />운동 추가</button><div className="modal-actions"><button className="text-button danger" onClick={() => setConfirm({
              title: '이 루틴을 삭제할까요?',
              detail: '기존 운동 기록은 그대로 남아요.',
              action: () => {
                change(s => {
                  const r = s.routines.find(r => r.id === editRoutine.id);
                  if (r) {
                    r.deletedAt = Date.now();
                    r.updatedAt = Date.now();
                  }
                });
                setModal('');
              }
            })}>루틴 삭제</button><span className="spacer" /><button className="secondary" onClick={() => setEditRoutine({
              ...editRoutine,
              id: uid(),
              name: editRoutine.name + ' 복사'
            })}><Copy size={16} />복제</button><button className="primary" onClick={saveRoutine}><Save size={16} />저장</button></div></>}
 {modal === 'body' && <form onSubmit={e => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const date = String(f.get('date')),
            weight = Number(f.get('weight'));
          change(s => {
            s.body.push({
              id: uid(),
              date,
              weight,
              ...(f.get('fat') ? {
                fat: Number(f.get('fat'))
              } : {}),
              ...(f.get('muscle') ? {
                muscle: Number(f.get('muscle'))
              } : {}),
              ...(f.get('waist') ? {
                waist: Number(f.get('waist'))
              } : {}),
              updatedAt: Date.now()
            });
          });
          setModal('');
          toast.success('신체 기록을 저장했어요.');
        }}><Field label="측정 날짜"><input name="date" type="date" required defaultValue={day()} max={day()} /></Field><Field label="체중 (kg)"><input name="weight" type="number" min="20" max="400" step="0.1" required placeholder="실제 측정 체중" /></Field><div className="form-grid"><Field label="체지방률 (%) · 선택"><input name="fat" type="number" min="0" max="75" step="0.1" /></Field><Field label="골격근량 (kg) · 선택"><input name="muscle" type="number" min="0" max="150" step="0.1" /></Field></div><Field label="허리둘레 (cm) · 선택"><input name="waist" type="number" min="20" max="250" step="0.1" /></Field><button className="primary full" type="submit">기록 저장</button></form>}
 {modal === 'gym' && <form onSubmit={e => {
          e.preventDefault();
          const f = new FormData(e.currentTarget),
            name = String(f.get('name')).trim();
          if (!name) return;
          change(s => {
            const id = uid();
            s.gyms.push({
              id,
              name,
              equipment: [],
              updatedAt: Date.now()
            });
            s.profile.gymId = id;
            s.profile.updatedAt = Date.now();
          });
          setModal('');
        }}><Field label="헬스장 이름"><input name="name" required maxLength={100} placeholder="예: 회사 근처 헬스장" /></Field><button type="submit" className="primary full">추가</button></form>}
 {modal==='recording'&&recordingContext&&<RecordingEditor key={`${recordingContext.gymId}/${recordingContext.equipmentId}/${recordingContext.exerciseId}`} name={exercise(recordingContext.exerciseId)?.name||'내 운동'} cardio={exercise(recordingContext.exerciseId)?.type==='cardio'} dumbbell={exercise(recordingContext.exerciseId)?.equipment==='덤벨'} value={recordingFor(state,{exerciseId:recordingContext.exerciseId,equipmentId:recordingContext.equipmentId,recording:draft?.exercises.find(e=>e.id===recordingContext.sessionId)?.recording},recordingContext.gymId)} onSave={saveRecording}/>}
 {modal === 'equipment' && <form onSubmit={e => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          change(s => {
            const g = s.gyms.find(g => g.id === s.profile.gymId)!;
            g.equipment.push({
              id: uid(),
              name: String(f.get('name')).trim(),
              exerciseId: String(f.get('exercise')),
              setup: String(f.get('setup')),
              step: Number(f.get('step')),
              updatedAt: Date.now()
            });
            g.updatedAt = Date.now();
          });
          setModal('');
          toast.success('기구를 등록했어요. 운동 중 기구를 선택해 주세요.');
        }}><Field label="기구 이름"><input name="name" required maxLength={100} placeholder="예: 해머 체스트 프레스 1번" /></Field><Field label="연결할 운동"><NativeSelect name="exercise" defaultValue={selected}>{EXERCISES.filter(e => e.type !== 'time').map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</NativeSelect></Field><Field label="좌석·그립·기구 세팅"><textarea name="setup" maxLength={1000} placeholder="좌석 4, 등받이 2, 손잡이 가슴 중앙" /></Field><Field label="최소 중량 변경 단위 (kg)"><input name="step" type="number" min="0.1" max="100" step="0.1" defaultValue="2.5" required /></Field><button type="submit" className="primary full">기구 저장</button></form>}
 {modal === 'notes' && <form onSubmit={e => {
          e.preventDefault();
          const f = new FormData(e.currentTarget),
            note = String(f.get('note'));
          change(s => {
            const x = s.draft?.exercises.find(x => x.id === notesId);
            if (x) {
              x.note = note;
              if (f.get('keep')) s.exerciseNotes[x.exerciseId] = note;
              s.draft!.updatedAt = Date.now();
            }
          });
          setModal('');
        }}><Field label="폼·통증·진행 메모"><textarea name="note" maxLength={2000} defaultValue={draft?.exercises.find(e => e.id === notesId)?.note} placeholder="예: 팔꿈치를 살짝 모으니 가슴에 집중하기 좋았음" /></Field><label className="checkbox-label"><input name="keep" type="checkbox" />다음 운동에도 이 메모 표시</label><button type="submit" className="primary full">메모 저장</button></form>}
 {modal === 'quick' && <><p className="subtext">종목명 · 중량 · 횟수 · 세트 수를 한 번에 입력하세요.</p><textarea autoFocus aria-label="빠른 운동 입력" value={quickText} onChange={e => setQuickText(e.target.value)} placeholder="머신 체스트 프레스 40kg 10회 3세트" /><p className="micro">운동 사전의 정확한 종목명을 사용하세요. 입력 후 완료 여부를 직접 확인해요.</p><button className="primary full" onClick={quickInput}>세트 만들기</button></>}
 {modal === 'finish' && draft && <><Field label="운동 이름"><input maxLength={200} value={draft.name} onChange={e => changeDraft(s => {
              s.name = e.target.value;
            })} /></Field><Field label="운동 날짜"><input type="date" max={day()} value={day(draft.date)} onChange={e => {
              if (e.target.value) changeDraft(s => {
                s.date = new Date(e.target.value + 'T12:00:00+09:00').toISOString();
              });
            }} /></Field>{!draft.startedAt && <Field label="운동 시간 (분)"><input type="number" min="0" max="1440" value={draft.duration / 60} onChange={e => changeDraft(s => {
              s.duration = Number(e.target.value) * 60;
            })} /></Field>}<div className="finish-stats"><div><b>{completedSets(draft)}</b><span>완료 본세트</span></div><div><b>{Math.round(elapsed(draft, now) / 60)}</b><span>운동 시간 (분)</span></div><div><b>{number(volume(draft))}</b><span>중량 볼륨 (kg)</span></div></div><Field label="오늘의 한 줄"><textarea maxLength={4000} placeholder="오늘 잘한 점이나 다음에 신경 쓸 점" value={draft.note} onChange={e => changeDraft(s => {
              s.note = e.target.value;
            })} /></Field><p className="micro">완료 표시한 세트만 통계에 반영돼요. 기록하지 않은 세트도 원본에 남아요.</p><button className="primary full" onClick={finish}><Check size={18} />운동 저장</button></>}
 {modal === 'history' && detailSession && <><p className="subtext">{dateText(detailSession.date)} · {Math.round(detailSession.duration / 60)}분 · {completedSets(detailSession)}세트</p><div className="history-detail">{detailSession.exercises.map(e => <div key={e.id}><h3>{e.name}</h3><p>{e.sets.filter(s => s.done).map((s, i) => `${s.kind === 'warmup' ? 'W' : i + 1}. ${exercise(e.exerciseId)?.type === 'cardio' ? cardioSummary(e.name, s,historicalRecording(e)) : exercise(e.exerciseId)?.type === 'time' ? timeLabel(s.duration) : `${weightText(s.weight,historicalRecording(e))} × ${s.reps}회`}${s.rpe ? ` (RPE ${s.rpe})` : ''}`).join(' / ') || '완료 세트 없음'}</p>{e.note && <small>{e.note}</small>}</div>)}</div>{detailSession.note && <p className="quote-note">{detailSession.note}</p>}<div className="modal-actions"><button className="text-button danger" onClick={() => setConfirm({
              title: '운동 기록을 삭제할까요?',
              detail: '설정 → 삭제한 운동에서 복원할 수 있어요.',
              action: () => {
                change(s => {
                  const x = s.sessions.find(s => s.id === detailSession.id)!;
                  x.deletedAt = Date.now();
                  x.updatedAt = Date.now();
                });
                setModal('');
              }
            })}><Trash2 size={16} />삭제</button><span className="spacer" /><button className="secondary" onClick={() => previewShare(detailSession)}><Download size={16} />카드</button><button className="primary" onClick={() => {
              if (draft) {
                toast('먼저 진행 중인 운동을 마무리해 주세요.');
                return;
              }
              change(s => {
                s.draft = structuredClone(detailSession);
                for(const item of s.draft.exercises)item.recording ||= historicalRecording(item);
                delete s.draft.startedAt;
              });
              setModal('');
              setPage('session');
            }}>기록 수정</button></div></>}
 {modal === 'import' && importState && <><div className="import-preview"><ShieldCheck size={36} /><h3>가져올 기록을 확인하세요</h3><p>운동 {liveSessions(importState).length}회 · 루틴 {importState.routines.filter(r => !r.deletedAt).length}개 · 신체 기록 {importState.body.length}개</p></div><p className="subtext">현재 데이터를 먼저 파일로 백업하고 기록을 합쳐요. 같은 ID는 최근 수정본을 사용해요. 삭제한 기록은 자동으로 되살리지 않아요.</p>{importState.legacyArchive != null && <p className="micro">이전 앱의 원본도 보관해요. 이미 숫자로 저장된 이전 유산소 시간은 분 단위로 복구되며, 소실된 초 단위는 복구할 수 없어요.</p>}<button className="primary full" onClick={() => {
            exportJSON();
            const okay = change(s => Object.assign(s, mergeStates(s, importState)));
            if (okay) {
              setModal('');
              toast.success('기록을 가져왔어요.');
            }
          }}><Upload size={17} />백업 후 합치기</button></>}
 {modal === 'custom' && <form onSubmit={e => {
          e.preventDefault();
          const f = new FormData(e.currentTarget),
            name = String(f.get('name')).trim();
          if (!name) return;
          const id = EXERCISES.find(e => e.name === name)?.id || name;
          if (pickerFor === 'routine' && page === 'routines') {
            setEditRoutine(r => r ? {
              ...r,
              exercises: [...r.exercises, {
                exerciseId: id,
                sets: 3,
                reps: 10,
                repMax: 12,
                weight: 0,
                rest: 90
              }]
            } : r);
            setModal('routine');
            return;
          }
          change(s => {
            s.draft ||= startSession(s);
            s.draft.exercises.push({
              id: uid(),
              exerciseId: id,
              name,
              equipmentId: '',
              note: '',
              rest: 90,
              superset: '',
              sets: Array.from({
                length: 3
              }, () => makeSet())
            });
          });
          setModal('');
          setPage('session');
        }}><Field label="운동 이름"><input name="name" maxLength={100} required placeholder="기록할 중량 운동 이름" /></Field><p className="micro">직접 추가한 종목은 중량 × 횟수로 기록해요. 근육 타겟은 임의로 지정하지 않아요.</p><button type="submit" className="primary full">운동 추가</button></form>}
 </DialogContent></Dialog>
 <AlertDialog open={!!confirm} onOpenChange={v => {
      if (!v) setConfirm(null);
    }}><AlertDialogContent className="app-dialog"><AlertDialogHeader><AlertDialogTitle>{confirm?.title}</AlertDialogTitle><AlertDialogDescription>{confirm?.detail}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>취소</AlertDialogCancel><AlertDialogAction className="primary" onClick={() => {
            confirm?.action();
            setConfirm(null);
          }}>확인</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

 </Tabs>;
}
