import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * POST /api/presence/heartbeat (REQ-CP-02)
 * Marks the authenticated user's last_active_at via the SECURITY DEFINER RPC
 * `touch_presence()`. Only authenticated requests are accepted (401 otherwise)
 * and the route never reads or returns user data. On a Supabase error it
 * fail-closes to 200 with an empty body: the heartbeat is best-effort and must
 * never surface a 5xx to the client.
 */
export const POST: RequestHandler = async ({ locals: { user, supabase } }) => {
  if (!user) {
    return json({ message: 'No autorizado' }, { status: 401 });
  }

  try {
    await supabase.rpc('touch_presence');
  } catch (err) {
    console.error('[presence] heartbeat falló (fail-closed a 200)', err);
    return new Response(null, { status: 200 });
  }

  return new Response(null, { status: 204 });
};
