/* eslint-disable @typescript-eslint/no-explicit-any -- action test mock */
import { describe, expect, it } from 'vitest';
import { actions } from './+page.server';
import { makeSupabase as makeSupabaseMock } from '../../../tests/helpers/supabase-mock';

const defaultFn = actions.default as unknown as (...args: unknown[]) => Promise<any>;

// Mínimo WebP válido (RIFF....WEBP) 1x1 — parseWebpDimensions abre el header.
const webpBytes = new Uint8Array([
  0x52,0x49,0x46,0x46, 0x00,0x00,0x00,0x00, 0x57,0x45,0x42,0x50, 0x56,0x50,0x38,0x20,
  0x00,0x00,0x00,0x00, 0x00,0x00,0x00,0x00, 0x00,0x00,0x00,0x00, 0x00,0x00,0x00,0x00,
]);

function makeLocalWithStorage(over: Record<string, unknown> = {}) {
  let stored: unknown = null;
  let uploadError: unknown = null;
  const base = makeSupabaseMock({ tables: { characters: [], events: [], stories: [], notifications: [] } });
  const supabase = Object.assign({}, base, {
    storage: {
      from: () => ({
        upload: async (path: string, bytes: Uint8Array, opts?: unknown) => {
          stored = { path, bytes, opts };
          return { error: uploadError, data: { path } };
        },
      }),
    },
  });
  return {
    supabase,
    captured: () => ({ stored }),
    setUploadError: (e: unknown) => (uploadError = e),
  };
}

function makeEvent(supabase: unknown, formData: FormData) {
  return {
    request: { formData: async () => formData },
    locals: { supabase, user: { id: 'u1' }, profile: { id: 'u1', username: 'pablo', display_name: 'Pablo', role: 'rolero' } },
  } as any;
}

describe('perfil default action — avatar upload reproduction', () => {
  it('upload path: sets avatar from a valid WebP file', async () => {
    const ctx = makeLocalWithStorage();
    const fd = new FormData();
    fd.set('display_name', 'Pablo');
    fd.set('avatar_file', new File([webpBytes], 'avatar.webp', { type: 'image/webp' }));
    const res = await defaultFn(makeEvent(ctx.supabase, fd) as any);
    console.log('RESULT:', JSON.stringify(res));
    expect(res).toBeDefined();
  });

  it('no-file path: uses avatar_url', async () => {
    const ctx = makeLocalWithStorage();
    const fd = new FormData();
    fd.set('display_name', 'Pablo');
    fd.set('avatar_url', '');
    const res = await defaultFn(makeEvent(ctx.supabase, fd) as any);
    console.log('RESULT2:', JSON.stringify(res));
    expect(res).toBeDefined();
  });
});
