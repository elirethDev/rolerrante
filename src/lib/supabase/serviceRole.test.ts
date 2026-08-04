import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

// Override the dynamic env namespace with a getter that reads process.env at
// call time, mirroring SvelteKit's runtime behaviour (the module exports an
// `env` Proxy over process.env, not direct named exports).
vi.mock('$env/dynamic/private', () => ({
  get env() {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    return { SUPABASE_SERVICE_ROLE_KEY: key };
  },
}));

import { getLastAuditAction, getServiceRoleClient } from './serviceRole';

const createMockClient = (rows: unknown[] | null, error: unknown = null) => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: rows?.[0] ?? null, error }),
  };
  return { from: vi.fn().mockReturnValue(chain) } as unknown as Pick<SupabaseClient<Database>, 'from'>;
};

const KEY_BACKUP = process.env.SUPABASE_SERVICE_ROLE_KEY;

describe('service_role audit client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_SERVICE_ROLE_KEY = KEY_BACKUP;
  });
  afterEach(() => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = KEY_BACKUP;
  });

  it('returns null client when SUPABASE_SERVICE_ROLE_KEY is absent (graceful degrade)', () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const client = getServiceRoleClient();
    expect(client).toBeNull();
  });

  it('returns a real service_role client when the key is present', () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    const client = getServiceRoleClient();
    expect(client).not.toBeNull();
    expect(createClient).toHaveBeenCalled();
  });

  it('getLastAuditAction returns null when client is null (graceful degrade)', async () => {
    expect(await getLastAuditAction(null)).toBeNull();
  });

  it('getLastAuditAction maps the most recent audit row to the banner shape', async () => {
    const client = createMockClient([
      {
        action: 'aprobar',
        entity_type: 'ficha',
        entity_id: 'abc123456789',
        created_at: '2026-08-03T09:00:00.000Z',
        actor: { display_name: 'Arthas', username: 'arth' },
      },
    ]);
    const banner = await getLastAuditAction(client);
    expect(banner).toEqual({
      action: 'aprobar',
      entityType: 'ficha',
      entityId: 'abc123456789',
      actor: 'Arthas',
      createdAt: '2026-08-03T09:00:00.000Z',
    });
  });

  it('getLastAuditAction falls back to username when actor has no display_name', async () => {
    const client = createMockClient([
      {
        action: 'rechazar',
        entity_type: 'cronica',
        entity_id: 'xyz',
        created_at: '2026-08-02T09:00:00.000Z',
        actor: { display_name: null, username: 'jaina' },
      },
    ]);
    const banner = await getLastAuditAction(client);
    expect(banner?.actor).toBe('jaina');
  });

  it('getLastAuditAction returns null on query error', async () => {
    const client = createMockClient(null, { message: 'denied' });
    expect(await getLastAuditAction(client)).toBeNull();
  });
});
