import { PUBLIC_SUPABASE_URL } from '$env/static/public';

/** Hard cap for a single avatar upload (spec REQ-AVUP-03). */
export const AVATAR_MAX_BYTES = 150_000;
/** Square output size produced by the client cropper (REQ-AVUP-01). */
export const AVATAR_OUTPUT_SIZE = 512;
/** Minimum allowed avatar dimension (REQ-AVUP-03). */
export const AVATAR_MIN_DIM = 64;
/** Maximum allowed avatar dimension (REQ-AVUP-03). */
export const AVATAR_MAX_DIM = 1024;

export type AvatarKind = 'profile' | 'character';

export interface AvatarUploadResult {
  ok: true;
}
export interface AvatarUploadError {
  ok: false;
  error: string;
}

/** Magic-byte check for a WebP container: RIFF at 0..3, WEBP at 8..11. */
export function isWebP(bytes: Uint8Array): boolean {
  if (!bytes || bytes.length < 12) return false;
  const readAscii = (i: number) => bytes[i];
  return (
    readAscii(0) === 0x52 && // R
    readAscii(1) === 0x49 && // I
    readAscii(2) === 0x46 && // F
    readAscii(3) === 0x46 && // F
    readAscii(8) === 0x57 && // W
    readAscii(9) === 0x45 && // E
    readAscii(10) === 0x42 && // B
    readAscii(11) === 0x50 // P
  );
}

/**
 * Read WebP canvas dimensions straight from the container header without a
 * decoder. Supports the three real-world chunk types: VP8X (extended), VP8L
 * (lossless) and VP8 (lossy). Returns null when the input is not a WebP file.
 */
export function parseWebpDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (!isWebP(bytes)) return null;
  const u32le = (i: number) =>
    bytes[i] | (bytes[i + 1] << 8) | (bytes[i + 2] << 16) | ((bytes[i + 3] << 24) >>> 0);
  const u24le = (i: number) => bytes[i] | (bytes[i + 1] << 8) | (bytes[i + 2] << 16);

  // Chunk walk: 12-byte RIFF/WEBP header, then FourCC + u32 size + payload.
  let pos = 12;
  const len = bytes.length;
  while (pos + 8 <= len) {
    const fourCC = String.fromCharCode(bytes[pos], bytes[pos + 1], bytes[pos + 2], bytes[pos + 3]);
    const size = u32le(pos + 4);
    const payload = pos + 8;
    if (payload + size > len) return null;

    if (fourCC === 'VP8X' && size >= 10) {
      // Extended: canvas size stored as (w-1)/(h-1) in 24-bit LE at payload+4.
      return { width: u24le(payload + 4) + 1, height: u24le(payload + 7) + 1 };
    }
    if (fourCC === 'VP8L' && size >= 5 && bytes[payload] === 0x2f) {
      // Lossless: 14-bit (w-1) then 14-bit (h-1) packed little-endian after the 0x2f signature.
      const packed = u32le(payload + 1);
      return { width: (packed & 0x3fff) + 1, height: ((packed >> 14) & 0x3fff) + 1 };
    }
    if (fourCC === 'VP8 ' && size >= 10) {
      // Lossy: frame tag (0x9d 0x01 0x2a) then 14-bit width/height at payload+6.
      if (bytes[payload] === 0x9d && bytes[payload + 1] === 0x01 && bytes[payload + 2] === 0x2a) {
        const width = bytes[payload + 6] | ((bytes[payload + 7] & 0x3f) << 8);
        const height = bytes[payload + 8] | ((bytes[payload + 9] & 0x3f) << 8);
        return { width, height };
      }
    }

    pos = payload + size;
  }
  return null;
}

/**
 * Reduce an arbitrary user-supplied filename to a safe slug: no path
 * separators, no control chars, no surprises. Used for the storage object name
 * so the stored path can never traverse the owner prefix (REQ-AVUP-03).
 */
export function sanitizeAvatarFilename(raw: string): string {
  const cleaned = String(raw ?? '')
    .normalize('NFKD')
    .split('')
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      return code >= 0x20 && code !== 0x7f;
    })
    .join('')
    .replace(/[\\/:*?"<>|#%&{}$!'@+=]/g, '')
    .replace(/[.\s]+/g, '-')
    .replace(/-+|\.+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return cleaned || 'avatar';
}

/** Validate an uploaded avatar against the strict server rules (REQ-AVUP-03). */
export function validateAvatarUpload(input: {
  bytes: Uint8Array;
  size: number;
  name?: string;
}): AvatarUploadResult | AvatarUploadError {
  if (input.size <= 0) return { ok: false, error: 'Sube una imagen para usarla como avatar.' };
  if (input.size > AVATAR_MAX_BYTES) {
    return { ok: false, error: `La imagen supera el máximo permitido de ${AVATAR_MAX_BYTES} bytes.` };
  }
  if (!isWebP(input.bytes)) {
    return { ok: false, error: 'El archivo debe ser una imagen WebP.' };
  }
  const dims = parseWebpDimensions(input.bytes);
  if (!dims) return { ok: false, error: 'No se pudo leer la dimensión de la imagen.' };
  if (dims.width !== dims.height) {
    return { ok: false, error: 'El avatar debe ser una imagen cuadrada (1:1).' };
  }
  if (dims.width < AVATAR_MIN_DIM || dims.width > AVATAR_MAX_DIM) {
    return { ok: false, error: `El avatar debe medir entre ${AVATAR_MIN_DIM} y ${AVATAR_MAX_DIM}px por lado.` };
  }
  return { ok: true };
}

/** Storage object path (bucket root is `avatars`), owner-scoped (REQ-AVUP-04). */
export function buildAvatarPath(kind: AvatarKind, ownerId: string, filename: string): string {
  const prefix = kind === 'profile' ? 'avatars' : 'char-avatars';
  return `${prefix}/${ownerId}/${sanitizeAvatarFilename(filename)}.webp`;
}

/** Public URL of a stored avatar object (the avatars bucket is public). */
export function avatarPublicUrl(path: string): string {
  const base = PUBLIC_SUPABASE_URL.replace(/\/+$/, '');
  return `${base}/storage/v1/object/public/avatars/${path}`;
}
