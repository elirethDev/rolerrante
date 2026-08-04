import type { Cookies } from '@sveltejs/kit';

const AUTH_COOKIE_RE = /^sb-.*-auth-token(?:\.\d+)?$/;

/**
 * "Recordarme" server-side: cuando el usuario desmarca el checkbox, convertimos
 * las cookies de sesión de Supabase en cookies de sesión de navegador (sin
 * maxAge largo) para que la sesión no sobreviva al cierre del navegador.
 *
 * Nota: esto vive en un módulo helper (no en un +page.server.ts) porque el
 * build de SvelteKit rechaza exports no estándar en los archivos de página.
 */
export const applyRememberMe = (cookies: Cookies): void => {
  const authCookies = cookies.getAll().filter(({ name }) => AUTH_COOKIE_RE.test(name));
  for (const { name, value } of authCookies) {
    cookies.set(name, value, { maxAge: undefined, path: '/' });
  }
};
