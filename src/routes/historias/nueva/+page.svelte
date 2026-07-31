<script lang="ts">
  import { enhance } from '$app/forms';
  import TipTapEditor from '$lib/components/editor/TipTapEditor.svelte';
  import Turnstile from '$lib/components/ui/Turnstile.svelte';
  import type { ActionData, PageData } from './$types';

  export let data: PageData;
  export let form: ActionData;

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
    <a href="/personajes/nuevo" class="btn btn-primary mt-4">Crear personaje</a>
  {:else}
    <form method="POST" use:enhance class="space-y-4">
      <div class="form-control">
        <label class="label" for="character_id"><span class="label-text">Personaje</span></label>
        <select id="character_id" name="character_id" class="select select-bordered" bind:value={characterId} required>
          {#each data.characters as c}
            <option value={c.id}>{c.name}</option>
          {/each}
        </select>
      </div>

      <div class="form-control">
        <label class="label" for="title"><span class="label-text">Título</span></label>
        <input id="title" name="title" type="text" class="input input-bordered" bind:value={title} required />
      </div>

      <input type="hidden" name="content" bind:value={content} />
      <div class="form-control">
        <span class="label-text">Contenido</span>
        <TipTapEditor {content} onChange={(html) => (content = html)} />
      </div>

      <div class="flex justify-center">
        <Turnstile bind:token={turnstileToken} theme="dark" />
      </div>
      <input type="hidden" name="cf-turnstile-response" value={turnstileToken} />

      <div class="flex gap-3">
        <button type="submit" class="btn btn-primary font-cinzel" disabled={!turnstileToken}>Enviar a revisión</button>
        <a href="/historias" class="btn btn-ghost">Cancelar</a>
      </div>
    </form>
  {/if}
</section>
