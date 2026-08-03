<script lang="ts">
  /* eslint-disable @typescript-eslint/no-explicit-any -- resolve() is typed for literal routes; forum hrefs are runtime strings */
  import { enhance } from '$app/forms';
  import { resolve } from '$app/paths';
  import TipTapEditor from '$lib/components/editor/TipTapEditor.svelte';
  import Field from '$lib/components/forms/Field.svelte';
  import SubmitButton from '$lib/components/ui/SubmitButton.svelte';
  import type { ActionData, PageData } from './$types';

  export let data: PageData;
  export let form: ActionData;

  let pending = false;
  let title = '';
  let categoryId = '';
  let content = '';
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
      <SubmitButton class="font-cinzel" {pending}>Crear debate</SubmitButton>
      <a href={resolve('/foro' as any)} class="btn btn-ghost">Cancelar</a>
    </div>
  </form>
</section>
