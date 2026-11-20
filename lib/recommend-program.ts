import { day, exercise, liveSessions, type AppState } from './model';

const DAY = 86_400_000;
export type ProgramGoal = 'priority' | 'balance' | 'time' | 'return';
type ProgramOption = { id: 'priority' | 'upper-lower' | 'full' | 'express' | 'return'; reason: string; observed: string };

export function recommendProgram(state: AppState, goal: ProgramGoal, now = Date.now()): ProgramOption {
  const first = day(now - 27 * DAY), today = day(now);
  const strength = liveSessions(state).filter(session => {
    const date = day(session.date);
    return date >= first && date <= today && session.exercises.some(item => {
      const ex = exercise(item.exerciseId);
      return ex?.type !== 'cardio' && ex?.group !== '스트레칭' && item.sets.some(set => set.done && set.kind === 'work');
    });
  });
  const days = new Set(strength.map(session => day(session.date)));
  const weekly = days.size / 4;
  const target = state.profile.weeklyTarget;
  const observed = days.size
    ? `최근 28일 근력 운동 ${days.size}일 · 주 평균 ${weekly.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}일 · 목표 주 ${target}일`
    : `최근 28일 근력 기록 없음 · 목표 주 ${target}일`;
  if (goal === 'return') return { id: 'return', reason: '종목당 2세트로 시작해서 운동 감각과 회복 상태를 확인해요.', observed };
  if (target < 3) return { id: 'express', reason: `주 ${target}일 목표에 맞춰 압축 전신 루틴을 A → B → C 순서로 이어가세요. 주 3일 일정은 가져올 필요가 없어요.`, observed };
  if (goal === 'time') return { id: 'express', reason: '시간이 짧은 날에는 전신의 핵심 세 종목부터 해요.', observed };
  if (target >= 4 && weekly >= 3.5) {
    return goal === 'priority'
      ? { id: 'priority', reason: '가슴과 어깨에 각각 먼저 힘을 쓸 수 있고, 하체 집중일도 주 1회 있어요.', observed }
      : { id: 'upper-lower', reason: '최근 빈도에 맞춰 상체와 하체를 각각 주 두 번 나눠 훈련해요.', observed };
  }
  return { id: 'full', reason: target >= 4 ? '최근 빈도에서 바로 주 4회로 뛰기보다 주 3회 전신 루틴으로 시작해요.' : '주 3회 전신 A/B/C로 주요 부위를 고르게 훈련해요.', observed };
}
