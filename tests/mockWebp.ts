// Shared WebP byte builders for avatar tests: real RIFF/WEBP container bytes so
// the strict server validation (magic + dimension parsing) runs on real data.

function u32le(n: number): number[] {
  return [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff];
}
function u24le(n: number): number[] {
  return [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff];
}

/** Minimal RIFF/WEBP container with a VP8X (extended) chunk carrying canvas dims. */
export function buildVp8x(width: number, height: number): Uint8Array {
  const total = 12 + 8 + 10;
  const bytes = [
    0x52,
    0x49,
    0x46,
    0x46, // "RIFF"
    ...u32le(total - 8),
    0x57,
    0x45,
    0x42,
    0x50, // "WEBP"
    0x56,
    0x50,
    0x38,
    0x58, // "VP8X"
    ...u32le(10),
    0x00,
    0x00,
    0x00,
    0x00,
    ...u24le(width - 1),
    ...u24le(height - 1),
  ];
  return new Uint8Array(bytes);
}

/** Minimal RIFF/WEBP container with a VP8L (lossless) chunk. */
export function buildVp8l(width: number, height: number): Uint8Array {
  const packed = (width - 1) | ((height - 1) << 14);
  const total = 12 + 8 + 5;
  const bytes = [
    0x52,
    0x49,
    0x46,
    0x46,
    ...u32le(total - 8),
    0x57,
    0x45,
    0x42,
    0x50,
    0x56,
    0x50,
    0x38,
    0x4c,
    ...u32le(5),
    0x2f,
    ...u32le(packed),
  ];
  return new Uint8Array(bytes);
}

/** Copy a Uint8Array into a standalone ArrayBuffer (BlobPart-compatible). */
export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buf = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buf).set(bytes);
  return buf;
}

/** A valid WebP File-like object for form uploads in tests. */
export function webpFile(
  width = 512,
  height = 512,
  name = "avatar.webp",
): File {
  return new File([toArrayBuffer(buildVp8x(width, height))], name, {
    type: "image/webp",
  });
}
