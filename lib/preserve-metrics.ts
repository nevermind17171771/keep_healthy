import type { AppState } from './model';
/** Older installed clients may omit fields they cannot read. Preserve those fields by stable IDs. */
export function preserveMissingMetrics(incoming: AppState, previous: AppState, legacyClient = true): AppState {
  const rows = (s: AppState) => [...s.sessions, ...(s.recoveredDrafts || []), ...(s.draft ? [s.draft] : [])];
  const prior = new Map(rows(previous).flatMap(s => s.exercises.map(e => [`${s.id}/${e.id}`, e] as const)));
  for (const session of rows(incoming)) for (const item of session.exercises) {
    const old = prior.get(`${session.id}/${item.id}`);
    if (!old) continue;
    if (legacyClient && item.recording === undefined) item.recording = old.recording;
    for (const set of item.sets) {
      const before = old.sets.find(s => s.id === set.id);
      if (!before) continue;
      if (set.metrics === undefined && before.metrics !== undefined) set.metrics = before.metrics;else if (legacyClient && set.metrics && set.metrics.inclineLevel === undefined && before.metrics?.inclineLevel !== undefined) set.metrics.inclineLevel = before.metrics.inclineLevel;
      if (legacyClient && set.target === undefined) set.target = before.target;
    }
  }
  if (legacyClient) {
    if (incoming.profile.sessionView === undefined) incoming.profile.sessionView = previous.profile.sessionView;
    if (incoming.profile.recordingPreferences === undefined) incoming.profile.recordingPreferences = previous.profile.recordingPreferences;
    for (const gym of incoming.gyms) for (const eq of gym.equipment) {
      const old = previous.gyms.find(g => g.id === gym.id)?.equipment.find(e => e.id === eq.id);
      if (eq.recording === undefined && old?.recording) eq.recording = old.recording;
    }
  }
  return incoming;
}
