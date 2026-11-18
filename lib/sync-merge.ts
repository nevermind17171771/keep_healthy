import { stateSchema, type AppState } from './model';

export function same(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const x = Object.keys(a), y = Object.keys(b);
  return x.length === y.length && x.every(k => Object.hasOwn(b, k) && same((a as any)[k], (b as any)[k]));
}
/** Three-way merge: only overlapping edits to the same value need human review. */
export function reconcile(base: AppState, local: AppState, remote: AppState): AppState | null {
  const conflict = Symbol('conflict');
  function merge(b: any, l: any, r: any, key = ''): any {
    if (same(l, r) || same(b, r)) return l;
    if (same(b, l)) return r;
    if (key === 'updatedAt' && typeof l === 'number' && typeof r === 'number') return Math.max(l, r);
    if (!l || !r || typeof l !== 'object' || typeof r !== 'object') throw conflict;
    if (Array.isArray(l) && Array.isArray(r)) {
      const identified = (xs: any[]) => xs.every(x => x && typeof x.id === 'string') && new Set(xs.map(x => x.id)).size === xs.length;
      if (!identified(l) || !identified(r) || (b && !identified(b))) throw conflict;
      const bm = new Map((b || []).map((x: any) => [x.id, x])), lm = new Map(l.map(x => [x.id, x])), rm = new Map(r.map(x => [x.id, x]));
      return [...new Set([...l, ...r, ...(b || [])].map(x => x.id))].map(id => merge(bm.get(id), lm.get(id), rm.get(id))).filter(x => x !== undefined);
    }
    if (Array.isArray(l) || Array.isArray(r) || (l.id && r.id && l.id !== r.id)) throw conflict;
    const result: Record<string, unknown> = {};
    for (const k of new Set([...Object.keys(b || {}), ...Object.keys(l), ...Object.keys(r)])) {
      const value = merge(b?.[k], l[k], r[k], k);
      if (value !== undefined) result[k] = value;
    }
    return result;
  }
  try {
    const merged = merge(base, local, remote);
    // An acknowledged completion must never reappear as an active workout.
    if (merged.draft && merged.sessions.some((s: any) => s.id === merged.draft.id)) {
      const finished = merged.sessions.find((s: any) => s.id === merged.draft.id);
      if (!same(finished.exercises, merged.draft.exercises)) return null;
      merged.draft = null;
    }
    const checked = stateSchema.safeParse(merged);
    return checked.success ? checked.data : null;
  } catch (e) { if (e === conflict) return null; throw e; }
}

/** Older caches have no baseline. Only infer ancestry when every recorded value survives. */
export function isWorkoutExtension(local: AppState, remote: AppState): boolean {
  const a=local.draft,b=remote.draft;
  if (!a || !b || a.id!==b.id || !same({...local,draft:null},{...remote,draft:null})) return false;
  if (!same({...a,exercises:[],updatedAt:0},{...b,exercises:[],updatedAt:0})) return false;
  return b.exercises.every(old=>{
    const next=a.exercises.find(e=>e.id===old.id);
    return next && same({...next,sets:[]},{...old,sets:[]}) && old.sets.every(set=>{
      const current=next.sets.find(s=>s.id===set.id);
      return current && (same(set,current) || (!set.done && current.done && set.kind===current.kind));
    });
  });
}
