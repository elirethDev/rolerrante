import type { QuotePayload } from './forum';

/** Max content length (REQ-FC-01). */
export const REPLY_MAX_LENGTH = 8192;

/** Max plain-text excerpt length emitted by Citar (REQ-FC-04 / 02.5). */
export const EXCERPT_MAX_LENGTH = 500;

/** Autosave localStorage schema: `forum:draft:{threadId}` or `forum:draft:nuevo`. */
export interface DraftData {
  content: string;
  title?: string;
  timestamp: number;
}

/** True when content exceeds the limit and submit should soft-block (REQ-FC-01). */
export function isOverLimit(count: number, limit: number = REPLY_MAX_LENGTH): boolean {
  return count > limit;
}

/** Parse raw localStorage JSON into a valid DraftData, or null when malformed. */
export function parseDraft(raw: string | null): DraftData | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw) as Partial<DraftData>;
    if (d && typeof d.content === 'string') {
      return {
        content: d.content,
        title: typeof d.title === 'string' ? d.title : undefined,
        timestamp: typeof d.timestamp === 'number' ? d.timestamp : Date.now(),
      };
    }
  } catch {
    return null;
  }
  return null;
}

export function loadDraft(storage: Storage | null, key: string): DraftData | null {
  if (!storage) return null;
  return parseDraft(storage.getItem(key));
}

export function saveDraft(storage: Storage | null, key: string, data: DraftData): void {
  storage?.setItem(key, JSON.stringify(data));
}

export function clearDraft(storage: Storage | null, key: string): void {
  storage?.removeItem(key);
}

/**
 * A successful submit clears the draft; a failed submit preserves it (REQ-FC-02).
 * Forum actions end with `throw redirect(303, …)`, so SvelteKit `enhance` reports
 * a successful post as `result.type === 'redirect'` (not `'success'`). Treat both
 * as success for clearing; `'failure'`/`'error'` must preserve the draft.
 */
export function shouldClearDraft(resultType: string): boolean {
  return resultType === 'success' || resultType === 'redirect';
}

/** Strip HTML to plain text and truncate to at most max chars (REQ-FC-04 / 02.5). */
export function toExcerpt(html: string, max: number = EXCERPT_MAX_LENGTH): string {
  if (!html) return '';
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  return text.length <= max ? text : text.slice(0, max).trim();
}

/** Number of plain-text characters in HTML content (used to seed the counter). */
export function plainTextLength(html: string): number {
  if (!html) return 0;
  return toExcerpt(html, Infinity).length;
}

/** Build the blockquote HTML prefilled into the composer (REQ-FC-04). */
export function buildQuoteBlock(
  quote: QuotePayload,
  max: number = EXCERPT_MAX_LENGTH,
): string {
  const excerpt = toExcerpt(quote.body_excerpt, max);
  return `<blockquote><p><strong>${quote.author_display_name}:</strong></p><p>${excerpt}</p></blockquote><p></p>`;
}
