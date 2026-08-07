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
          class: 'composer-body prose prose-invert max-w-none focus:outline-none',
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
  <div class="composer-toolbar" role="toolbar" aria-label="Formato">
    <button type="button" class="cm-btn" class:on={editor?.isActive('bold')} title="Negrita" aria-label="Negrita" on:click={() => editor?.chain().focus().toggleBold().run()}><Bold size={16} /></button>
    <button type="button" class="cm-btn" class:on={editor?.isActive('italic')} title="Cursiva" aria-label="Cursiva" on:click={() => editor?.chain().focus().toggleItalic().run()}><Italic size={16} /></button>
    <button type="button" class="cm-btn" class:on={editor?.isActive('underline')} title="Subrayado" aria-label="Subrayado" on:click={() => editor?.chain().focus().toggleUnderline().run()}><UnderlineIcon size={16} /></button>
    <button type="button" class="cm-btn" class:on={editor?.isActive('strike')} title="Tachado" aria-label="Tachado" on:click={() => editor?.chain().focus().toggleStrike().run()}><Strikethrough size={16} /></button>
    <span class="sep" aria-hidden="true"></span>
    <button type="button" class="cm-btn" class:on={editor?.isActive('heading', { level: 1 })} title="Título 1" aria-label="Título 1" on:click={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 size={16} /></button>
    <button type="button" class="cm-btn" class:on={editor?.isActive('heading', { level: 2 })} title="Título 2" aria-label="Título 2" on:click={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={16} /></button>
    <span class="sep" aria-hidden="true"></span>
    <button type="button" class="cm-btn" class:on={editor?.isActive('bulletList')} title="Lista" aria-label="Lista" on:click={() => editor?.chain().focus().toggleBulletList().run()}><List size={16} /></button>
    <button type="button" class="cm-btn" class:on={editor?.isActive('orderedList')} title="Lista numerada" aria-label="Lista numerada" on:click={() => editor?.chain().focus().toggleOrderedList().run()}><ListOrdered size={16} /></button>
    <button type="button" class="cm-btn" class:on={editor?.isActive('blockquote')} title="Cita" aria-label="Cita" on:click={() => editor?.chain().focus().toggleBlockquote().run()}><Quote size={16} /></button>
    <span class="sep" aria-hidden="true"></span>
    <button type="button" class="cm-btn" title="Imagen" aria-label="Imagen" on:click={addImage}><ImageIcon size={16} /></button>
    <button type="button" class="cm-btn" class:on={editor?.isActive('link')} title="Enlace" aria-label="Enlace" on:click={addLink}><LinkIcon size={16} /></button>
    <!-- REQ-FC-05: Spoiler is an inline TipTap Node; TipTap auto-generates toggleSpoiler. -->
    <button type="button" class="cm-btn" style="width:auto;padding:0 10px;font-size:.72rem;font-weight:700" class:on={editor?.isActive('spoiler')} title="Spoiler" aria-label="Spoiler" on:click={() => editor?.chain().focus().toggleSpoiler().run()}>Spoiler</button>
  </div>
{/if}
<div class="composer-body" bind:this={element}></div>
