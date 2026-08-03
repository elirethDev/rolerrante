import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(
  join(process.cwd(), 'src', 'lib', 'components', 'editor', 'spoiler.css'),
  'utf8',
);

describe('spoiler.css (REQ-SPOIL-01.2)', () => {
  it('hides spoiler text by default with transparent color', () => {
    expect(css).toMatch(/\.spoiler\s*\{[^}]*color:\s*transparent/i);
  });

  it('reveals spoiler text on hover via color revert', () => {
    expect(css).toMatch(/\.spoiler\s*:\s*hover\s*\{[^}]*color:\s*inherit/i);
  });

  it('reveals spoiler text on keyboard focus (:focus-visible) via color revert', () => {
    expect(css).toMatch(/\.spoiler\s*:\s*focus-visible\s*\{[^}]*color:\s*inherit/i);
  });
});
