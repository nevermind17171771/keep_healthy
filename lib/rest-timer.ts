export type RestTimer = { sessionId: string; end: number; length: number; alerted?: boolean };
export const REST_KEY = 'keep-healthy-rest-v1';
export function readRest(raw: string | null, sessionId: string): RestTimer | null {
  try {
    const v = JSON.parse(raw || 'null');
    return v && v.sessionId === sessionId && Number.isFinite(v.end) && v.end > 0 && Number.isFinite(v.length) && v.length > 0 && v.length <= 3600 ? v : null;
  } catch { return null; }
}
export function restSeconds(timer: RestTimer | null, now: number) { return timer ? Math.max(0, Math.ceil((timer.end - now) / 1000)) : 0; }
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
