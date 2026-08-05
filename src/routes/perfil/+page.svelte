<script lang="ts">
  import { enhance } from '$app/forms';
  import Field from '$lib/components/ui/Field.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Avatar from '$lib/components/ui/Avatar.svelte';
  import AvatarCropper from '$lib/components/ui/AvatarCropper.svelte';
  import { formatDate, roleLabel } from '$lib/utils';
  import type { ActivityItem } from './+page.server';
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let profile = $derived(data.profile);
  let kpis = $derived(data.kpis ?? { personajes: 0, cronicas: 0, eventos: 0, reputacion: 0 });
  let actividad = $derived(data.actividad ?? []);

  // Avatar upload UI (REQ-AVUP-01/05): pick a local file, crop it to a fixed
  // 1:1 square, then the WebP File is attached to the form submit as
  // `avatar_file`. The server validates and persists the stored public URL.
  let avatarFile = $state<File | null>(null);
  let pickerKey = $state(0);
  let cropSrc = $state<string | null>(null);

  function onPickFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    cropSrc = URL.createObjectURL(file);
    avatarFile = null;
  }

  function onAvatarFile(file: File) {
    avatarFile = file;
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    cropSrc = null;
    pickerKey += 1;
  }

  $effect(() => {
    return () => {
      if (cropSrc) URL.revokeObjectURL(cropSrc);
    };
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
    <form
      method="POST"
      enctype="multipart/form-data"
      use:enhance={({ formData }) => {
        // Attach the cropped WebP file (if any) so the server action can
        // validate + upload it (REQ-AVUP-05 multipart submit).
        if (avatarFile) {
          formData.set('avatar_file', avatarFile, avatarFile.name);
        }
      }}
      class="p-6 space-y-4"
    >
      <Field label="Nombre a mostrar">
        {#snippet ctrl()}
          <input id="display_name" name="display_name" type="text" class="input" value={profile.display_name ?? ''} />
        {/snippet}
      </Field>

      <Field label="Avatar">
        {#snippet ctrl()}
          <input
            id="avatar_url"
            name="avatar_url"
            type="url"
            class="input"
            value={profile.avatar_url ?? ''}
            placeholder="https://..."
          />
          <div class="divider text-azeroth-muted text-xs">o subí una imagen</div>
          {#key pickerKey}
            <input
              id="avatar_pick"
              type="file"
              accept="image/*"
              class="file-input file-input-sm w-full max-w-xs"
              aria-label="Cargar imagen de avatar"
              onchange={onPickFile}
            />
          {/key}
          {#if cropSrc}
            <div class="mt-3">
              <AvatarCropper src={cropSrc} onavatarfile={onAvatarFile} />
            </div>
          {/if}
          {#if avatarFile}
            <p class="mt-2 text-sm text-success">Imagen lista para subir al guardar.</p>
          {/if}
          <p class="mt-2 text-xs text-azeroth-muted">
            La imagen se recorta a un cuadrado y se sube como WebP (máx. 150KB). Se conservan la vista previa y la URL externa como alternativa.
          </p>
        {/snippet}
      </Field>

      <button type="submit" class="btn btn-primary font-cinzel">Guardar cambios</button>
    </form>
  </div>
</div>
