/**
 * Rate limiting simple en memoria.
 * Almacena timestamps por IP y rechaza si excede el límite.
 * NOTA: En Cloudflare Pages cada isolate tiene su propia memoria,
 * por lo que esto es un límite aproximado, no exacto.
 * Para rate limiting exacto en edge, usar Cloudflare Rate Limiting.
 */

const stores = new Map<string, { count: number; resetAt: number }>();

interface RateLimitConfig {
  /** Máximo de requests permitidos en la ventana */
  maxRequests: number;
  /** Ventana de tiempo en milisegundos */
  windowMs: number;
}

const DEFAULTS: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 60_000, // 1 minuto
};

/**
 * Obtiene la IP del cliente, priorizando headers de Cloudflare.
 */
export function getClientIP(request: Request): string {
  // Cloudflare Pages envía la IP real en este header
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp;

  // Fallback: x-forwarded-for (para desarrollo local)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';

  return 'unknown';
}

export function checkRateLimit(
  ip: string,
  config: Partial<RateLimitConfig> = {}
): { allowed: boolean; remaining: number; resetAt: number } {
  const { maxRequests, windowMs } = { ...DEFAULTS, ...config };
  const now = Date.now();

  let entry = stores.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    stores.set(ip, entry);
  }

  entry.count++;
  const remaining = Math.max(0, maxRequests - entry.count);

  // Limpiar entradas expiradas cada 100 requests
  if (stores.size > 1000) {
    for (const [key, val] of stores) {
      if (now > val.resetAt) stores.delete(key);
    }
  }

  return {
    allowed: entry.count <= maxRequests,
    remaining,
    resetAt: entry.resetAt,
  };
}