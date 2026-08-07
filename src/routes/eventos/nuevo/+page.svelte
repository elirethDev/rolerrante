<script lang="ts">
  import { enhance } from '$app/forms';
  import { resolve } from '$app/paths';
  import TipTapEditor from '$lib/components/editor/TipTapEditor.svelte';
  import Turnstile from '$lib/components/ui/Turnstile.svelte';
  import SubmitButton from '$lib/components/ui/SubmitButton.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
  import type { ActionData } from './$types';

  export let form: ActionData;

  let pending = false;
  let description = '<p>Descripción del evento...</p>';
  let turnstileToken = '';
</script>

<svelte:head>
  <title>Nuevo evento — RolErrante</title>
</svelte:head>

<div class="create-wrap">
  <Breadcrumbs items={[{ label: 'Eventos', href: '/eventos' }, { label: 'Nuevo evento' }]} class="mb-2" />

  <PageHeader
    kicker="Agenda del reino"
    title="Nuevo evento"
    subtitle="Publicá un encuentro, campaña o velada para la comunidad."
  />

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
  >
    <section class="form-card">
      <div class="form-card-head">
        <h2>Detalles del evento</h2>
        <span class="meta">Campos del encuentro</span>
      </div>
      <div class="form-card-body">
        <div class="field">
          <label for="title">Título <span class="text-error">*</span></label>
          <input id="title" name="title" type="text" class="input" required placeholder="P.ej. Torneo del Martillo Dorado" />
        </div>

        <div class="grid2">
          <div class="field">
            <label for="type">Tipo</label>
            <select id="type" name="type" class="select">
              <option value="casual">Casual</option>
              <option value="evento">Evento</option>
              <option value="campana">Campaña</option>
            </select>
          </div>
          <div class="field">
            <label for="max_players">Máximo de jugadores</label>
            <input id="max_players" name="max_players" type="number" class="input" min="0" placeholder="P.ej. 16" />
          </div>
        </div>

        <div class="grid2">
          <div class="field">
            <label for="starts_at">Inicio <span class="text-error">*</span></label>
            <input id="starts_at" name="starts_at" type="datetime-local" class="input" required />
          </div>
          <div class="field">
            <label for="ends_at">Fin (opcional)</label>
            <input id="ends_at" name="ends_at" type="datetime-local" class="input" />
          </div>
        </div>

        <div class="field">
          <label for="location">Ubicación</label>
          <input id="location" name="location" type="text" class="input" placeholder="P.ej. Jardines de Tor'keth" />
        </div>
      </div>
    </section>

    <section class="form-card">
      <div class="form-card-head">
        <h2>Descripción</h2>
        <span class="meta">Editor</span>
      </div>
      <div class="form-card-body">
        <input type="hidden" name="description" bind:value={description} />
        <TipTapEditor content={description} onChange={(html) => (description = html)} />
        <p class="field-hint" style="margin:0">
          Podés citar personajes con <span class="text-azeroth-gold-soft">@Nombre</span> y enlazar crónicas o fichas relacionadas.
        </p>
      </div>
    </section>

    <div class="flex justify-center my-4">
      <Turnstile bind:token={turnstileToken} theme="dark" />
    </div>
    <input type="hidden" name="cf-turnstile-response" value={turnstileToken} />

    <div class="row" style="gap:12px;align-items:center">
      <SubmitButton class="font-cinzel btn-lg" disabled={!turnstileToken} pending={pending}>
        Publicar evento
      </SubmitButton>
      <a href={resolve('/eventos')} class="btn btn-ghost btn-lg">Cancelar</a>
      <span class="text-xs text-azeroth-faint">Queda a la vista de toda la comunidad.</span>
    </div>
  </form>
</div>
