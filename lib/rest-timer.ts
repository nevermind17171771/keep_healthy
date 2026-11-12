export type RestTimer = { sessionId: string; end: number; length: number; alerted?: boolean; soundPlayed?: boolean; dismissed?: boolean; test?: boolean };
export const REST_KEY = 'keep-healthy-rest-v1';
export function readRest(raw: string | null, sessionId: string): RestTimer | null {
  try {
    const v = JSON.parse(raw || 'null');
    return v && v.sessionId === sessionId && Number.isFinite(v.end) && v.end > 0 && Number.isFinite(v.length) && v.length > 0 && v.length <= 3600 ? v : null;
  } catch { return null; }
}
export function restSeconds(timer: RestTimer | null, now: number) { return timer ? Math.max(0, Math.ceil((timer.end - now) / 1000)) : 0; }
/** Adjust this countdown only; persist the new deadline, never the exercise default. */
export function adjustRestTimer(timer: RestTimer, seconds: number, now: number): RestTimer {
  if (!Number.isFinite(seconds) || !Number.isFinite(now)) return timer;
  const end = Math.min(now + 3600000, Math.max(now, Math.max(now, timer.end) + seconds * 1000));
  if (end === timer.end || (timer.end <= now && seconds <= 0)) return timer;
  return {...timer, end, length: Math.min(3600, Math.max(1, (timer.end <= now ? (end - now) / 1000 : timer.length + (end - timer.end) / 1000))), soundPlayed: false, dismissed: false};
}
export async function showRestNotification(test = false) {
  if (!('Notification' in window) || Notification.permission !== 'granted' || !('serviceWorker' in navigator)) return false;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return false;
  await registration.showNotification(test ? 'KEEP HEALTHY · 알림 테스트' : '휴식 끝! 다음 세트 시작', {
    body: test ? '기기에서 알림 배너가 표시되는지 확인해 주세요.' : '준비됐어요. 앱을 열고 다음 세트를 이어가세요.',
    tag: test ? 'rest-test' : 'rest-finished', icon: '/icon-192.png', badge: '/icon-192.png', data: { url: '/' }
  });
  return true;
}
