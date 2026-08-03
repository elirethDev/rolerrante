<script lang="ts">
  import { onMount } from 'svelte';
  import { Editor } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import Link from '@tiptap/extension-link';
  import Image from '@tiptap/extension-image';

  let { content }: { content: string } = $props();

  let element: HTMLDivElement;

  onMount(() => {
    const editor = new Editor({
      element,
      content,
      editable: false,
      // Render symmetry with the editor (REQ-FC-03): Link + Underline are needed
      // so hrefs and underlined marks written in the composer render identically.
      extensions: [StarterKit, Link.configure({ openOnClick: true }), Image],
      editorProps: {
        attributes: {
          class: 'prose prose-invert max-w-none',
        },
      },
    });

    // REQ-FORUM-03.5: render embedded images responsively and defer offscreen
    // loading. Applied post-mount because TipTap/ProseMirror owns the DOM.
    applyImageAttributes(element);

    return () => {
      editor.destroy();
    };
  });

  function applyImageAttributes(root: HTMLElement) {
    root.querySelectorAll('img').forEach((img) => {
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.loading = 'lazy';
    });
  }
</script>

<div bind:this={element}></div>