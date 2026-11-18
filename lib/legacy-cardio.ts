import type { CardioMetric } from './cardio';
/** Missing measurements stay missing; legacy split strings are mm:ss/500m. */
export function legacyCardioMetrics(set: Record<string, unknown>): Partial<Record<CardioMetric, number>> {
  const metrics: Partial<Record<CardioMetric, number>> = {};
  for (const key of ['calories', 'speed', 'incline', 'elevationGain', 'steps', 'floors', 'rpm', 'resistance', 'watts', 'strokeRate', 'rounds', 'heartRate'] as const) {
    const raw = set[key];
    if (raw === null || raw === undefined || raw === '') continue;
    const n = Number(raw);
    if (Number.isFinite(n) && (n >= 0 || key === 'incline' && n >= -20)) metrics[key] = n;
  }
  if (typeof set.split === 'string' && /^\d{1,3}:[0-5]\d$/.test(set.split)) {
    const [m, s] = set.split.split(':').map(Number);
    metrics.split = m * 60 + s;
  }
  return metrics;
}
