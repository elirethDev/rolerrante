<script lang="ts">
  import { enhance } from '$app/forms';
  import { resolve } from '$app/paths';
  import Field from '$lib/components/forms/Field.svelte';
  import TipTapEditor from '$lib/components/editor/TipTapEditor.svelte';
  import Turnstile from '$lib/components/ui/Turnstile.svelte';
  import SubmitButton from '$lib/components/ui/SubmitButton.svelte';
  import type { ActionData } from './$types';

  export let form: ActionData;

  let pending = false;
  let description = '<p>Descripción del evento...</p>';
  let turnstileToken = '';
</script>

<svelte:head>
  <title>Nuevo evento — RolErrante</title>
</svelte:head>

<section class="max-w-3xl mx-auto">
  <h1 class="text-3xl font-cinzel text-azeroth-gold mb-6">Nuevo evento</h1>

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
    <Field label="Título" required>
      {#snippet ctrl()}
        <input id="title" name="title" type="text" class="input" required />
      {/snippet}
    </Field>

    <Field label="Tipo">
      {#snippet ctrl()}
        <select id="type" name="type" class="select">
          <option value="casual">Casual</option>
          <option value="evento">Evento</option>
          <option value="campana">Campaña</option>
        </select>
      {/snippet}
    </Field>

    <div class="grid md:grid-cols-2 gap-4">
      <Field label="Inicio" required>
        {#snippet ctrl()}
          <input id="starts_at" name="starts_at" type="datetime-local" class="input" required />
        {/snippet}
      </Field>
      <Field label="Fin (opcional)">
        {#snippet ctrl()}
          <input id="ends_at" name="ends_at" type="datetime-local" class="input" />
        {/snippet}
      </Field>
    </div>

    <div class="grid md:grid-cols-2 gap-4">
      <Field label="Máximo de jugadores">
        {#snippet ctrl()}
          <input id="max_players" name="max_players" type="number" class="input" min="0" />
        {/snippet}
      </Field>
      <Field label="Ubicación">
        {#snippet ctrl()}
          <input id="location" name="location" type="text" class="input" />
        {/snippet}
      </Field>
    </div>

    <input type="hidden" name="description" bind:value={description} />
    <Field label="Descripción">
      {#snippet ctrl()}
        <TipTapEditor content={description} onChange={(html) => (description = html)} />
      {/snippet}
    </Field>

    <div class="flex justify-center">
      <Turnstile bind:token={turnstileToken} theme="dark" />
    </div>
    <input type="hidden" name="cf-turnstile-response" value={turnstileToken} />

    <div class="flex gap-3">
      <SubmitButton class="font-cinzel" disabled={!turnstileToken} pending={pending}>Publicar evento</SubmitButton>
      <a href={resolve('/eventos')} class="btn btn-ghost">Cancelar</a>
    </div>
  </form>
</section>