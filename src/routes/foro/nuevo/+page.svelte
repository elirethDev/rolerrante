<script lang="ts">
  /* eslint-disable @typescript-eslint/no-explicit-any -- resolve() is typed for literal routes; forum hrefs are runtime strings */
  import { onMount, onDestroy } from 'svelte';
  import { enhance } from '$app/forms';
  import { resolve } from '$app/paths';
  import TipTapEditor from '$lib/components/editor/TipTapEditor.svelte';
  import Field from '$lib/components/ui/Field.svelte';
  import SubmitButton from '$lib/components/ui/SubmitButton.svelte';
  import { validateForumImageUrls } from '$lib/auth';
  import { clearDraft, loadDraft, saveDraft, shouldClearDraft } from '$lib/forum-compose';
  import type { ActionData, PageData } from './$types';

  export let data: PageData;
  export let form: ActionData;

  let pending = false;
  let title = '';
  let categoryId = '';
  let content = '';
  let savedIndicator = false;
  let saveTimer: ReturnType<typeof setTimeout> | undefined;

  // Client-side mirror of the server validateForumImageUrls() (REQ-FORUM-03.5).
  function isValidImageUrl(url: string): boolean {
    return validateForumImageUrls(`<img src="${url}">`).valid;
  }

  // Route-scoped autosave for new threads (REQ-FC-05): forum:draft:nuevo.
  function scheduleAutosave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveDraft(window.localStorage, 'forum:draft:nuevo', {
        content,
        title,
        timestamp: Date.now(),
      });
      savedIndicator = true;
      setTimeout(() => {
        savedIndicator = false;
      }, 2000);
    }, 300);
  }

  onMount(() => {
    const draft = loadDraft(window.localStorage, 'forum:draft:nuevo');
    if (draft) {
      if (draft.title) title = draft.title;
      if (draft.content) content = draft.content;
      if (draft.content || draft.title) savedIndicator = true;
    }
  });

  onDestroy(() => {
    clearTimeout(saveTimer);
  });
</script>

<svelte:head>
  <title>Nuevo debate — Foro · RolErrante</title>
</svelte:head>

<section class="max-w-3xl mx-auto">
  <h1 class="text-3xl font-cinzel text-azeroth-gold mb-6">Nuevo debate</h1>

  {#if form?.message}
    <div class="alert alert-error mb-4">{form.message}</div>
  {/if}

  <form
    method="POST"
    use:enhance={() => {
      pending = true;
      return async ({ result, update }) => {
        pending = false;
        if (shouldClearDraft(result.type)) {
          clearDraft(window.localStorage, 'forum:draft:nuevo');
        }
        await update();
      };
    }}
    class="space-y-4"
  >
    <Field label="Sección" required>
      {#snippet ctrl()}
        <select id="category_id" name="category_id" class="select" bind:value={categoryId} required>
          <option value="" disabled>Elegí una sección</option>
          {#each data.categories as c (c.id)}
            {#if c.parent_id === null}
              <optgroup label={c.name}>
                <option value={c.id}>{c.name}</option>
                {#each data.categories.filter((k) => k.parent_id === c.id) as sub (sub.id)}
                  <option value={sub.id}>{sub.name}</option>
                {/each}
              </optgroup>
            {/if}
          {/each}
        </select>
      {/snippet}
    </Field>

    <Field label="Título" required>
      {#snippet ctrl()}
        <input
          id="title"
          name="title"
          type="text"
          class="input"
          bind:value={title}
          on:input={scheduleAutosave}
          required
        />
      {/snippet}
    </Field>

    <input type="hidden" name="content" bind:value={content} />
    <Field label="Contenido" required>
      {#snippet ctrl()}
        <TipTapEditor
          {content}
          onChange={(html) => {
            content = html;
            scheduleAutosave();
          }}
          validateImageUrl={isValidImageUrl}
        />
      {/snippet}
    </Field>

    <p class="text-xs text-gray-400" data-testid="draft-indicator" role="status">
      {savedIndicator ? 'Borrador guardado' : ''}
    </p>

    <div class="flex gap-3">
      <SubmitButton class="font-cinzel" {pending}>Crear debate</SubmitButton>
      <a href={resolve('/foro' as any)} class="btn btn-ghost">Cancelar</a>
    </div>
  </form>
</section>
