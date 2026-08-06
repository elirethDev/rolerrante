<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Editor } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import Link from '@tiptap/extension-link';
  import CharacterCount from '@tiptap/extension-character-count';
  import Image from '@tiptap/extension-image';
  import { TextStyle } from '@tiptap/extension-text-style';
  import Color from '@tiptap/extension-color';
  import { Spoiler } from './Spoiler';
  import { Bold, Italic, Underline as UnderlineIcon, Strikethrough, List, ListOrdered, Quote, Image as ImageIcon, Heading1, Heading2, Link as LinkIcon } from '@lucide/svelte';

  export let content = '';
  export let onChange: (html: string) => void = () => {};
  export let onCharCount: (n: number) => void = () => {};
  export let editable = true;
  // Optional server-validated image-insert guard (REQ-FORUM-03.5). When provided,
  // ad image is only inserted if validateImageUrl(url) returns true — mirroring the
  // server-side validateForumImageUrls() check. Falls back to allowing any URL.
  export let validateImageUrl: ((url: string) => boolean) | undefined = undefined;

  let element: HTMLDivElement;
  let editor: Editor | null = null;

  // Client-side href protocol guard (REQ-FC-03). Mirrors the server-side
  // validateForumHrefs() check: only http/https are accepted. Not a trust
  // boundary — server still validates on submit.
  function isValidHref(url: string): boolean {
    return /^https?:\/\//i.test(url);
  }

  onMount(() => {
    editor = new Editor({
      element,
      editable,
      content,
      extensions: [
        StarterKit.configure({ link: false }),
        Link.configure({ openOnClick: true, autolink: true }),
        CharacterCount,
        Image,
        TextStyle,
        Color,
        Spoiler,
      ],
      onUpdate: ({ editor }) => {
        onChange(editor.getHTML());
        onCharCount(editor.storage.characterCount.characters());
      },
      editorProps: {
        attributes: {
          class: 'prose prose-invert max-w-none min-h-[200px] focus:outline-none p-4',
        },
      },
    });
  });

  onDestroy(() => {
    editor?.destroy();
  });

  function addImage() {
    const url = prompt('URL de la imagen');
    if (!url || !editor) return;
    if (validateImageUrl && !validateImageUrl(url)) {
      window.alert('URL de imagen no permitida (solo http/https).');
      return;
    }
    editor.chain().focus().setImage({ src: url }).run();
  }

  function addLink() {
    const href = prompt('URL del enlace (http/https)');
    if (!href || !editor) return;
    if (!isValidHref(href)) {
      window.alert('URL de enlace no permitida (solo http/https).');
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
  }

  $: if (editor && editor.getHTML() !== content && !editor.isFocused) {
    editor.commands.setContent(content, { emitUpdate: false });
  }
</script>

{#if editable}
  <div class="border border-azeroth-border rounded-t-lg bg-base-200 p-2 flex flex-wrap gap-1">
    <button type="button" class="btn btn-xs btn-ghost" on:click={() => editor?.chain().focus().toggleBold().run()} class:btn-active={editor?.isActive('bold')}><Bold size={14} /></button>
    <button type="button" class="btn btn-xs btn-ghost" on:click={() => editor?.chain().focus().toggleItalic().run()} class:btn-active={editor?.isActive('italic')}><Italic size={14} /></button>
    <button type="button" class="btn btn-xs btn-ghost" on:click={() => editor?.chain().focus().toggleUnderline().run()} class:btn-active={editor?.isActive('underline')}><UnderlineIcon size={14} /></button>
    <button type="button" class="btn btn-xs btn-ghost" on:click={() => editor?.chain().focus().toggleStrike().run()} class:btn-active={editor?.isActive('strike')}><Strikethrough size={14} /></button>
    <div class="divider divider-horizontal mx-1"></div>
    <button type="button" class="btn btn-xs btn-ghost" on:click={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} class:btn-active={editor?.isActive('heading', { level: 1 })}><Heading1 size={14} /></button>
    <button type="button" class="btn btn-xs btn-ghost" on:click={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} class:btn-active={editor?.isActive('heading', { level: 2 })}><Heading2 size={14} /></button>
    <div class="divider divider-horizontal mx-1"></div>
    <button type="button" class="btn btn-xs btn-ghost" on:click={() => editor?.chain().focus().toggleBulletList().run()} class:btn-active={editor?.isActive('bulletList')}><List size={14} /></button>
    <button type="button" class="btn btn-xs btn-ghost" on:click={() => editor?.chain().focus().toggleOrderedList().run()} class:btn-active={editor?.isActive('orderedList')}><ListOrdered size={14} /></button>
    <button type="button" class="btn btn-xs btn-ghost" on:click={() => editor?.chain().focus().toggleBlockquote().run()} class:btn-active={editor?.isActive('blockquote')}><Quote size={14} /></button>
    <div class="divider divider-horizontal mx-1"></div>
    <button type="button" class="btn btn-xs btn-ghost" on:click={addImage}><ImageIcon size={14} /></button>
    <button type="button" class="btn btn-xs btn-ghost" on:click={addLink} class:btn-active={editor?.isActive('link')}><LinkIcon size={14} /></button>
    <!-- REQ-FC-05: Spoiler is an inline TipTap Node; TipTap auto-generates toggleSpoiler. -->
    <button type="button" class="btn btn-xs btn-ghost" title="Spoiler" aria-label="Spoiler" on:click={() => editor?.chain().focus().toggleSpoiler().run()} class:btn-active={editor?.isActive('spoiler')}>Spoiler</button>
  </div>
{/if}
<div bind:this={element} class="border border-azeroth-border {editable ? 'rounded-b-lg' : 'rounded-lg'} bg-base-100"></div>
