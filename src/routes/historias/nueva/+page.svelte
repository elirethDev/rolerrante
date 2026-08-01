<script lang="ts">
  import { enhance } from '$app/forms';
  import { resolve } from '$app/paths';
  import TipTapEditor from '$lib/components/editor/TipTapEditor.svelte';
  import Turnstile from '$lib/components/ui/Turnstile.svelte';
  import SubmitButton from '$lib/components/ui/SubmitButton.svelte';
  import type { ActionData, PageData } from './$types';

  export let data: PageData;
  export let form: ActionData;

  let pending = false;
  let title = '';
  let characterId = data.characters[0]?.id ?? '';
  let content = '<p>Escribe tu historia aquí...</p>';
  let turnstileToken = '';
</script>

<svelte:head>
  <title>Nueva historia — RolErrante</title>
</svelte:head>

<section class="max-w-3xl mx-auto">
  <h1 class="text-3xl font-cinzel text-azeroth-gold mb-6">Nueva historia</h1>

  {#if form?.message}
    <div class="alert alert-error mb-4">{form.message}</div>
  {/if}

  {#if data.characters.length === 0}
    <div class="alert alert-warning">Necesitas al menos un personaje para escribir una historia.</div>
    <a href={resolve('/personajes/nuevo')} class="btn btn-primary mt-4">Crear personaje</a>
  {:else}
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
      <fieldset class="fieldset">
        <legend class="fieldset-legend">Personaje</legend>
        <select id="character_id" name="character_id" class="select" bind:value={characterId} required>
          {#each data.characters as c (c.id)}
            <option value={c.id}>{c.name}</option>
          {/each}
        </select>
      </fieldset>

      <fieldset class="fieldset">
        <legend class="fieldset-legend">Título</legend>
        <input id="title" name="title" type="text" class="input" bind:value={title} required />
      </fieldset>

      <input type="hidden" name="content" bind:value={content} />
      <fieldset class="fieldset">
        <legend class="fieldset-legend">Contenido</legend>
        <TipTapEditor {content} onChange={(html) => (content = html)} />
      </fieldset>

      <div class="flex justify-center">
        <Turnstile bind:token={turnstileToken} theme="dark" />
      </div>
      <input type="hidden" name="cf-turnstile-response" value={turnstileToken} />

      <div class="flex gap-3">
        <SubmitButton class="font-cinzel" disabled={!turnstileToken} pending={pending}>Enviar a revisión</SubmitButton>
        <a href={resolve('/historias')} class="btn btn-ghost">Cancelar</a>
      </div>
    </form>
  {/if}
</section>
