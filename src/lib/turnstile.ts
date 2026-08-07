import { TURNSTILE_SECRET_KEY } from '$env/static/private';
import { dev } from '$app/environment';

// Cloudflare Turnstile test secret: siteverify always returns success. Pairs
// with the test site key the widget uses during dev so local testing works.
const SECRET = dev ? '1x0000000000000000000000000000000AA' : TURNSTILE_SECRET_KEY;

/**
 * Verifica un token de Cloudflare Turnstile desde el servidor.
 * Retorna true si el token es válido, false en caso contrario.
 */
export async function verifyTurnstileToken(token: string): Promise<boolean> {
  if (!token) return false;

  try {
    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: SECRET,
          response: token,
        }),
      }
    );

    const data = await response.json();
    return data.success === true;
  } catch {
    return false;
  }
}