<script lang="ts">
  import { onMount } from 'svelte';
  import { Editor } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';

  let { content }: { content: string } = $props();

  let element: HTMLDivElement;

  onMount(() => {
    const editor = new Editor({
      element,
      content,
      editable: false,
      extensions: [StarterKit],
      editorProps: {
        attributes: {
          class: 'prose prose-invert max-w-none',
        },
      },
    });

    return () => {
      editor.destroy();
    };
  });
</script>

<div bind:this={element}></div>