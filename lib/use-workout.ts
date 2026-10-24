'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { mergeStates, type AppState } from './model';
import { readCache, writeCache, download } from './cache';
import { WorkoutSync, type Outbox } from './sync-engine';

export function useWorkout() {
  const [, render] = useState(0);
  const [ready, setReady] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const active = useRef(false);
  const engineRef = useRef<WorkoutSync | null>(null);
  if (!engineRef.current) engineRef.current = new WorkoutSync({
    request: async (outbox?: Outbox) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const r = await fetch('/api/sync', {
          cache: 'no-store', credentials: 'same-origin', signal: controller.signal,
          ...(outbox ? { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state: outbox.state, revision: outbox.revision, mutationId: outbox.id, owner: engineRef.current?.snapshot.owner, clientSchema: 2 }) } : {})
        });
        const data = await r.json().catch(() => ({ error: r.status === 401 || r.redirected ? '로그인이 필요해요. 기기의 기록은 유지돼요.' : '서버 응답을 확인할 수 없어요. 잠시 후 다시 시도해 주세요.' }));
        return { status: r.redirected ? 401 : r.status, data };
      } finally { clearTimeout(timeout); }
    },
    persist: writeCache,
    notify: () => { if (active.current) render(n => n + 1); }
  });
  const engine = engineRef.current;
  const editing = useRef(false);
  useEffect(() => {
    active.current = true;
    let stopped = false, release: (() => void) | undefined, acquiring = false;
    const boot = async () => {
      let cached = null;
      try { cached = await readCache(); } catch {}
      if (stopped) return;
      if (cached) engine.restore(cached);
      editing.current = true; setReadOnly(false);
      if (cached) setReady(true);
      await engine.sync();
      if (!stopped) setReady(true);
    };
    const acquire = async () => {
      if (stopped || acquiring || editing.current) return;
      acquiring = true;
      if (!navigator.locks) { await boot(); acquiring = false; return; }
      await navigator.locks.request('keep-healthy-workout-editor', { ifAvailable: true }, async lock => {
        if (stopped) return;
        if (!lock) {
          const cached = await readCache().catch(() => null);
          if (stopped) return;
          if (cached) engine.restore(cached);
          setReadOnly(true); setReady(true); return;
        }
        const held = new Promise<void>(resolve => { release = resolve; });
        await boot();
        if (!stopped) await held;
      });
      acquiring = false;
    };
    void acquire();
    const resume = () => {
      if (document.visibilityState !== 'visible') return;
      if (editing.current) void engine.sync(); else void acquire();
    };
    const saveBeforeHide = () => { if (editing.current && engine.snapshot.pending) void engine.sync(); };
    const visibility = () => document.visibilityState === 'visible' ? resume() : saveBeforeHide();
    const interval = setInterval(() => { if (editing.current && engine.snapshot.pending && document.visibilityState === 'visible') void engine.sync(); }, 2500);
    window.addEventListener('online', resume);
    window.addEventListener('focus', resume);
    window.addEventListener('pageshow', resume);
    window.addEventListener('pagehide', saveBeforeHide);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      stopped = true; active.current = false; editing.current = false; release?.(); clearInterval(interval);
      window.removeEventListener('online', resume); window.removeEventListener('focus', resume);
      window.removeEventListener('pageshow', resume); window.removeEventListener('pagehide', saveBeforeHide);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [engine]);
  const change = useCallback((fn: (draft: AppState) => void) => editing.current && engine.edit(fn), [engine]);
  const sync = useCallback(() => editing.current ? engine.sync() : Promise.resolve(), [engine]);
  const resolve = () => {
    if (!editing.current || !engine.conflict) return;
    download({ local: engine.snapshot.state, remote: engine.conflict.state }, 'keep-healthy-conflict-originals.json');
    engine.resolve(mergeStates(engine.snapshot.state, engine.conflict.state));
  };
  return { state: engine.snapshot.state, ready, readOnly, needsLogin: engine.needsLogin, status: engine.status, error: engine.error, conflict: !!engine.conflict, change, sync, resolve, pending: { current: engine.snapshot.pending } };
}
