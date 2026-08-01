import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { safeGetSession } from './auth';

const mockSession = {
  access_token: 'access-token',
  refresh_token: 'refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
};

const mockUser = {
  id: 'user-1',
  email: 'player@example.com',
  role: 'authenticated',
  aud: 'authenticated',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const makeClient = () =>
  ({
    auth: {
      getSession: vi.fn(),
      getUser: vi.fn(),
    },
  }) as unknown as SupabaseClient<Database>;

describe('safeGetSession', () => {
  it('returns null session and user when there is no session', async () => {
    const supabase = makeClient();
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null } } as never);

    await expect(safeGetSession(supabase)).resolves.toEqual({ session: null, user: null });
    expect(supabase.auth.getUser).not.toHaveBeenCalled();
  });

  it('returns null session and user when getUser errors', async () => {
    const supabase = makeClient();
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: mockSession } } as never);
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: new Error('identity not found'),
    } as never);

    await expect(safeGetSession(supabase)).resolves.toEqual({ session: null, user: null });
  });

  it('returns the session and user when both calls succeed', async () => {
    const supabase = makeClient();
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: mockSession } } as never);
    vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: mockUser }, error: null } as never);

    await expect(safeGetSession(supabase)).resolves.toEqual({ session: mockSession, user: mockUser });
  });
});
