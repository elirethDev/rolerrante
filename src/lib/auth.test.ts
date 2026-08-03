import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './supabase/database.types';
import { forumAccessAllowed, hasActiveSanction, listActiveSanctions } from './auth';

const DAY = 86_400_000;

describe('hasActiveSanction', () => {
  it('returns false when there is no sanction row (clear)', () => {
    expect(hasActiveSanction(null)).toBe(false);
  });

  it('returns true for a permanent ban with no expiry', () => {
    expect(hasActiveSanction({ kind: 'ban', active_until: null })).toBe(true);
  });

  it('returns true for an active suspension ending in the future', () => {
    const future = new Date(Date.now() + DAY).toISOString();
    expect(hasActiveSanction({ kind: 'suspension', active_until: future })).toBe(true);
  });

  it('returns false for an expired suspension ending in the past', () => {
    const past = new Date(Date.now() - DAY).toISOString();
    expect(hasActiveSanction({ kind: 'suspension', active_until: past })).toBe(false);
  });

  it('treats a malformed (NaN) active_until as an active/denied sanction', () => {
    // A non-parseable date must fail CLOSED (deny), never allow.
    expect(hasActiveSanction({ kind: 'suspension', active_until: 'not-a-date' })).toBe(true);
  });

  it('treats a NULL active_until on a suspension as an active/denied sanction', () => {
    expect(hasActiveSanction({ kind: 'suspension', active_until: null })).toBe(true);
  });
});

describe('forumAccessAllowed', () => {
  const future = new Date(Date.now() + DAY).toISOString();

  const makeClient = (
    data: { kind: string; active_until: string | null } | null,
    queryError: { message: string } | null = null,
  ) => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      or: () => chain,
      maybeSingle: () => Promise.resolve({ data, error: queryError }),
    };
    return { from: () => chain } as unknown as SupabaseClient<Database>;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = { id: 'u1', role: 'rolero' } as any;

  it('denies access when the user has an active suspension', async () => {
    const supabase = makeClient({ kind: 'suspension', active_until: future });
    await expect(forumAccessAllowed(supabase, profile)).resolves.toBe(false);
  });

  it('denies access for a permanent ban', async () => {
    const supabase = makeClient({ kind: 'ban', active_until: null });
    await expect(forumAccessAllowed(supabase, profile)).resolves.toBe(false);
  });

  it('allows access when the user has no sanction (cleared)', async () => {
    const supabase = makeClient(null);
    await expect(forumAccessAllowed(supabase, profile)).resolves.toBe(true);
  });

  it('allows access when the only sanction is expired (no active match)', async () => {
    // An expired row fails the kind.eq.ban,active_until.gt.now() filter, so the
    // query returns no active sanction row.
    const supabase = makeClient(null);
    await expect(forumAccessAllowed(supabase, profile)).resolves.toBe(true);
  });

  it('fails CLOSED (denies) when the sanctions query returns an error', async () => {
    // A query error must deny access, never allow it (fail-open would let a
    // sanctioned user through all /foro surfaces).
    const supabase = makeClient(null, { message: 'network error' });
    await expect(forumAccessAllowed(supabase, profile)).resolves.toBe(false);
  });
});

describe('listActiveSanctions', () => {
  type Row = { user_id: string; kind: string; active_until: string | null };

  const makeClient = (
    rows: Row[],
    queryError: { message: string } | null = null,
    onQuery?: (uid: string[]) => void,
  ) => {
    const chain = {
      select: () => chain,
      in: (col: string, vals: string[]) => {
        if (col === 'user_id') onQuery?.(vals);
        return chain;
      },
      or: () => chain,
      then: (res: (v: unknown) => void, rej: (e: unknown) => void) =>
        Promise.resolve({ data: queryError ? null : rows, error: queryError }).then(res, rej),
    };
    return { from: () => chain } as unknown as SupabaseClient<Database>;
  };

  it('maps active sanctions to user_id for a set of reported users', async () => {
    const supabase = makeClient([
      { user_id: 'u2', kind: 'suspension', active_until: '2099-01-01T00:00:00Z' },
      { user_id: 'u3', kind: 'ban', active_until: null },
    ]);
    const map = await listActiveSanctions(supabase, ['u2', 'u3', 'u4']);
    expect(map['u2'].kind).toBe('suspension');
    expect(map['u3'].kind).toBe('ban');
    expect(map['u4']).toBeUndefined();
  });

  it('returns an empty map when there are no user ids (no query issued)', async () => {
    let queried = false;
    const supabase = makeClient([], null, () => {
      queried = true;
    });
    const map = await listActiveSanctions(supabase, []);
    expect(map).toEqual({});
    expect(queried).toBe(false);
  });

  it('returns an empty map on query error so the queue still renders', async () => {
    const supabase = makeClient([], { message: 'forbidden' });
    await expect(listActiveSanctions(supabase, ['u2'])).resolves.toEqual({});
  });
});
