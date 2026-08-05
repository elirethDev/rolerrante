<script lang="ts">
  import { enhance } from '$app/forms';
  import Field from '$lib/components/ui/Field.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Avatar from '$lib/components/ui/Avatar.svelte';
  import type { ActionData, PageData } from './$types';
  import { roleLabel } from '$lib/utils';

  export let data: PageData;
  export let form: ActionData;

  $: profile = data.profile;
</script>

<svelte:head>
  <title>Perfil — RolErrante</title>
</svelte:head>

<PageHeader
  kicker="Cuenta"
  title="Tu perfil"
  subtitle="Tu identidad en el reino: cómo te ven los demás."
/>

{#if form?.success}
  <div class="alert alert-success mb-4">Perfil actualizado.</div>
{/if}
{#if form?.message}
  <div class="alert alert-error mb-4">{form.message}</div>
{/if}

<div class="max-w-3xl">
  <div class="panel mb-6">
    <div class="p-6 flex flex-wrap items-center gap-4">
      <Avatar
        src={profile.avatar_url}
        name={profile.username}
        size="xl"
        alt={profile.display_name ?? profile.username}
      />
      <div class="min-w-[220px] flex-1">
        <h2 class="font-cinzel text-xl font-bold text-azeroth-gold">{profile.display_name ?? profile.username}</h2>
        <p class="text-azeroth-muted">@{profile.username}</p>
        <span class="badge badge-primary mt-2">{roleLabel(profile.role)}</span>
      </div>
    </div>
  </div>

  <div class="panel">
    <div class="panel-head"><h2>Editar identidad</h2></div>
    <form method="POST" use:enhance class="p-6 space-y-4">
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

      <button type="submit" class="btn btn-primary font-cinzel">Guardar cambios</button>
    </form>
  </div>
</div>
