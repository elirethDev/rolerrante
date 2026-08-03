import { describe, expect, it } from 'vitest';
import { validateForumHrefs } from './auth';

describe('validateForumHrefs (REQ-FORUM-03.5)', () => {
  it('accepts http and https hrefs', () => {
    const html = '<a href="https://example.com">ok</a><a href="http://other.org/path">ok2</a>';
    const result = validateForumHrefs(html);
    expect(result.valid).toBe(true);
    expect(result.rejected).toEqual([]);
  });

  it.each(['javascript:', 'data:', 'file:', 'ftp://x.com'])(
    'rejects %s protocol href',
    (protocol) => {
      const html = `<a href="${protocol}alert(1)">bad</a>`;
      const result = validateForumHrefs(html);
      expect(result.valid).toBe(false);
      expect(result.rejected).toContain(`${protocol}alert(1)`);
    }
  );

  it('rejects relative paths and unknown schemes', () => {
    const html = '<a href="/local">rel</a><a href="tel:123">tel</a>';
    const result = validateForumHrefs(html);
    expect(result.valid).toBe(false);
    expect(result.rejected.length).toBe(2);
  });

  it('returns valid when html has no anchors', () => {
    const result = validateForumHrefs('<p>no links</p>');
    expect(result.valid).toBe(true);
    expect(result.rejected).toEqual([]);
  });
});
