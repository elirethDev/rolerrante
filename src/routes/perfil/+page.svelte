<script lang="ts">
  import { enhance } from '$app/forms';
  import Field from '$lib/components/forms/Field.svelte';
  import type { ActionData, PageData } from './$types';
  import { roleLabel } from '$lib/utils';

  export let data: PageData;
  export let form: ActionData;

  $: profile = data.profile;
</script>

<svelte:head>
  <title>Perfil — RolErrante</title>
</svelte:head>

<section class="max-w-3xl mx-auto mt-10">
  <div class="card bg-base-200 border border-azeroth-border shadow-xl">
    <div class="card-body">
      <h1 class="card-title text-2xl font-cinzel text-azeroth-gold">Tu perfil</h1>

      {#if form?.success}
        <div class="alert alert-success text-sm mt-2">Perfil actualizado.</div>
      {/if}
      {#if form?.message}
        <div class="alert alert-error text-sm mt-2">{form.message}</div>
      {/if}

      <div class="mt-4 space-y-4">
        <div class="flex items-center gap-4">
          {#if profile.avatar_url}
            <img src={profile.avatar_url} alt="avatar" class="w-16 h-16 rounded-full object-cover border border-azeroth-border" />
          {:else}
            <div class="w-16 h-16 rounded-full bg-base-300 flex items-center justify-center text-2xl font-cinzel">{profile.username[0].toUpperCase()}</div>
          {/if}
          <div>
            <p class="font-bold text-lg">@{profile.username}</p>
            <span class="badge badge-primary">{roleLabel(profile.role)}</span>
          </div>
        </div>

        <form method="POST" use:enhance class="space-y-4">
          <Field label="Nombre a mostrar">
            {#snippet ctrl()}
              <input id="display_name" name="display_name" type="text" class="input" value={profile.display_name ?? ''} />
            {/snippet}
          </Field>

          <Field label="URL de avatar">
            {#snippet ctrl()}
              <input id="avatar_url" name="avatar_url" type="url" class="input" value={profile.avatar_url ?? ''} placeholder="https://..." />
            {/snippet}
          </Field>

          <button type="submit" class="btn btn-primary w-full font-cinzel">Guardar cambios</button>
        </form>
      </div>
    </div>
  </div>
</section>
