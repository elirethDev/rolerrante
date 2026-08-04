import { Node, mergeAttributes } from '@tiptap/core';

/**
 * Custom TipTap Spoiler Node (REQ-SPOIL-01.1).
 *
 * Renders inline spoiler content hidden until the reader reveals it via
 * hover or `:focus-visible` (keyboard). The reveal styling lives in
 * `spoiler.css`. Registration is owned by TipTapViewer in this change;
 * TipTapEditor registration is deferred to the S2 forum-composer change
 * (REQ-COMPOSER-STUB-01).
 */
export const Spoiler = Node.create({
  name: 'spoiler',
  group: 'inline',
  inline: true,
  selectable: true,
  content: 'text*',

  parseHTML() {
    return [{ tag: 'span[data-type="spoiler"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: 'spoiler',
        'data-type': 'spoiler',
        // REQ-SPOIL-01.3: focusable so :focus-visible reveals content for
        // keyboard-only users.
        tabindex: '0',
      }),
      0,
    ];
  },
});
