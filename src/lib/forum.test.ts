/* eslint-disable no-unused-vars -- mock helper types intentionally loose */
import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './supabase/database.types';
import { banUser, listReports, reportPost, resolveReport, suspendUser } from './forum';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any;

interface RpcCall {
  name: string;
  args: Record<string, unknown>;
}

interface InsertCall {
  table: string;
  row: Record<string, unknown>;
}

interface Fixture {
  insertError?: { message: string; code?: string } | null;
  insertedId?: string | null;
  rpcError?: { message: string } | null;
  currentUserId?: string | null;
  listRows?: unknown[];
  listError?: { message: string } | null;
}

function makeClient(f: Fixture) {
  const rpcCalls: RpcCall[] = [];
  const insertCalls: InsertCall[] = [];
  const selectCalls: string[] = [];

  const client = {
    from: (table: string) => {
      const builder: Record<string, AnyFn> = {
        insert: (row: Record<string, unknown>) => {
          insertCalls.push({ table, row });
          return builder;
        },
        select: (cols?: string) => {
          if (cols) selectCalls.push(cols);
          return builder;
        },
        eq: () => builder,
        order: () => builder,
        single: () =>
          Promise.resolve({
            data: { id: f.insertedId ?? 'rep-1' },
            error: f.insertError ?? null,
          }),
        then: (res: (v: unknown) => void, rej: (e: unknown) => void) => {
          if (f.listError) return Promise.resolve({ data: null, error: f.listError }).then(res, rej);
          return Promise.resolve({ data: f.listRows ?? [], error: null }).then(res, rej);
        },
      };
      return builder;
    },
    rpc: (name: string, args: Record<string, unknown>) => {
      rpcCalls.push({ name, args });
      return Promise.resolve({ data: null, error: f.rpcError ?? null });
    },
    auth: {
      getUser: () =>
        Promise.resolve({
          data: { user: { id: f.currentUserId ?? 'reporter-session' } },
          error: null,
        }),
    },
  };

  return {
    client: client as unknown as SupabaseClient<Database>,
    rpcCalls,
    insertCalls,
    selectCalls,
  };
}

describe('reportPost', () => {
  it('binds reporter_id to the caller uid from the session and logs the reportar audit', async () => {
    const { client, insertCalls, rpcCalls } = makeClient({});
    const res = await reportPost(client, 'post-1', 'Spam', 'Contenido repetido');

    expect(res).toEqual({ error: null });
    const reportInsert = insertCalls.find((c) => c.table === 'reports' && c.row.post_id === 'post-1');
    expect(reportInsert?.row).toMatchObject({
      post_id: 'post-1',
      // reporter is the session uid, never a caller-supplied value.
      reporter_id: 'reporter-session',
      reason: 'Spam',
      justification: 'Contenido repetido',
    });
    // Audit must carry the new report id as entity and the reason/justification.
    expect(rpcCalls).toContainEqual({
      name: 'log_audit',
      args: {
        p_action: 'reportar',
        p_entity_type: 'report',
        p_entity_id: 'rep-1',
        p_details: { post_id: 'post-1', reason: 'Spam' },
      },
    });
  });

  it('returns the insert error and does not audit on failure', async () => {
    const { client, rpcCalls } = makeClient({ insertError: { message: 'RLS bloqueado' } });
    const res = await reportPost(client, 'post-1', 'Spam');

    expect(res).toEqual({ error: 'RLS bloqueado' });
    expect(rpcCalls).toHaveLength(0);
  });

  it('treats a duplicate report insert (23505) as silent no-op success', async () => {
    const { client, rpcCalls } = makeClient({
      insertError: {
        code: '23505',
        message: 'duplicate key value violates unique constraint "reports_post_reporter_unique"',
      },
    });
    const res = await reportPost(client, 'post-1', 'Spam');

    // Same reporter re-reporting the same post: the DB unique backstop fires,
    // but the reportar flow must stay non-breaking (no error surfaced).
    expect(res).toEqual({ error: null });
    // No new row was created, so no reportar audit is logged.
    expect(rpcCalls).toHaveLength(0);
  });
});

describe('suspendUser', () => {
  it('calls suspend_user RPC with all arguments on success', async () => {
    const { client, rpcCalls } = makeClient({});
    const until = '2026-09-01T00:00:00.000Z';
    const res = await suspendUser(client, 'user-1', until, 'Spam reiterado');

    expect(res).toEqual({ error: null });
    expect(rpcCalls).toContainEqual({
      name: 'suspend_user',
      args: {
        p_user_id: 'user-1',
        p_active_until: until,
        p_justification: 'Spam reiterado',
      },
    });
  });

  it('returns the RPC error message on failure', async () => {
    const { client } = makeClient({ rpcError: { message: 'La justificacion es obligatoria' } });
    const res = await suspendUser(client, 'user-1', '2026-09-01T00:00:00.000Z', '');
    expect(res).toEqual({ error: 'La justificacion es obligatoria' });
  });
});

describe('banUser', () => {
  it('calls ban_user RPC with justification on success', async () => {
    const { client, rpcCalls } = makeClient({});
    const res = await banUser(client, 'user-2', 'Cuenta comprometida');

    expect(res).toEqual({ error: null });
    expect(rpcCalls).toContainEqual({
      name: 'ban_user',
      args: { p_user_id: 'user-2', p_justification: 'Cuenta comprometida' },
    });
  });

  it('returns the RPC error message on failure', async () => {
    const { client } = makeClient({ rpcError: { message: 'No se puede sancionar a un GM o admin' } });
    const res = await banUser(client, 'gm-1', 'X');
    expect(res).toEqual({ error: 'No se puede sancionar a un GM o admin' });
  });
});

describe('resolveReport', () => {
  it('calls resolve_report RPC with status and justification on success', async () => {
    const { client, rpcCalls } = makeClient({});
    const res = await resolveReport(client, 'rep-9', 'resuelta', 'Se retiró el contenido');

    expect(res).toEqual({ error: null });
    expect(rpcCalls).toContainEqual({
      name: 'resolve_report',
      args: {
        p_report_id: 'rep-9',
        p_status: 'resuelta',
        p_justification: 'Se retiró el contenido',
      },
    });
  });

  it('returns the RPC error message on failure', async () => {
    const { client } = makeClient({ rpcError: { message: 'La justificacion es obligatoria' } });
    const res = await resolveReport(client, 'rep-9', 'descartada', '');
    expect(res).toEqual({ error: 'La justificacion es obligatoria' });
  });
});

describe('listReports', () => {
  it('returns abierta reports with reporter + post link when the query succeeds', async () => {
    const { client, selectCalls } = makeClient({
      listRows: [
        {
          id: 'rep-1',
          reason: 'Spam',
          justification: 'Repetido',
          status: 'abierta',
          created_at: '2026-08-03T00:00:00Z',
          reporter: { id: 'u1', display_name: 'Aragorn', username: 'aragon' },
          post: {
            id: 'p1',
            thread_id: 't1',
            post_number: 2,
            author: { id: 'author-1', display_name: 'Frodo', username: 'frodo', role: 'rolero' },
          },
        },
      ],
    });
    const res = await listReports(client);

    expect(res.error).toBeNull();
    expect(res.data).toHaveLength(1);
    expect(res.data?.[0]).toMatchObject({ id: 'rep-1', reason: 'Spam', status: 'abierta' });
    expect(res.data?.[0].reporter?.display_name).toBe('Aragorn');
    expect(res.data?.[0].post).toMatchObject({ id: 'p1', thread_id: 't1' });
    // The queue must know the REPORTED USER (post author) and their role so the
    // UI can show sanction controls and block admin/GM targets (ENF-04).
    expect(res.data?.[0].post?.author).toMatchObject({
      id: 'author-1',
      username: 'frodo',
      role: 'rolero',
    });
    expect(
      selectCalls.some((s) => s.includes('author:author_id(id, display_name, username, role)')),
    ).toBe(true);
  });

  it('returns an empty list when there are no open reports', async () => {
    const { client } = makeClient({ listRows: [] });
    const res = await listReports(client);
    expect(res.error).toBeNull();
    expect(res.data).toEqual([]);
  });

  it('returns error message when the select fails', async () => {
    const { client } = makeClient({ listError: { message: 'forbidden' } });
    const res = await listReports(client);
    expect(res.error).toBe('forbidden');
  });
});
