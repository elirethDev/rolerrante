<script lang="ts">
  import { enhance } from '$app/forms';
  import { onDestroy } from 'svelte';
  import Field from '$lib/components/ui/Field.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Avatar from '$lib/components/ui/Avatar.svelte';
  import { formatDate, roleLabel } from '$lib/utils';
  import type { ActivityItem } from './+page.server';
  import type { ActionData, PageData } from './$types';

  export let data: PageData;
  export let form: ActionData;

  $: profile = data.profile;
  $: kpis = data.kpis ?? { personajes: 0, cronicas: 0, eventos: 0, reputacion: 0 };
  $: actividad = data.actividad ?? [];

  // Avatar capture (ON THIS PAGE only): a local file becomes a preview via
  // ObjectURL and, on "Usar imagen", its object URL is written into the
  // avatar_url field so the existing save action persists it as-is. Real
  // avatar storage/upload is out of scope (follow-up) — the object URL only
  // lives for this session.
  let avatarUrlInput: HTMLInputElement;
  let avatarPreview: string | null = null;

  function onPickFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    avatarPreview = URL.createObjectURL(file);
  }

  function useAvatarPreview() {
    if (avatarPreview && avatarUrlInput) {
      avatarUrlInput.value = avatarPreview;
    }
  }

  onDestroy(() => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
  });
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

  <div class="panel mb-6">
    <div class="panel-head"><h2>Resumen del reino</h2></div>
    <div class="p-6">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="stat bg-base-200 border border-azeroth-border rounded-box p-4">
          <div class="stat-title text-azeroth-muted">Personajes</div>
          <div class="stat-value text-azeroth-gold text-2xl">{kpis.personajes}</div>
        </div>
        <div class="stat bg-base-200 border border-azeroth-border rounded-box p-4">
          <div class="stat-title text-azeroth-muted">Crónicas</div>
          <div class="stat-value text-azeroth-gold text-2xl">{kpis.cronicas}</div>
        </div>
        <div class="stat bg-base-200 border border-azeroth-border rounded-box p-4">
          <div class="stat-title text-azeroth-muted">Eventos</div>
          <div class="stat-value text-azeroth-gold text-2xl">{kpis.eventos}</div>
        </div>
        <div class="stat bg-base-200 border border-azeroth-border rounded-box p-4">
          <div class="stat-title text-azeroth-muted">Reputación</div>
          <div class="stat-value text-azeroth-gold text-2xl">{kpis.reputacion}</div>
        </div>
      </div>
      <p class="mt-4 text-xs text-azeroth-muted">
        Reputación es un valor de demostración calculado: aún no hay una columna real en el esquema.
      </p>
    </div>
  </div>

  <div class="panel mb-6">
    <div class="panel-head"><h2>Tu actividad</h2></div>
    {#if actividad.length === 0}
      <div class="p-6 text-azeroth-muted">Todavía no hay actividad registrada.</div>
    {:else}
      <ul class="divide-y divide-azeroth-border">
        {#each actividad as item (item.id)}
          {@const entry = item as ActivityItem}
          <li>
            {#if entry.href}
              <a
                href={entry.href}
                class="flex items-center justify-between gap-4 p-4 hover:bg-base-200 transition-colors"
              >
                <span class="min-w-0">
                  <span class="badge badge-sm badge-outline mr-2">{entry.kind}</span>
                  <span class="text-sm text-azeroth-muted">{entry.label}</span>
                </span>
                <time class="shrink-0 text-xs text-azeroth-muted">{formatDate(entry.date)}</time>
              </a>
            {:else}
              <div class="flex items-center justify-between gap-4 p-4">
                <span class="min-w-0">
                  <span class="badge badge-sm badge-outline mr-2">{entry.kind}</span>
                  <span class="text-sm text-azeroth-muted">{entry.label}</span>
                </span>
                <time class="shrink-0 text-xs text-azeroth-muted">{formatDate(entry.date)}</time>
              </div>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
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
          <input
            id="avatar_url"
            name="avatar_url"
            type="url"
            class="input"
            value={profile.avatar_url ?? ''}
            placeholder="https://..."
            bind:this={avatarUrlInput}
          />
          <div class="mt-3 flex flex-wrap items-center gap-3">
            <input
              type="file"
              accept="image/*"
              class="file-input file-input-sm w-full max-w-xs"
              aria-label="Cargar imagen de avatar"
              onchange={onPickFile}
            />
            {#if avatarPreview}
              <span class="avatar">
                <span class="w-14 rounded">
                  <img src={avatarPreview} alt="Vista previa del avatar" class="rounded" />
                </span>
              </span>
              <button type="button" class="btn btn-sm" onclick={useAvatarPreview}>Usar imagen</button>
            {/if}
          </div>
          <p class="mt-2 text-xs text-azeroth-muted">
            La imagen se previsualiza localmente y se guarda como URL; el almacenamiento real está pendiente.
          </p>
        {/snippet}
      </Field>

      <button type="submit" class="btn btn-primary font-cinzel">Guardar cambios</button>
    </form>
  </div>
</div>
