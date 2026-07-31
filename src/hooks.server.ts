import type { Handle } from '@sveltejs/kit';
import { loadSupabase } from '$lib/supabase/server';
import { checkRateLimit, getClientIP } from '$lib/rateLimit';

const CSP = "default-src 'self'; script-src 'self' https://challenges.cloudflare.com 'unsafe-inline'; style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; font-src 'self' https://fonts.gstatic.com; frame-src https://challenges.cloudflare.com; img-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co";

// Rutas de formularios que necesitan rate limiting
const FORM_ROUTES = new Set([
  '/login',
  '/registro',
  '/personajes/nuevo',
  '/historias/nueva',
  '/eventos/nuevo',
]);

export const handle: Handle = async ({ event, resolve }) => {
  // Rate limiting en formularios
  if (event.request.method === 'POST' && FORM_ROUTES.has(event.url.pathname)) {
    const ip = getClientIP(event.request);
    const { allowed } = checkRateLimit(ip, { maxRequests: 10, windowMs: 60_000 });
    if (!allowed) {
      return new Response(JSON.stringify({ message: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  event.locals.supabase = loadSupabase(event.cookies);

  event.locals.safeGetSession = async () => {
    const {
      data: { session },
    } = await event.locals.supabase.auth.getSession();
    if (!session) {
      return { session: null, user: null };
    }

    const {
      data: { user },
      error,
    } = await event.locals.supabase.auth.getUser();
    if (error) {
      return { session: null, user: null };
    }

    return { session, user };
  };

  const { session, user } = await event.locals.safeGetSession();
  event.locals.session = session;
  event.locals.user = user;

  if (user) {
    const { data: profile } = await event.locals.supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    event.locals.profile = profile ?? null;
  } else {
    event.locals.profile = null;
  }

  const response = await resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range' || name === 'x-supabase-api-version';
    },
  });

  // Headers de seguridad
  response.headers.set('content-security-policy', CSP);
  response.headers.set('x-frame-options', 'DENY');
  response.headers.set('x-content-type-options', 'nosniff');
  response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  response.headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('strict-transport-security', 'max-age=31536000; includeSubDomains; preload');

  return response;
};