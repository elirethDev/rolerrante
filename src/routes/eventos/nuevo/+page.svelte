<script lang="ts">
  import { enhance } from '$app/forms';
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
    <div class="form-control">
      <label class="label" for="title"><span class="label-text">Título</span></label>
      <input id="title" name="title" type="text" class="input input-bordered" required />
    </div>

    <div class="form-control">
      <label class="label" for="type"><span class="label-text">Tipo</span></label>
      <select id="type" name="type" class="select select-bordered">
        <option value="casual">Casual</option>
        <option value="evento">Evento</option>
        <option value="campana">Campaña</option>
      </select>
    </div>

    <div class="grid md:grid-cols-2 gap-4">
      <div class="form-control">
        <label class="label" for="starts_at"><span class="label-text">Inicio</span></label>
        <input id="starts_at" name="starts_at" type="datetime-local" class="input input-bordered" required />
      </div>
      <div class="form-control">
        <label class="label" for="ends_at"><span class="label-text">Fin (opcional)</span></label>
        <input id="ends_at" name="ends_at" type="datetime-local" class="input input-bordered" />
      </div>
    </div>

    <div class="grid md:grid-cols-2 gap-4">
      <div class="form-control">
        <label class="label" for="max_players"><span class="label-text">Máximo de jugadores</span></label>
        <input id="max_players" name="max_players" type="number" class="input input-bordered" min="0" />
      </div>
      <div class="form-control">
        <label class="label" for="location"><span class="label-text">Ubicación</span></label>
        <input id="location" name="location" type="text" class="input input-bordered" />
      </div>
    </div>

    <input type="hidden" name="description" bind:value={description} />
    <div class="form-control">
      <span class="label-text">Descripción</span>
      <TipTapEditor content={description} onChange={(html) => (description = html)} />
    </div>

    <div class="flex justify-center">
      <Turnstile bind:token={turnstileToken} theme="dark" />
    </div>
    <input type="hidden" name="cf-turnstile-response" value={turnstileToken} />

    <div class="flex gap-3">
      <SubmitButton class="font-cinzel" disabled={!turnstileToken} pending={pending}>Publicar evento</SubmitButton>
      <a href="/eventos" class="btn btn-ghost">Cancelar</a>
    </div>
  </form>
</section>