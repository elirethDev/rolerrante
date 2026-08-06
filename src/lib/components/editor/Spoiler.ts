import { Node, mergeAttributes } from '@tiptap/core';
import type { CommandProps } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    spoiler: {
      setSpoiler: () => ReturnType;
      toggleSpoiler: () => ReturnType;
    };
  }
}

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

  // REQ-FC-05: expose set/toggle commands so TipTapEditor can wire the Spoiler
  // toolbar button. With a selection it wraps the selected text in the spoiler
  // span; on an empty selection it inserts an empty spoiler node.
  addCommands() {
    return {
      setSpoiler: () => ({ commands, editor }: CommandProps) => {
        const { from, to, empty } = editor.state.selection;

        if (empty) {
          return commands.insertContent({
            type: 'spoiler',
            content: [],
          });
        }

        const text = editor.state.doc.textBetween(from, to, ' ');
        return commands.insertContent({
          type: 'spoiler',
          content: [{ type: 'text', text }],
        });
      },
      toggleSpoiler: () => ({ commands, editor }: CommandProps) => {
        if (editor.isActive('spoiler')) {
          return commands.setNode('paragraph', {});
        }
        return commands.setSpoiler();
      },
    };
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
