import { fail } from '@sveltejs/kit';
import { requireAuth } from '$lib/auth';
import { markNotificationsRead, type NotificationView } from '$lib/forum';
import type { Actions, PageServerLoad } from './$types';

/**
 * Notification center (REQ-NOTIF-02). Guests are redirected to /login — the
 * bell is only rendered for authenticated users. The list is scoped to the
 * recipient by RLS and ordered newest-first.
 */
export const load: PageServerLoad = async ({ locals: { supabase, user, profile } }) => {
  requireAuth({ user, profile });

  const { data, error } = await supabase
    .from('notifications')
    .select('*, actor:actor_id(id, display_name, username), thread:thread_id(id, title)')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return { notifications: (data ?? []) as unknown as NotificationView[] };
};

export const actions: Actions = {
  /**
   * Mark the visiting user's notifications as read (REQ-NOTIF-02: visit marks
   * all read). Fired once from the page on mount; the notifications UPDATE RLS
   * policy (recipient-only) confines the write to the user's own rows.
   */
  markRead: async ({ locals: { supabase, user, profile } }) => {
    requireAuth({ user, profile });
    try {
      await markNotificationsRead(user!.id, supabase);
    } catch (e) {
      return fail(400, { message: (e as Error).message });
    }
    return { ok: true };
  },
};
