import { describe, expect, it } from "vitest";
import {
  AVATAR_MAX_BYTES,
  AVATAR_MAX_DIM,
  AVATAR_MIN_DIM,
  avatarPublicUrl,
  buildAvatarPath,
  isWebP,
  parseWebpDimensions,
  sanitizeAvatarFilename,
  validateAvatarUpload,
} from "../src/lib/avatars";

// --- WebP byte builders (spec REQ-AVUP-03: server reads dimensions from bytes) ---
function u32le(n: number): number[] {
  return [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff];
}
function u24le(n: number): number[] {
  return [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff];
}
/** Minimal RIFF/WEBP container with a VP8X chunk (extension) carrying canvas dims. */
function buildVp8x(width: number, height: number): Uint8Array {
  const total = 12 + 8 + 10;
  const bytes = [
    0x52,
    0x49,
    0x46,
    0x46, // "RIFF"
    ...u32le(total - 8), // RIFF size = file size - 8
    0x57,
    0x45,
    0x42,
    0x50, // "WEBP"
    0x56,
    0x50,
    0x38,
    0x58, // "VP8X"
    ...u32le(10), // chunk size
    0x00,
    0x00,
    0x00,
    0x00, // flags + reserved
    ...u24le(width - 1), // canvas width - 1 (24-bit LE)
    ...u24le(height - 1), // canvas height - 1 (24-bit LE)
  ];
  return new Uint8Array(bytes);
}
/** Minimal RIFF/WEBP container with a VP8L (lossless) chunk. */
function buildVp8l(width: number, height: number): Uint8Array {
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
    0x4c, // "VP8L"
    ...u32le(5), // chunk size
    0x2f, // signature
    ...u32le(packed),
  ];
  return new Uint8Array(bytes);
}

function fakeFile(size: number, bytes: Uint8Array, name = "avatar.webp") {
  return { bytes, size, name };
}

describe("isWebP (REQ-AVUP-03)", () => {
  it("accepts a RIFF/WEBP container", () => {
    expect(isWebP(buildVp8x(512, 512))).toBe(true);
  });
  it("rejects JPEG (no RIFF/WEBP magic)", () => {
    expect(
      isWebP(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0])),
    ).toBe(false);
  });
  it("rejects a RIFF container without the WEBP fourcc", () => {
    const bytes = new Uint8Array(12);
    bytes.set([0x52, 0x49, 0x46, 0x46], 0); // RIFF
    bytes.set([0x41, 0x56, 0x49, 0x20], 8); // "AVI "
    expect(isWebP(bytes)).toBe(false);
  });
  it("rejects too-short input", () => {
    expect(isWebP(new Uint8Array([0x52, 0x49]))).toBe(false);
  });
});

describe("parseWebpDimensions (REQ-AVUP-03)", () => {
  it("parses VP8X canvas dimensions", () => {
    expect(parseWebpDimensions(buildVp8x(512, 512))).toEqual({
      width: 512,
      height: 512,
    });
    expect(parseWebpDimensions(buildVp8x(64, 64))).toEqual({
      width: 64,
      height: 64,
    });
  });
  it("parses VP8L dimensions", () => {
    expect(parseWebpDimensions(buildVp8l(512, 512))).toEqual({
      width: 512,
      height: 512,
    });
    expect(parseWebpDimensions(buildVp8l(300, 900))).toEqual({
      width: 300,
      height: 900,
    });
  });
  it("detects non-square dimensions", () => {
    expect(parseWebpDimensions(buildVp8x(1024, 512))).toEqual({
      width: 1024,
      height: 512,
    });
  });
  it("returns null for non-webp bytes", () => {
    expect(
      parseWebpDimensions(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])),
    ).toBeNull();
  });
});

describe("sanitizeAvatarFilename (REQ-AVUP-03)", () => {
  it("keeps a plain name", () => {
    expect(sanitizeAvatarFilename("avatar")).toBe("avatar");
  });
  it("strips path separators and traversal chars", () => {
    expect(sanitizeAvatarFilename("../../avatar")).toBe("avatar");
    expect(sanitizeAvatarFilename("..\\evil\\avatar")).not.toMatch(/\.\./);
    expect(sanitizeAvatarFilename("..\\evil\\avatar")).not.toMatch(/[\\/]/);
    expect(sanitizeAvatarFilename("..\\evil\\avatar")).toMatch(/^[a-z0-9-]+$/);
  });
  it("collapses unsafe characters to dashes and trims", () => {
    expect(sanitizeAvatarFilename("mi  avatar!@#.png")).toBe("mi-avatar-png");
  });
  it("falls back to avatar when empty", () => {
    expect(sanitizeAvatarFilename("")).toBe("avatar");
    expect(sanitizeAvatarFilename("   /  /  ")).toBe("avatar");
  });
});

describe("buildAvatarPath (REQ-AVUP-04)", () => {
  it("builds the profile path with the owner id", () => {
    expect(buildAvatarPath("profile", "user-1", "avatar")).toBe(
      "avatars/user-1/avatar.webp",
    );
  });
  it("builds the character path with the character id", () => {
    expect(buildAvatarPath("character", "char-1", "retrato")).toBe(
      "char-avatars/char-1/retrato.webp",
    );
  });
  it("sanitizes the filename inside the path", () => {
    expect(buildAvatarPath("profile", "u1", "../../x")).toBe(
      "avatars/u1/x.webp",
    );
  });
});

describe("avatarPublicUrl", () => {
  it("builds the public storage URL for the avatars bucket", () => {
    expect(avatarPublicUrl("avatars/u1/avatar.webp")).toContain(
      "https://example.supabase.co/storage/v1/object/public/avatars/avatars/u1/avatar.webp",
    );
  });
});

describe("validateAvatarUpload (REQ-AVUP-03)", () => {
  it("accepts a valid square WebP within limits", () => {
    expect(validateAvatarUpload(fakeFile(90_000, buildVp8x(512, 512)))).toEqual(
      { ok: true },
    );
  });
  it("rejects a file larger than the max bytes", () => {
    const r = validateAvatarUpload(
      fakeFile(AVATAR_MAX_BYTES + 1, buildVp8x(512, 512)),
    );
    expect(r.ok).toBe(false);
  });
  it("rejects non-WebP bytes", () => {
    const r = validateAvatarUpload(
      fakeFile(10_000, new Uint8Array([0xff, 0xd8, 0xff, 0xe0])),
    );
    expect(r.ok).toBe(false);
  });
  it("rejects non-square dimensions", () => {
    const r = validateAvatarUpload(fakeFile(10_000, buildVp8x(1024, 512)));
    expect(r.ok).toBe(false);
  });
  it("rejects dimensions above the allowed max", () => {
    const r = validateAvatarUpload(
      fakeFile(10_000, buildVp8x(AVATAR_MAX_DIM + 1, AVATAR_MAX_DIM + 1)),
    );
    expect(r.ok).toBe(false);
  });
  it("rejects dimensions below the allowed min", () => {
    const r = validateAvatarUpload(
      fakeFile(10_000, buildVp8x(AVATAR_MIN_DIM - 1, AVATAR_MIN_DIM - 1)),
    );
    expect(r.ok).toBe(false);
  });
});
