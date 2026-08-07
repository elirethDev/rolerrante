<script lang="ts">
  /* eslint-disable @typescript-eslint/no-explicit-any -- resolve() is typed for literal routes; forum hrefs are runtime strings */
  import { enhance } from '$app/forms';
  import { resolve } from '$app/paths';
  import TipTapEditor from '$lib/components/editor/TipTapEditor.svelte';
  import Field from '$lib/components/ui/Field.svelte';
  import SubmitButton from '$lib/components/ui/SubmitButton.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import type { ActionData, PageData } from './$types';

  export let data: PageData;
  export let form: ActionData;

  let pending = false;
  let title = data.thread.title;
  let content = typeof data.thread.body === 'string' ? data.thread.body : '';
</script>

<svelte:head>
  <title>Editar hilo — Foro · RolErrante</title>
</svelte:head>

<section class="max-w-[1180px] mx-auto">
  <PageHeader kicker="Foro" title="Editar hilo" />

  {#if form?.message}
    <div class="alert alert-error mb-4">{form.message}</div>
  {/if}

  <div class="create-wrap">
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
      <section class="form-card">
        <div class="form-card-head">
          <h2>Título</h2>
          <span class="meta">Se mantiene la sección</span>
        </div>
        <div class="form-card-body">
          <Field label="Título" required>
            {#snippet ctrl()}
              <input id="title" name="title" type="text" class="input" bind:value={title} required />
            {/snippet}
          </Field>
        </div>
      </section>

      <section class="form-card">
        <div class="form-card-head">
          <h2>Primer mensaje</h2>
          <span class="meta">Editor</span>
        </div>
        <div class="form-card-body">
          <input type="hidden" name="content" bind:value={content} />
          <TipTapEditor {content} onChange={(html) => (content = html)} />
        </div>
      </section>

      <div class="row" style="gap:12px;align-items:center">
        <SubmitButton class="font-cinzel" {pending}>Guardar cambios</SubmitButton>
        <a href={resolve(`/foro/${data.thread.id}` as any)} class="btn btn-ghost">Cancelar</a>
      </div>
    </form>
  </div>
</section>
