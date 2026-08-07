<script lang="ts">
  import { enhance } from '$app/forms';
  import { resolve } from '$app/paths';
  import TipTapEditor from '$lib/components/editor/TipTapEditor.svelte';
  import Field from '$lib/components/ui/Field.svelte';
  import SubmitButton from '$lib/components/ui/SubmitButton.svelte';
  import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
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

<section class="create-wrap">
  <Breadcrumbs
    items={[{ label: 'Historias', href: '/historias' }, { label: 'Editar historia' }]}
    class="mb-2"
  />

  <header class="page-head" style="padding-top:0;border-bottom:0">
    <span class="kicker">Historias del reino</span>
    <h1 class="page-title" style="margin-bottom:6px">Editar historia</h1>
    <p class="page-sub">Actualizá el relato. Los cambios se guardan y vuelven a pasar por revisión si ya estaba aprobada.</p>
  </header>

  {#if form?.message}
    <div class="review-note" style="border-color:var(--border);background:rgba(170,36,9,.12)">
      <svg viewBox="0 0 24 24" fill="none" style="color:var(--danger-strong)"><path d="M12 3l2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6z" fill="currentColor"/></svg>
      <span>{form.message}</span>
    </div>
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
  >
    <section class="form-card" data-od-id="sec-autoria">
      <div class="form-card-head"><h2>Autoría</h2><span class="meta">De qué personaje es</span></div>
      <div class="form-card-body">
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
      </div>
    </section>

    <section class="form-card" data-od-id="sec-contenido">
      <div class="form-card-head"><h2>Contenido</h2><span class="meta">Editor</span></div>
      <div class="form-card-body">
        <input type="hidden" name="content" bind:value={content} />
        <div class="tiptap">
          <TipTapEditor {content} onChange={(html) => (content = html)} />
        </div>
      </div>
    </section>

    <div class="row" style="gap:12px;align-items:center">
      <SubmitButton class="font-cinzel" pending={pending}>Guardar cambios</SubmitButton>
      <a href={resolve(`/historias/${data.story.id}`)} class="btn btn-ghost btn-lg">Cancelar</a>
    </div>
  </form>
</section>
