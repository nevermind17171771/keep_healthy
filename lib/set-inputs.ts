export function stepReps(value: number, direction: -1 | 1) {
  return Math.min(1000000, Math.max(0, Math.trunc(Number.isFinite(value) ? value : 0) + direction));
}
