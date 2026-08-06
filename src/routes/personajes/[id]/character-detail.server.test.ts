/* eslint-disable no-unused-vars, @typescript-eslint/no-explicit-any -- mock helper types intentionally loose */
import { describe, expect, it } from 'vitest';
import { load } from './+page.server';

const loadFn = load as unknown as (...args: unknown[]) => Promise<any>;

const makeCharacter = (p: Record<string, unknown> = {}) => ({
  id: 'char-1',
  player_id: 'owner-1',
  name: 'Aragorn',
  race: { name: 'Dúnedain', group_name: 'Reinos Aliados' },
  status: 'aprobado',
  review_notes: 'Ficha repetida, corregir',
  reviewed_by: 'gm-1',
  reviewed_at: '2026-08-03T00:00:00Z',
  created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-08-01T00:00:00Z',
  rp_points: 5,
  skills: [],
  stories: [],
  ...p,
});

const makeSupabase = (character: unknown) => {
  const from = (table: string) => {
    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: () => builder,
      single: () => Promise.resolve({ data: table === 'characters' ? character : null, error: null }),
    };
    return builder;
  };
  return { from };
};

const makeLocals = (supabase: ReturnType<typeof makeSupabase>, role: string, userId = 'other-1') =>
  ({ supabase, user: { id: userId }, profile: { id: userId, role } }) as never;

const makeEvent = (locals: ReturnType<typeof makeLocals>) =>
  ({ locals, params: { id: 'char-1' }, url: new URL('http://localhost/personajes/char-1') }) as never;

describe('personajes/[id] load review-field scoping (SEC-16)', () => {
  it('strips review_notes and reviewed_by for a non-staff viewer', async () => {
    const supabase = makeSupabase(makeCharacter());
    const result = await loadFn(makeEvent(makeLocals(supabase, 'rolero', 'other-1')));
    expect(result.character.name).toBe('Aragorn'); // content stays
    expect(result.character.review_notes).toBeUndefined();
    expect(result.character.reviewed_by).toBeUndefined();
  });

  it('keeps the public approval date (reviewed_at) for non-staff', async () => {
    const supabase = makeSupabase(makeCharacter());
    const result = await loadFn(makeEvent(makeLocals(supabase, 'rolero', 'other-1')));
    expect(result.character.reviewed_at).toBe('2026-08-03T00:00:00Z');
  });

  it('keeps the review fields for staff (GM/admin)', async () => {
    const supabase = makeSupabase(makeCharacter());
    const result = await loadFn(makeEvent(makeLocals(supabase, 'admin', 'gm-1')));
    expect(result.character.review_notes).toBe('Ficha repetida, corregir');
    expect(result.character.reviewed_by).toBe('gm-1');
  });
});
