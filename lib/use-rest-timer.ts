'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { playRoundBell } from './round-bell';
import { REST_KEY, readRest, restSeconds, showRestNotification, type RestTimer } from './rest-timer';

export function useRestTimer(sessionId: string | undefined, ready: boolean) {
  const [timer, setTimer] = useState<RestTimer | null>(null);
  const [now, setNow] = useState(Date.now());
  const audio = useRef<AudioContext | null>(null), soundBusy = useRef(false), sounded = useRef(0);
  const current = useRef<RestTimer | null>(null);
  const update = useCallback((next: RestTimer | null) => {
    current.current = next; setTimer(next);
    try { if (next) localStorage.setItem(REST_KEY, JSON.stringify(next)); else localStorage.removeItem(REST_KEY); } catch {}
  }, []);
  const unlock = useCallback(() => {
    try {
      const session = (navigator as any).audioSession;
      if (session) { try { session.type = 'playback'; } catch {} }
      const Audio = window.AudioContext || (window as any).webkitAudioContext;
      if (!audio.current || audio.current.state === 'closed') audio.current = new Audio();
      const c = audio.current!;
      if (c.state !== 'running') void c.resume().catch(() => {});
      // Playing a buffer during a user gesture unlocks audio on mobile Safari.
      const source = c.createBufferSource(); source.buffer = c.createBuffer(1, 1, c.sampleRate); source.connect(c.destination); source.onended = () => source.disconnect(); source.start();
      return c;
    } catch { return null; }
  }, []);
  const sound = useCallback(async () => {
    const c = unlock();
    return c ? Promise.race([playRoundBell(c), new Promise<boolean>(resolve => setTimeout(() => resolve(false), 1200))]) : false;
  }, [unlock]);
  useEffect(() => {
    if (!ready) return;
    let saved = null;
    try { if (sessionId) saved = readRest(localStorage.getItem(REST_KEY), sessionId); } catch {}
    sounded.current = saved?.alerted ? saved.end : 0;
    update(saved); setNow(Date.now());
  }, [sessionId, ready, update]);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const resume = () => { tick(); if (document.visibilityState === 'visible' && audio.current) void audio.current.resume().catch(() => {}); };
    const gesture = () => { if (current.current) { unlock(); tick(); } };
    const id = setInterval(tick, 250);
    window.addEventListener('pageshow', resume); document.addEventListener('visibilitychange', resume);
    document.addEventListener('pointerdown', gesture, {passive:true});
    return () => { clearInterval(id); window.removeEventListener('pageshow', resume); document.removeEventListener('visibilitychange', resume); document.removeEventListener('pointerdown', gesture); };
  }, [unlock]);
  useEffect(() => {
    if (!timer || restSeconds(timer, now) || timer.alerted) return;
    const context = audio.current;
    if (context?.state === 'running' && sounded.current !== timer.end && !soundBusy.current) {
      soundBusy.current = true;
      void playRoundBell(context).then(ok => {
        soundBusy.current = false;
        if (ok) {
          sounded.current = timer.end;
          if (current.current?.end === timer.end) update({...current.current, alerted:true});
        }
      }).catch(() => { soundBusy.current = false; });
    }
  }, [now, timer, update]);
  const announced = useRef(0);
  useEffect(() => {
    if (!timer || restSeconds(timer, now) || announced.current === timer.end || timer.alerted) return;
    announced.current = timer.end;
    toast.success('휴식 끝! 다음 세트를 시작할 시간이에요.');
    if (document.visibilityState !== 'visible') void showRestNotification().catch(() => {});
  }, [timer, now]);
  const start = (seconds: number) => {
    if (!sessionId || seconds <= 0) return;
    unlock(); sounded.current = 0; announced.current = 0;
    const time = Date.now(); setNow(time); update({sessionId, end:time + seconds * 1000, length:seconds});
  };
  const adjust = (seconds: number) => {
    if (!current.current) return;
    unlock(); sounded.current = 0; announced.current = 0;
    const time = Date.now(); setNow(time);
    update({...current.current, end:Math.max(time, current.current.end) + seconds * 1000, alerted:false});
  };
  const testNotification = async () => {
    try {
      if (!('Notification' in window)) { toast('이 브라우저는 알림을 지원하지 않아요. iPhone은 Safari에서 홈 화면에 추가한 앱으로 열어 주세요.'); return; }
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { toast('알림이 허용되지 않았어요. 기기의 앱 알림 설정을 확인해 주세요.'); return; }
      if (!(await showRestNotification(true))) toast('앱을 새로 연 뒤 알림 테스트를 다시 눌러 주세요.');
    } catch { toast.error('알림을 표시하지 못했어요. 기기 알림 설정을 확인해 주세요.'); }
  };
  return { restEnd:timer?.end || 0, restLength:timer?.length || 90, restRemaining:restSeconds(timer,now), start, adjust, cancel:()=>update(null), testSound:async()=>{ if (!(await sound())) toast.error('소리를 재생하지 못했어요. 기기 음량을 확인하고 다시 눌러 주세요.'); }, testNotification };
}
