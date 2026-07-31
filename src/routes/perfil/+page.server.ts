import { fail } from '@sveltejs/kit';
import { requireAuth } from '$lib/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { profile, user } }) => {
  requireAuth({ user, profile } as App.Locals);
  return { profile: profile! };
};

export const actions: Actions = {
  default: async ({ request, locals: { supabase, user, profile } }) => {
    requireAuth({ user, profile } as App.Locals);
    const form = await request.formData();
    const displayName = String(form.get('display_name') ?? '').trim();
    const avatarUrl = String(form.get('avatar_url') ?? '').trim() || null;

    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName || profile?.username, avatar_url: avatarUrl, updated_at: new Date().toISOString() })
      .eq('id', user!.id);

    if (error) return fail(400, { message: error.message });
    return { success: true };
  },
};
