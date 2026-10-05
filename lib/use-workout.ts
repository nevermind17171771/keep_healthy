'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { defaultState, stateSchema, mergeStates, type AppState } from './model';
import { readCache, writeCache, download } from './cache';
type Remote = {
  state: AppState;
  revision: number;
};
async function request(init?: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const r = await fetch('/api/sync', {
      cache: 'no-store',
      ...init,
      signal: controller.signal
    });
    const data = (await r.json()) as {
      state?: unknown;
      revision?: number;
      error?: string;
    };
    return {
      r,
      data
    };
  } finally {
    clearTimeout(timer);
  }
}
function checkedRemote(data: {
  state?: unknown;
  revision?: number;
}): Remote {
  if (!Number.isInteger(data.revision) || data.revision! < 0) throw Error('서버의 저장 정보를 확인할 수 없어요.');
  return {
    state: stateSchema.parse(data.state),
    revision: data.revision!
  };
}
export function useWorkout() {
  const [state, setState] = useState<AppState>(defaultState),
    [ready, setReady] = useState(false),
    [status, setStatus] = useState('기록 불러오는 중'),
    [conflict, setConflict] = useState(false),
    [error, setError] = useState('');
  const current = useRef(state),
    revision = useRef(0),
    pending = useRef(false),
    busy = useRef(false),
    changeId = useRef(0),
    remote = useRef<Remote | null>(null),
    writeQueue = useRef(Promise.resolve());
  const cache = useCallback(() => {
    const value = {
      state: structuredClone(current.current),
      revision: revision.current,
      pending: pending.current
    };
    writeQueue.current = writeQueue.current.catch(() => {}).then(() => writeCache(value));
    return writeQueue.current;
  }, []);
  const conflictWith = useCallback((next: Remote) => {
    remote.current = next;
    setConflict(true);
    setStatus('기록 합치기 필요');
    setError('다른 기기의 변경사항이 있어요. 백업 후 두 기록을 합쳐 주세요.');
  }, []);
  const sync = useCallback(async () => {
    if (busy.current || remote.current) return;
    busy.current = true;
    const seq = changeId.current;
    try {
      if (!pending.current) {
        const {
          r,
          data
        } = await request();
        if (!r.ok) throw Error(data.error || '기록을 불러오지 못했어요.');
        const next = checkedRemote(data);
        if (changeId.current !== seq) {
          if (next.revision !== revision.current) conflictWith(next);
          return;
        }
        current.current = next.state;
        revision.current = next.revision;
        setState(next.state);
      } else {
        setStatus('동기화 중');
        await writeQueue.current.catch(() => {});
        const {
          r,
          data
        } = await request({
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            state: current.current,
            revision: revision.current,
            clientSchema: 2
          })
        });
        if (r.status === 409) {
          const newer = await request();
          if (!newer.r.ok) throw Error(newer.data.error);
          conflictWith(checkedRemote(newer.data));
          return;
        }
        if (!r.ok) throw Error(data.error || '동기화하지 못했어요.');
        if (!Number.isInteger(data.revision)) throw Error('저장 결과를 확인할 수 없어요.');
        revision.current = data.revision!;
        pending.current = changeId.current !== seq;
      }
      setError('');
      try {
        await cache();
        setStatus(pending.current ? '기기에 저장됨 · 동기화 대기' : '동기화 완료');
      } catch {
        setStatus(pending.current ? '동기화 대기' : '서버에 저장됨');
        setError('기기 임시 저장에 실패했어요. 연결을 유지하고 JSON 백업을 내보내 주세요.');
      }
    } catch (e) {
      setStatus(pending.current ? '동기화 대기' : '오프라인 · 기기 기록');
      setError(e instanceof Error && e.name !== 'AbortError' ? e.message : '연결이 지연되고 있어요. 입력 내용은 유지되며 다시 연결되면 동기화해요.');
    } finally {
      busy.current = false;
    }
  }, [cache, conflictWith]);
  useEffect(() => {
    let mounted = true;
    void (async () => {
      let c = null;
      try {
        c = await readCache();
      } catch {}
      if (!mounted) return;
      if (c) {
        current.current = c.state;
        revision.current = c.revision;
        pending.current = c.pending;
        setState(c.state);
      }
      try {
        const {
          r,
          data
        } = await request();
        if (!r.ok) throw Error(data.error || '기록을 불러오지 못했어요.');
        const next = checkedRemote(data);
        if (c?.pending) {
          if (c.revision !== next.revision) conflictWith(next);else setStatus('동기화 대기');
        } else {
          current.current = next.state;
          revision.current = next.revision;
          setState(next.state);
          setStatus('동기화 완료');
          await cache();
        }
      } catch (e) {
        setStatus(c ? '오프라인 · 기기 기록' : '연결 확인 필요');
        setError(e instanceof Error && e.name !== 'AbortError' ? e.message : '연결이 지연되고 있어요. 기록은 기기에 임시 저장할 수 있어요.');
      }
      if (mounted) setReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, [cache, conflictWith]);
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => {
      if (pending.current) void sync();
    }, 2500);
    const online = () => void sync();
    window.addEventListener('online', online);
    window.addEventListener('focus', online);
    const leave = (e: BeforeUnloadEvent) => {
      if (pending.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', leave);
    return () => {
      clearInterval(id);
      window.removeEventListener('online', online);
      window.removeEventListener('focus', online);
      window.removeEventListener('beforeunload', leave);
    };
  }, [ready, sync]);
  const change = useCallback((fn: (draft: AppState) => void) => {
    const next = structuredClone(current.current);
    fn(next);
    const valid = stateSchema.safeParse(next);
    if (!valid.success) {
      setError('입력값을 확인해 주세요. 음수·잘못된 날짜·허용 범위를 벗어난 값은 저장할 수 없어요.');
      return false;
    }
    current.current = valid.data;
    setState(valid.data);
    changeId.current++;
    pending.current = true;
    setStatus('기기에 저장 중');
    void cache().then(() => {
      if (pending.current) setStatus('기기에 저장됨 · 동기화 대기');
    }).catch(() => {
      setStatus('기기 저장 오류');
      setError('기기 저장에 실패했어요. 입력 내용은 화면에 유지돼요. 지금 JSON 백업을 내보내 주세요.');
    });
    return true;
  }, [cache]);
  const resolve = () => {
    if (!remote.current) return;
    download({
      local: current.current,
      remote: remote.current.state
    }, 'keep-healthy-conflict-originals.json');
    const merged = mergeStates(current.current, remote.current.state);
    revision.current = remote.current.revision;
    remote.current = null;
    setConflict(false);
    change(s => Object.assign(s, merged));
  };
  return {
    state,
    ready,
    status,
    error,
    conflict,
    change,
    sync,
    resolve,
    pending
  };
}
