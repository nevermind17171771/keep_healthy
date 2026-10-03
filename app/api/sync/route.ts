import { env } from 'cloudflare:workers';
import { stateSchema, defaultState } from '@/lib/model';
import { preserveMissingMetrics } from '@/lib/preserve-metrics';
export const dynamic = 'force-dynamic';
function user(request: Request) {
  const id = request.headers.get('oai-authenticated-user-id');
  if (id) return id;
  if (process.env.NODE_ENV === 'development' && ['terminal.local', 'localhost', '127.0.0.1'].includes(new URL(request.url).hostname)) return 'development-only';
  return null;
}
const json = (data: unknown, status = 200) => Response.json(data, {
  status,
  headers: {
    'Cache-Control': 'no-store'
  }
});
export async function GET(request: Request) {
  const id = user(request);
  if (!id) return json({
    error: '로그인이 필요해요.'
  }, 401);
  try {
    const db = env.DB;
    if (!db) return json({
      error: '저장소에 연결할 수 없어요.'
    }, 503);
    const url = new URL(request.url);
    if (url.searchParams.has('backups')) {
      const r = await db.prepare('SELECT id,revision,created FROM workout_backups WHERE user_id=? ORDER BY created DESC LIMIT 20').bind(id).all();
      return json({
        backups: r.results
      });
    }
    if (url.searchParams.has('restore')) {
      const r = await db.prepare('SELECT payload,revision FROM workout_backups WHERE user_id=? AND id=?').bind(id, url.searchParams.get('restore')).first<{
        payload: string;
        revision: number;
      }>();
      return r ? json({
        state: JSON.parse(r.payload)
      }) : json({
        error: '백업을 찾을 수 없어요.'
      }, 404);
    }
    const r = await db.prepare('SELECT payload,revision FROM workout_state WHERE user_id=?').bind(id).first<{
      payload: string;
      revision: number;
    }>();
    return json({
      state: r ? JSON.parse(r.payload) : defaultState(),
      revision: r?.revision || 0
    });
  } catch (e) {
    console.error('Load failed', e);
    return json({
      error: '기록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'
    }, 503);
  }
}
export async function PUT(request: Request) {
  const id = user(request);
  if (!id) return json({
    error: '로그인이 필요해요.'
  }, 401);
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return json({
    error: '허용되지 않은 요청이에요.'
  }, 403);
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 1500000) return json({
      error: '백업 용량이 커서 동기화할 수 없어요. 파일로 내보내 주세요.'
    }, 413);
    const body = JSON.parse(raw);
    if (!Number.isInteger(body.revision) || body.revision < 0) return json({
      error: '버전 정보가 올바르지 않아요.'
    }, 400);
    const checked = stateSchema.safeParse(body.state);
    if (!checked.success) return json({
      error: '기록 형식이 올바르지 않아요. 원본 백업을 유지해 주세요.'
    }, 400);
    const db = env.DB;
    if (!db) return json({
      error: '저장소에 연결할 수 없어요.'
    }, 503);
    const now = new Date().toISOString();
    await db.prepare('INSERT OR IGNORE INTO workout_state(user_id,payload,revision,modified) VALUES(?,?,0,?)').bind(id, JSON.stringify(defaultState()), now).run();
    const previous = await db.prepare('SELECT payload,revision FROM workout_state WHERE user_id=?').bind(id).first<{
      payload: string;
      revision: number;
    }>();
    if (previous) {
      const old = stateSchema.safeParse(JSON.parse(previous.payload));
      if (old.success) preserveMissingMetrics(checked.data, old.data,body.clientSchema!==2);
    }
    const result = await db.prepare('UPDATE workout_state SET payload=?,revision=revision+1,modified=? WHERE user_id=? AND revision=? RETURNING revision').bind(JSON.stringify(checked.data), now, id, body.revision).first<{
      revision: number;
    }>();
    if (!result) return json({
      error: '다른 기기에서 기록이 변경됐어요. 두 기록을 합쳐 다시 저장해 주세요.'
    }, 409);
    if (previous) {
      await db.prepare('INSERT OR IGNORE INTO workout_backups(user_id,id,payload,revision,created) VALUES(?,?,?,?,?)').bind(id, now.slice(0, 10), previous.payload, previous.revision, now).run().catch(e => console.error('Snapshot failed', e));
      await db.prepare('DELETE FROM workout_backups WHERE user_id=? AND id NOT IN (SELECT id FROM workout_backups WHERE user_id=? ORDER BY created DESC LIMIT 20)').bind(id, id).run().catch(() => {});
    }
    return json({
      revision: result.revision,
      updatedAt: now
    });
  } catch (e) {
    console.error('Save failed', e);
    return json({
      error: '저장하지 못했어요. 입력한 내용은 기기에 남아 있어요.'
    }, 503);
  }
}
