/* eslint-disable no-unused-vars -- mock helper types intentionally loose */
import { describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { load, actions } from '../../../src/routes/admin/moderacion/+page.server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loadFn = load as unknown as (...args: unknown[]) => Promise<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const act = (name: string) => (actions as any)[name] as unknown as (...args: unknown[]) => Promise<any>;

interface ThreadRow {
  id: string;
  status: string;
  content_type: string;
  linked_entity_type: 'story' | 'character' | 'event' | null;
  linked_entity_id: string | null;
  author_id: string;
}

interface Fixture {
  thread?: ThreadRow | null;
  threads?: ThreadRow[];
  eventStatus?: string;
}

function makeSupabase(fixture: Fixture = {}) {
  const calls: Record<string, unknown[]> = { update: [], rpc: [] };
  const from = vi.fn((table: string) => {
    const b: Record<string, unknown> = {
      select: vi.fn(() => b),
      eq: vi.fn(() => b),
      or: vi.fn(() => b),
      in: vi.fn(() => b),
      not: vi.fn(() => b),
      order: vi.fn(() => b),
      limit: vi.fn(() => b),
      update: vi.fn((row: unknown) => {
        calls.update.push(row);
        return b;
      }),
      maybeSingle: vi.fn(async () => ({
        data: table === 'threads' ? (fixture.thread ?? null) : null,
        error: null,
      })),
      single: vi.fn(async () => ({
        data: table === 'events' ? { id: fixture.thread?.linked_entity_id, status: fixture.eventStatus } : null,
        error: null,
      })),
      then: (res: (...a: unknown[]) => void, rej: (...a: unknown[]) => void) => {
        const list = table === 'threads' ? fixture.threads ?? [] : null;
        return Promise.resolve({ data: list, error: null }).then(res, rej);
      },
    };
    return b;
  });
  const rpc = vi.fn(async (name: string, args: unknown) => {
    calls.rpc.push({ name, args });
    return { data: null, error: null };
  });
  return { from, rpc, calls };
}

const makeLocals = (supabase: ReturnType<typeof makeSupabase>, role: 'rolero' | 'gm' | 'admin' = 'gm', id = 'gm-1') =>
  ({ supabase, user: { id }, profile: { id, role } } as never);

const makeEvent = (locals: ReturnType<typeof makeLocals>, body = 'threadId=t1', url = 'http://localhost/admin/moderacion') =>
  ({
    locals,
    request: new Request(url, {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    }),
  }) as unknown as RequestEvent;

const expectError = (fn: () => Promise<unknown>, status: number) =>
  fn().then(
    () => {
      throw new Error('expected an http-error to be thrown');
    },
    (e) => {
      expect((e as { status?: number }).status).toBe(status);
    },
  );

const storyThread = (over: Partial<ThreadRow> = {}): ThreadRow => ({
  id: 't1',
  status: 'pendiente',
  content_type: 'historia',
  linked_entity_type: 'story',
  linked_entity_id: 'story-1',
  author_id: 'author-1',
  ...over,
});

describe('admin/moderacion load() (REQ-FORUM-05.1/05.2)', () => {
  it('throws 403 for a non-staff', async () => {
    const supabase = makeSupabase();
    await expectError(() => loadFn(makeEvent(makeLocals(supabase, 'rolero', 'r1'))), 403);
  });

  it('returns pending bridged threads and events for a staff member', async () => {
    const supabase = makeSupabase({ threads: [storyThread()] });
    const result = (await loadFn(makeEvent(makeLocals(supabase)))) as { pendingThreads: ThreadRow[] };
    expect(result.pendingThreads[0].id).toBe('t1');
  });
});

describe('admin/moderacion approve/reject (REQ-FORUM-05.1/05.3)', () => {
  it('approves a pending story thread via approve_story and makes it public', async () => {
    const supabase = makeSupabase({ thread: storyThread() });
    const res = (await act('approveThread')(makeEvent(makeLocals(supabase)))) as { success: boolean };
    expect(res.success).toBe(true);
    const rpcCall = supabase.calls.rpc.find((r) => (r as { name: string }).name === 'approve_story') as { args: { p_story_id: string } };
    expect(rpcCall).toBeTruthy();
    expect(rpcCall.args.p_story_id).toBe('story-1');
    expect((supabase.calls.update[0] as { status: string }).status).toBe('aprobado');
  });

  it('rejects a pending character thread via reject_character', async () => {
    const supabase = makeSupabase({
      thread: storyThread({ content_type: 'ficha', linked_entity_type: 'character', linked_entity_id: 'char-1' }),
    });
    const res = (await act('rejectThread')(makeEvent(makeLocals(supabase)))) as { success: boolean };
    expect(res.success).toBe(true);
    const rpcCall = supabase.calls.rpc.find((r) => (r as { name: string }).name === 'reject_character') as { args: { p_character_id: string; p_notes: string } };
    expect(rpcCall).toBeTruthy();
    expect(rpcCall.args.p_character_id).toBe('char-1');
    expect((supabase.calls.update[0] as { status: string }).status).toBe('rechazado');
  });

  it('throws 403 when a non-staff tries to approve', async () => {
    const supabase = makeSupabase({ thread: storyThread() });
    await expectError(() => act('approveThread')(makeEvent(makeLocals(supabase, 'rolero', 'r1'))), 403);
  });
});

describe('admin/moderacion event review (REQ-FORUM-05.3)', () => {
  it('blocks review when the event is NOT finalized (event-not-finalized guard)', async () => {
    const supabase = makeSupabase({
      thread: storyThread({ content_type: 'evento', linked_entity_type: 'event', linked_entity_id: 'ev-1' }),
      eventStatus: 'en_curso',
    });
    const res = (await act('reviewEvent')(makeEvent(makeLocals(supabase)))) as { status: number };
    expect(res.status).toBe(400);
    const conf = supabase.calls.rpc.find((r) => (r as { name: string }).name === 'confirm_event_completion');
    expect(conf).toBeUndefined();
  });

  it('runs confirm_event_completion when the event is finalized', async () => {
    const supabase = makeSupabase({
      thread: storyThread({ content_type: 'evento', linked_entity_type: 'event', linked_entity_id: 'ev-1' }),
      eventStatus: 'finalizado',
    });
    const res = (await act('reviewEvent')(makeEvent(makeLocals(supabase)))) as { success: boolean };
    expect(res.success).toBe(true);
    const conf = supabase.calls.rpc.find((r) => (r as { name: string }).name === 'confirm_event_completion') as { args: { p_event_id: string } };
    expect(conf).toBeTruthy();
    expect(conf.args.p_event_id).toBe('ev-1');
  });
});
