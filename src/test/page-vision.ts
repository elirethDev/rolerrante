// Shared page-vision assertions for the forms-visual-pass player-forms slice.
//
// Field renders markup identical to the inline `<fieldset class="fieldset">` it
// replaces, so the DOM alone cannot prove a page uses the primitive. The RED
// driver therefore inspects the PAGE SOURCE (the design's "tests/current markup"
// surface): no inline `<fieldset>`/`<legend>` remains and every Field is md.
// The rendered-DOM checks then prove the structural contract (fieldset+legend
// always, one md density, correct max-w container).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect } from 'vitest';

/**
 * Read the `+page.svelte` source for a route under test.
 * `pagePath` is relative to the test file (resolved against its import.meta.url).
 */
export function readPageSource(pagePath: string, testMetaUrl: string): string {
  return readFileSync(fileURLToPath(new URL(pagePath, testMetaUrl)), 'utf-8');
}

/**
 * REQ-PF-01 / REQ-FS-02: the page must NOT contain inline fieldset/legend
 * markup — every field group goes through the `Field` primitive.
 * Fails (RED) while inline fieldsets remain; passes (GREEN) after migration.
 */
export function expectNoInlineFieldsetMarkup(source: string): void {
  expect(source).not.toMatch(/<fieldset/i);
  expect(source).not.toMatch(/<legend/i);
}

/**
 * REQ-FS-01 / REQ-FS-04: one density (md) per player page and the correct
 * page-type max-w token. No sm/lg Field size tokens, no ad-hoc max-w-xl.
 */
export function expectPlayerPageTokens(source: string, maxW: string): void {
  expect(source).not.toMatch(/size="sm"/);
  expect(source).not.toMatch(/size="lg"/);
  expect(source).not.toMatch(/max-w-xl/);
  expect(source).toContain(maxW);
}

/**
 * Rendered-DOM structural contract for a player page:
 *  - outer <section> carries the page max-w token (REQ-FS-04)
 *  - exactly `count` fieldset groups, all with a .fieldset legend (REQ-FS-02)
 *  - exactly one density: no sm/lg fieldset anywhere (REQ-FS-01)
 */
export function expectRenderedPlayerForm(
  container: HTMLElement,
  maxW: string,
  count: number,
): void {
  const section = container.querySelector('section');
  expect(section).not.toBeNull();
  expect(section).toHaveClass(maxW);

  const fieldsets = container.querySelectorAll('fieldset');
  expect(fieldsets.length).toBe(count);
  fieldsets.forEach((fs) => {
    expect(fs).toHaveClass('fieldset');
    expect(fs.querySelector('legend.fieldset-legend')).not.toBeNull();
  });

  expect(container.querySelectorAll('fieldset.fieldset-sm, fieldset.fieldset-lg')).toHaveLength(0);
}
