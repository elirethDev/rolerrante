<script lang="ts">
  import { enhance } from '$app/forms';
  import { resolve } from '$app/paths';
  import TipTapEditor from '$lib/components/editor/TipTapEditor.svelte';
  import Field from '$lib/components/forms/Field.svelte';
  import SubmitButton from '$lib/components/ui/SubmitButton.svelte';
  import type { ActionData, PageData } from './$types';

  export let data: PageData;
  export let form: ActionData;

  let pending = false;
  let title = data.story.title;
  let characterId = data.story.character_id;
  let content = typeof data.story.content === 'string' ? data.story.content : '';
</script>

<svelte:head>
  <title>Editar historia — RolErrante</title>
</svelte:head>

<section class="max-w-3xl mx-auto">
  <h1 class="text-3xl font-cinzel text-azeroth-gold mb-6">Editar historia</h1>

  {#if form?.message}
    <div class="alert alert-error mb-4">{form.message}</div>
  {/if}

  <form
    method="POST"
    use:enhance={() => {
      pending = true;
      return async ({ result, update }) => {
        pending = false;
        await update();
      };
    }}
    class="space-y-4"
  >
    <Field label="Personaje" required>
      {#snippet ctrl()}
        <select id="character_id" name="character_id" class="select" bind:value={characterId} required>
          {#if !data.characters.some((c) => c.id === characterId)}
            <option value={data.story.character_id} disabled>
              {data.story.character?.name ?? 'Personaje actual'}
            </option>
          {/if}
          {#each data.characters as c (c.id)}
            <option value={c.id}>{c.name}</option>
          {/each}
        </select>
      {/snippet}
    </Field>

    <Field label="Título" required>
      {#snippet ctrl()}
        <input id="title" name="title" type="text" class="input" bind:value={title} required />
      {/snippet}
    </Field>

    <input type="hidden" name="content" bind:value={content} />
    <Field label="Contenido" required>
      {#snippet ctrl()}
        <TipTapEditor {content} onChange={(html) => (content = html)} />
      {/snippet}
    </Field>

    <div class="flex gap-3">
      <SubmitButton class="font-cinzel" pending={pending}>Guardar cambios</SubmitButton>
      <a href={resolve(`/historias/${data.story.id}`)} class="btn btn-ghost">Cancelar</a>
    </div>
  </form>
</section>
