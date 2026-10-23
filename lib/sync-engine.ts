import { uid } from './id';
import { defaultState, stateSchema, type AppState } from './model';
import { same, reconcile, isWorkoutExtension } from './sync-merge';
export type Remote = { state: AppState; revision: number; owner?: string };
export type Outbox = { id: string; state: AppState; revision: number };
export type Snapshot = Remote & { pending: boolean; base?: AppState; outbox?: Outbox };
export type SyncResponse = { status: number; data: any };
type Dependencies = {
  request: (outbox?: Outbox) => Promise<SyncResponse>;
  persist: (snapshot: Snapshot) => Promise<void>;
  notify: () => void;
};
export class WorkoutSync {
  snapshot: Snapshot = { state: defaultState(), revision: 0, pending: false };
  conflict: Remote | null = null;
  status = '기록 불러오는 중';
  error = '';
  needsLogin = false;
  private queue = Promise.resolve();
  private running: Promise<void> | null = null;
  constructor(private deps: Dependencies) {}
  restore(value: Snapshot) { this.snapshot = structuredClone(value); this.deps.notify(); }
  private publish() { this.deps.notify(); }
  private save() {
    const value = structuredClone(this.snapshot);
    this.queue = this.queue.catch(() => {}).then(() => this.deps.persist(value));
    return this.queue;
  }
  edit(fn: (state: AppState) => void) {
    const next = structuredClone(this.snapshot.state); fn(next);
    const checked = stateSchema.safeParse(next);
    if (!checked.success) { this.error = '입력값을 확인해 주세요. 허용 범위를 벗어난 값은 저장할 수 없어요.'; this.publish(); return false; }
    if (!this.snapshot.pending && !this.snapshot.base) this.snapshot.base = structuredClone(this.snapshot.state);
    this.snapshot.state = checked.data; this.snapshot.pending = true;
    this.status = '기기에 저장 중'; this.publish();
    void this.save().then(() => {
      if (this.snapshot.pending && !this.conflict) this.status = '기기에 저장됨 · 동기화 대기';
      this.publish();
    }).catch(() => { this.error = '기기 저장에 실패했어요. 화면의 기록을 JSON 백업으로 내보내 주세요.'; this.publish(); });
    return true;
  }
  private accept(next: Remote) {
    if (this.snapshot.owner && next.owner && this.snapshot.owner !== next.owner && this.snapshot.pending) {
      throw Error('다른 계정으로 로그인했어요. 기존 계정으로 다시 로그인해 이 기기의 미전송 기록을 저장해 주세요.');
    }
    let merged: AppState | null;
    if (!this.snapshot.pending) merged = next.state;
    else if (this.snapshot.revision === next.revision) merged = this.snapshot.state;
    else if (same(this.snapshot.state, next.state)) merged = next.state;
    else merged = this.snapshot.base ? reconcile(this.snapshot.base, this.snapshot.state, next.state) : isWorkoutExtension(this.snapshot.state,next.state) ? this.snapshot.state : null;
    if (!merged) {
      this.conflict = next; this.status = '겹치는 수정 확인 필요';
      this.error = '같은 기록에 서로 다른 수정이 있어요. 원본을 백업한 뒤 합쳐 주세요.';
      this.publish(); return false;
    }
    this.snapshot = { state: merged, revision: next.revision, owner: next.owner || this.snapshot.owner, base: next.state, pending: !same(merged, next.state) };
    return true;
  }
  private check(response: SyncResponse) {
    this.needsLogin = response.status === 401;
    if (response.status < 200 || response.status >= 300) throw Error(response.data.error || (this.needsLogin ? '로그인이 필요해요. 기기의 운동 기록은 유지돼요.' : '서버에 연결하지 못했어요.'));
  }
  private async get() {
    const response = await this.deps.request(); this.check(response);
    const { revision, owner } = response.data;
    if (!Number.isInteger(revision) || revision < 0) throw Error('서버의 저장 정보를 확인할 수 없어요.');
    return { state: stateSchema.parse(response.data.state), revision, owner } as Remote;
  }
  sync() {
    if (this.running) return this.running;
    this.running = this.run().finally(() => { this.running = null; });
    return this.running;
  }
  private async run() {
    if (this.conflict) return;
    try {
      this.status = '동기화 중'; this.publish();
      // A persisted outbox is retried before fetching: the server may already have saved it.
      if (!this.snapshot.outbox) {
        const next = await this.get();
        if (!this.accept(next)) return;
      }
      for (let attempt = 0; this.snapshot.pending && attempt < 3; attempt++) {
        if (!this.snapshot.outbox) this.snapshot.outbox = { id: uid(), state: structuredClone(this.snapshot.state), revision: this.snapshot.revision };
        const sent = this.snapshot.outbox;
        // Persist this exact operation BEFORE sending; edits made in flight stay in state.
        await this.save();
        const response = await this.deps.request(sent);
        if (response.status === 409) {
          if (!this.accept(await this.get())) return;
          continue;
        }
        this.check(response);
        const revision = response.data.revision;
        if (!Number.isInteger(revision) || revision <= sent.revision) throw Error('저장 결과를 확인할 수 없어요.');
        this.snapshot.revision = revision;
        this.snapshot.base = sent.state;
        this.snapshot.owner = response.data.owner || this.snapshot.owner;
        this.snapshot.pending = !same(this.snapshot.state, sent.state);
        delete this.snapshot.outbox;
        await this.save();
      }
      this.error = '';
      await this.save();
      this.status = this.snapshot.pending ? '기기에 저장됨 · 동기화 대기' : '동기화 완료';
    } catch (e) {
      this.status = this.needsLogin ? '로그인 필요 · 기기 기록 유지' : this.snapshot.pending ? '기기에 저장됨 · 동기화 대기' : '오프라인 · 기기 기록';
      this.error = e instanceof Error && e.name !== 'AbortError' ? e.message : '연결이 지연돼요. 기록을 유지하고 연결되면 다시 저장해요.';
    } finally { this.publish(); }
  }
  resolve(merged: AppState) {
    if (!this.conflict) return;
    const remote = this.conflict;
    this.snapshot = { state: this.snapshot.state, revision: remote.revision, base: remote.state, owner: remote.owner || this.snapshot.owner, pending: true };
    this.conflict = null; this.error = '';
    this.edit(s => Object.assign(s, merged));
    void this.sync();
  }
}
