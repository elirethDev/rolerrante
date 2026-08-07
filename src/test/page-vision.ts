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

/*
 * REQ-FS-01 / REQ-FS-04: one density (md) per player page and the correct
 * page-type max-w token. No sm/lg Field size tokens, no ad-hoc max-w-xl.
 */
export function expectPlayerPageTokens(source: string, maxW: string): void {
  expect(source).not.toMatch(/size="sm"/);
  expect(source).not.toMatch(/size="lg"/);
  expect(source).not.toMatch(/max-w-xl/);
  expect(source).toContain(maxW);
}

/*
 * REQ-PF-02 (auth pages, new AuthShell contract): the page delegates its
 * container to the AuthShell primitive instead of declaring a max-w token of
 * its own. Same density guard as expectPlayerPageTokens, plus the auth shell
 * must be wired in (the max-w-[440px] container lives INSIDE AuthShell, so it
 * cannot appear on the page source).
 */
export function expectPlayerAuthTokens(source: string): void {
  expect(source).not.toMatch(/size="sm"/);
  expect(source).not.toMatch(/size="lg"/);
  expect(source).not.toMatch(/max-w-xl/);
  expect(source).toContain('AuthShell');
}

/**
 * Rendered-DOM structural contract for a player page:
 *  - an outer wrapper (section or div) carries the page max-w token (REQ-FS-04);
 *    the OD design-system migration restyled some pages from <section> to a
 *    <div className="max-w-..."> wrapper, so accept any tag that carries the
 *    class. The class may be an arbitrary Tailwind width (e.g. max-w-[440px]),
 *    which cannot appear inside a CSS selector, so we match via classList.
 *  - exactly `count` fieldset groups, all with a .fieldset legend (REQ-FS-02)
 *  - exactly one density: no sm/lg fieldset anywhere (REQ-FS-01)
 */
export function expectRenderedPlayerForm(
  container: HTMLElement,
  maxW: string,
  count: number,
): void {
  const wrapper = [...container.querySelectorAll<HTMLElement>('section, div, form')].find((el) =>
    el.classList.contains(maxW),
  );
  expect(wrapper, `expected a wrapper with class "${maxW}"`).toBeTruthy();

  const fieldsets = container.querySelectorAll('fieldset');
  expect(fieldsets.length).toBe(count);
  fieldsets.forEach((fs) => {
    expect(fs).toHaveClass('fieldset');
    expect(fs.querySelector('legend.fieldset-legend')).not.toBeNull();
  });

  expect(container.querySelectorAll('fieldset.fieldset-sm, fieldset.fieldset-lg')).toHaveLength(0);
}

/*
 * OD re-render contract for auth pages (od-auth2): the AuthShell renders the
 * OD `.auth-card` and the page renders a `.auth-form` where each field is an
 * inline `.field` div (label + input.input), replacing the daisyUI Fieldset.
 */
export function expectRenderedAuthForm(container: HTMLElement, fieldCount: number): void {
  const card = container.querySelector('.auth-card');
  expect(card, 'expected an OD .auth-card').toBeTruthy();

  const form = container.querySelector('form.auth-form');
  expect(form, 'expected an OD .auth-form').toBeTruthy();

  const fields = form!.querySelectorAll('div.field');
  expect(fields.length).toBe(fieldCount);
  fields.forEach((field) => {
    expect(field.querySelector('label')).not.toBeNull();
    expect(field.querySelector('input.input')).not.toBeNull();
  });

  expect(container.querySelectorAll('fieldset')).toHaveLength(0);
}
