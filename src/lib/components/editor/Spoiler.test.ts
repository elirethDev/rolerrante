import { describe, expect, it } from 'vitest';
import { Spoiler } from './Spoiler';

describe('Spoiler Node (REQ-SPOIL-01.1)', () => {
  it('defines an inline node named "spoiler"', () => {
    expect(Spoiler.name).toBe('spoiler');
    expect(Spoiler.config.inline).toBe(true);
    expect(Spoiler.config.group).toBe('inline');
  });

  it('parses span[data-type="spoiler"] from authoring HTML', () => {
    const rules = (Spoiler.config.parseHTML as () => { tag: string }[])();
    expect(rules).toEqual([{ tag: 'span[data-type="spoiler"]' }]);
  });

  it('renders a focusable span.spoiler[data-type] via renderHTML', () => {
    const domSpec = (Spoiler.config.renderHTML as (p: {
      node: unknown;
      HTMLAttributes: Record<string, string>;
    }) => [string, Record<string, string>])({ node: {}, HTMLAttributes: {} });

    expect(domSpec[0]).toBe('span');
    const attrs = domSpec[1];
    expect(attrs['data-type']).toBe('spoiler');
    expect(attrs.class).toContain('spoiler');
    expect(attrs.tabindex).toBe('0');
  });

  it('preserves authoring attributes merged into the rendered span', () => {
    const domSpec = (Spoiler.config.renderHTML as (p: {
      node: unknown;
      HTMLAttributes: Record<string, string>;
    }) => [string, Record<string, string>])({
      node: {},
      HTMLAttributes: { id: 's1', 'aria-label': 'spoiler content' },
    });

    const attrs = domSpec[1];
    expect(attrs.id).toBe('s1');
    expect(attrs['aria-label']).toBe('spoiler content');
    expect(attrs['data-type']).toBe('spoiler');
  });
});
