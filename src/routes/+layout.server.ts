import { getUnreadCount } from '$lib/forum';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals: { session, profile, user, supabase } }) => {
  // Bell badge data (REQ-NOTIF-02): unread notifications for authenticated
  // users only. A failure here must not take the whole app down — the badge
  // degrades to 0 and the console logs the reason.
  let unreadCount = 0;
  if (user) {
    try {
      unreadCount = await getUnreadCount(user.id, supabase);
    } catch (e) {
      console.error('getUnreadCount falló', e);
    }
  }
  return { session, profile, user, unreadCount };
};
