/* eslint-disable no-unused-vars, @typescript-eslint/no-explicit-any -- mock helper types intentionally loose */
import { describe, expect, it } from 'vitest';
import { load } from './+page.server';

const loadFn = load as unknown as (...args: unknown[]) => Promise<any>;

const makeStory = (p: Record<string, unknown> = {}) => ({
  id: 'st-1',
  character_id: 'char-1',
  title: 'La saga',
  content: '<p>cronica</p>',
  status: 'aprobado',
  review_notes: 'Cronica de baja calidad, revisar',
  reviewed_by: 'gm-1',
  reviewed_at: '2026-08-03T00:00:00Z',
  created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-08-01T00:00:00Z',
  character: { id: 'char-1', name: 'Aragorn', player_id: 'owner-1', status: 'aprobado', player: { display_name: 'Aragorn', username: 'aragorn' } },
  ...p,
});

const makeSupabase = (story: unknown) => {
  const from = (table: string) => {
    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: () => builder,
      single: () => Promise.resolve({ data: table === 'stories' ? story : null, error: null }),
    };
    return builder;
  };
  return { from };
};

const makeLocals = (supabase: ReturnType<typeof makeSupabase>, role: string, userId = 'other-1') =>
  ({ supabase, user: { id: userId }, profile: { id: userId, role } }) as never;

const makeEvent = (locals: ReturnType<typeof makeLocals>) =>
  ({ locals, params: { id: 'st-1' }, url: new URL('http://localhost/historias/st-1') }) as never;

describe('historias/[id] load review-field scoping (SEC-16)', () => {
  it('strips review_notes and reviewed_by for a public (non-owner, non-staff) viewer', async () => {
    const supabase = makeSupabase(makeStory());
    const result = await loadFn(makeEvent(makeLocals(supabase, 'rolero', 'other-1')));
    expect(result.story.title).toBe('La saga'); // content stays
    expect(result.story.review_notes).toBeUndefined();
    expect(result.story.reviewed_by).toBeUndefined();
  });

  it('keeps review fields for the story author (rejection feedback)', async () => {
    const supabase = makeSupabase(makeStory({ status: 'rechazado' }));
    const result = await loadFn(makeEvent(makeLocals(supabase, 'rolero', 'owner-1')));
    expect(result.story.review_notes).toBe('Cronica de baja calidad, revisar');
    expect(result.story.reviewed_by).toBe('gm-1');
  });

  it('keeps review fields for staff (GM/admin)', async () => {
    const supabase = makeSupabase(makeStory());
    const result = await loadFn(makeEvent(makeLocals(supabase, 'gm', 'gm-1')));
    expect(result.story.review_notes).toBe('Cronica de baja calidad, revisar');
    expect(result.story.reviewed_by).toBe('gm-1');
  });
});
