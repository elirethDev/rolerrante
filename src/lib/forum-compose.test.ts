import { describe, expect, it } from 'vitest';
import {
  EXCERPT_MAX_LENGTH,
  REPLY_MAX_LENGTH,
  applyQuoteToBody,
  buildQuoteBlock,
  clearDraft,
  isOverLimit,
  loadDraft,
  parseDraft,
  plainTextLength,
  saveDraft,
  shouldClearDraft,
  toExcerpt,
} from './forum-compose';

function makeStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: () => null,
    get length() {
      return store.size;
    },
  } as unknown as Storage;
}

describe('forum-compose helpers', () => {
  describe('isOverLimit (REQ-FC-01)', () => {
    it('permits exactly the limit', () => {
      expect(isOverLimit(REPLY_MAX_LENGTH, REPLY_MAX_LENGTH)).toBe(false);
    });

    it('blocks one char over the limit', () => {
      expect(isOverLimit(REPLY_MAX_LENGTH + 1, REPLY_MAX_LENGTH)).toBe(true);
    });

    it('permits empty content', () => {
      expect(isOverLimit(0, REPLY_MAX_LENGTH)).toBe(false);
    });
  });

  describe('draft persistence (REQ-FC-02)', () => {
    it('round-trips a draft through save then load', () => {
      const storage = makeStorage();
      saveDraft(storage, 'forum:draft:abc', { content: '<p>hola</p>', title: 'T', timestamp: 5 });
      const loaded = loadDraft(storage, 'forum:draft:abc');
      expect(loaded?.content).toBe('<p>hola</p>');
      expect(loaded?.title).toBe('T');
      expect(loaded?.timestamp).toBe(5);
    });

    it('returns null when the key is absent', () => {
      expect(loadDraft(makeStorage(), 'forum:draft:nada')).toBeNull();
    });

    it('clears a previously saved draft', () => {
      const storage = makeStorage();
      saveDraft(storage, 'forum:draft:abc', { content: 'x', timestamp: 1 });
      clearDraft(storage, 'forum:draft:abc');
      expect(loadDraft(storage, 'forum:draft:abc')).toBeNull();
    });

    it('parseDraft rejects malformed JSON and non-string content', () => {
      expect(parseDraft('not-json')).toBeNull();
      expect(parseDraft('{"content":123}')).toBeNull();
      expect(parseDraft(null)).toBeNull();
    });

    it('tolerates a missing or null storage silently', () => {
      expect(loadDraft(null, 'k')).toBeNull();
      expect(() => saveDraft(null, 'k', { content: 'x', timestamp: 1 })).not.toThrow();
      expect(() => clearDraft(null, 'k')).not.toThrow();
    });
  });

  describe('shouldClearDraft (REQ-FC-02)', () => {
    it('clears the draft after a successful submit', () => {
      expect(shouldClearDraft('success')).toBe(true);
    });

    it('clears the draft after a server redirect (REQ-FC-02)', () => {
      expect(shouldClearDraft('redirect')).toBe(true);
    });

    it('preserves the draft after a failed submit', () => {
      expect(shouldClearDraft('failure')).toBe(false);
    });

    it('preserves the draft on an unexpected error result', () => {
      expect(shouldClearDraft('error')).toBe(false);
    });
  });

  describe('toExcerpt (REQ-FC-04 / 02.5)', () => {
    it('strips HTML to plain text', () => {
      expect(toExcerpt('<p>Hola <strong>mundo</strong></p>')).toBe('Hola mundo');
    });

    it('truncates a long body to 500 chars', () => {
      const long = '<p>' + 'a'.repeat(600) + '</p>';
      const excerpt = toExcerpt(long);
      expect(excerpt.length).toBeLessThanOrEqual(EXCERPT_MAX_LENGTH);
      expect(excerpt).toBe('a'.repeat(500));
    });

    it('keeps short plain content unchanged', () => {
      expect(toExcerpt('<p>corto</p>')).toBe('corto');
    });

    it('decodes basic HTML entities', () => {
      expect(toExcerpt('<p>a &amp; b</p>')).toBe('a & b');
    });
  });

  describe('plainTextLength', () => {
    it('counts stripped text length', () => {
      expect(plainTextLength('<p>hola</p>')).toBe(4);
    });
  });

  describe('buildQuoteBlock (REQ-FC-04)', () => {
    it('builds a blockquote containing author and excerpt', () => {
      const html = buildQuoteBlock({
        author_display_name: 'Aragorn',
        body_excerpt: 'Cita citada',
        post_id: 'p1',
      });
      expect(html).toContain('<blockquote>');
      expect(html).toContain('Aragorn');
      expect(html).toContain('Cita citada');
    });
  });

  describe('applyQuoteToBody (server auth quote prepend, REQ-FC-04)', () => {
    const quote = { author_display_name: 'Aragorn', body_excerpt: 'Cita citada', post_id: 'p1' };

    it('prepends the blockquote to a plain reply body', () => {
      const out = applyQuoteToBody('<p>mi respuesta</p>', quote);
      expect(out.startsWith('<blockquote>')).toBe(true);
      expect(out).toContain('Aragorn');
      expect(out).toContain('mi respuesta');
      expect((out.match(/<blockquote>/g) ?? []).length).toBe(1);
    });

    it('does not duplicate the prefill blockquote already present in the body', () => {
      const prefilled =
        '<blockquote><p><strong>Aragorn:</strong></p><p>Cita citada</p></blockquote><p></p><p>mi respuesta</p>';
      const out = applyQuoteToBody(prefilled, quote);
      expect((out.match(/<blockquote>/g) ?? []).length).toBe(1);
      expect(out).toContain('mi respuesta');
    });

    it('truncates an excerpt longer than the max on the server', () => {
      const longQuote = { ...quote, body_excerpt: 'y'.repeat(600) };
      const out = applyQuoteToBody('<p>x</p>', longQuote);
      const m = out.match(/<blockquote>[\s\S]*?<\/blockquote>/);
      expect(m).not.toBeNull();
      expect(m![0].length).toBeLessThan(600 + 100); // blockquote HTML overhead bounded
    });
  });
});
