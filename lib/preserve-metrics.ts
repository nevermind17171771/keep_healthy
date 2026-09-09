import type { AppState } from './model';
/** Old installed clients do not understand metrics. Their writes must not erase them. */
export function preserveMissingMetrics(incoming: AppState, previous: AppState): AppState {
  const rows = (s: AppState) => [...s.sessions, ...(s.recoveredDrafts || []), ...(s.draft ? [s.draft] : [])];
  const prior = new Map(rows(previous).flatMap(s => s.exercises.flatMap(e => e.sets.map(set => [`${s.id}/${e.id}/${set.id}`, set.metrics] as const))));
  for (const s of rows(incoming)) for (const e of s.exercises) for (const set of e.sets) {
    const old = prior.get(`${s.id}/${e.id}/${set.id}`);
    if (set.metrics === undefined && old !== undefined) set.metrics = old;
  }
  return incoming;
}
