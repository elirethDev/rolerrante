<script lang="ts">
  import { enhance } from '$app/forms';
  import { resolve } from '$app/paths';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Avatar from '$lib/components/ui/Avatar.svelte';
  import AvatarCropper from '$lib/components/ui/AvatarCropper.svelte';
  import { Users, FilePlus2, ShieldCheck } from '@lucide/svelte';
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
  subtitle="Tu identidad en el reino: cómo te ven los demás y dónde configurar tu cuenta."
/>

{#if form?.success}
  <div class="alert alert-success mb-4">{form.message ?? 'Perfil actualizado.'}</div>
{/if}
{#if form?.message && !form?.success}
  <div class="alert alert-error mb-4">{form.message}</div>
{/if}

<div class="profile-layout">
  <div class="profile-main">
    <!-- IDENTIDAD -->
    <section class="profile-card" aria-label="Identidad">
      <div class="profile-top">
        <Avatar
          src={profile.avatar_url}
          name={profile.username}
          size="xl"
          ring
          alt={profile.display_name ?? profile.username}
        />
        <div class="profile-who">
          <h2>{profile.display_name ?? profile.username}</h2>
          <div class="handle">@{profile.username}</div>
          <div class="row" style="gap:8px;margin-top:10px">
            <span class="badge badge-primary badge-lg">{roleLabel(profile.role)}</span>
          </div>
        </div>
      </div>

      <div class="section-head" style="margin-bottom:0">
        <div>
          <span class="kicker">Resumen</span>
          <h2 class="page-title" style="font-size:1.15rem;margin:8px 0 0">Resumen del reino</h2>
        </div>
      </div>
      <div class="kpis">
        <div class="kpi"><span class="kpi-num">{kpis.personajes}</span><span class="kpi-label">Personajes</span></div>
        <div class="kpi"><span class="kpi-num">{kpis.cronicas}</span><span class="kpi-label">Crónicas</span></div>
        <div class="kpi"><span class="kpi-num">{kpis.eventos}</span><span class="kpi-label">Eventos</span></div>
        <div class="kpi"><span class="kpi-num">{kpis.reputacion}</span><span class="kpi-label">Reputación</span></div>
      </div>
      <p class="field-hint" style="margin:12px 0 0">
        Reputación es un valor de demostración calculado: aún no hay una columna real en el esquema.
      </p>
    </section>

    <!-- EDITAR IDENTIDAD -->
    <section class="form-card" aria-label="Editar identidad">
      <div class="form-card-head"><h2>Editar identidad</h2><span class="meta">cómo te mostrás</span></div>
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
      >
        <div class="form-card-body">
          <div class="avatar-preview">
            <Avatar
              src={profile.avatar_url}
              name={profile.username}
              size="lg"
              alt={profile.display_name ?? profile.username}
            />
            <p class="field-hint" style="margin:0">El avatar se muestra en fichas, hilos y este perfil.</p>
          </div>

          <div class="grid2">
            <div class="field">
              <label for="display_name">Nombre a mostrar</label>
              <input id="display_name" name="display_name" type="text" class="input" value={profile.display_name ?? ''} placeholder="Cómo te mostrás en el reino" />
            </div>
            <div class="field">
              <label for="avatar_url">URL de avatar</label>
              <input id="avatar_url" name="avatar_url" type="url" class="input" value={profile.avatar_url ?? ''} placeholder="https://..." />
            </div>
          </div>

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
          <p class="field-hint">
            La imagen se recorta a un cuadrado y se sube como WebP (máx. 150KB). Se conservan la vista previa y la URL externa como alternativa.
          </p>

          <div class="row" style="gap:10px">
            <button type="submit" class="btn btn-primary">Guardar cambios</button>
          </div>
        </div>
      </form>
    </section>

    <!-- ACTIVIDAD -->
    <section aria-label="Tu actividad">
      <div class="section-head" style="margin-bottom:0.5rem">
        <div>
          <span class="kicker">Recientes</span>
          <h2 class="page-title" style="font-size:1.15rem;margin:8px 0 0">Tu actividad</h2>
        </div>
      </div>
      <div class="profile-card" style="padding:6px 18px">
        {#if actividad.length === 0}
          <p class="text-azeroth-muted py-3">Todavía no hay actividad registrada.</p>
        {:else}
          {#each actividad as item (item.id)}
            {@const entry = item as ActivityItem}
            {#if entry.href}
              <a href={entry.href} class="activity-row">
                <span class="badge badge-outline badge-sm shrink-0">{entry.kind}</span>
                <div class="a-main">
                  <div class="a-title">{entry.label}</div>
                  <div class="a-meta">{formatDate(entry.date)}</div>
                </div>
              </a>
            {:else}
              <div class="activity-row">
                <span class="badge badge-outline badge-sm shrink-0">{entry.kind}</span>
                <div class="a-main">
                  <div class="a-title">{entry.label}</div>
                  <div class="a-meta">{formatDate(entry.date)}</div>
                </div>
              </div>
            {/if}
          {/each}
        {/if}
      </div>
    </section>

    <!-- CAMBIAR CONTRASEÑA -->
    <section class="form-card" aria-label="Cambiar contraseña">
      <div class="form-card-head"><h2>Cambiar contraseña</h2><span class="meta">seguridad</span></div>
      <form method="POST" action="?/changePassword" use:enhance>
        <div class="form-card-body">
          <div class="field">
            <label for="current_password">Contraseña actual (opcional)</label>
            <input id="current_password" name="current_password" type="password" class="input" autocomplete="current-password" />
            <p class="field-hint">Solo necesaria si querés confirmar tu identidad antes de cambiar la contraseña.</p>
          </div>

          <div class="field">
            <label for="new_password">Nueva contraseña <span class="text-error">*</span></label>
            <input id="new_password" name="new_password" type="password" class="input" autocomplete="new-password" required minlength="6" />
          </div>

          <div class="field">
            <label for="confirm_password">Confirmar nueva contraseña <span class="text-error">*</span></label>
            <input id="confirm_password" name="confirm_password" type="password" class="input" autocomplete="new-password" required minlength="6" />
          </div>

          <button type="submit" class="btn btn-primary btn-lg btn-block">Actualizar contraseña</button>
        </div>
      </form>
    </section>
  </div>

  <!-- ACCESOS RÁPIDOS -->
  <aside class="profile-side" aria-label="Accesos rápidos">
    <div class="side-jobs">
      <h3>Accesos rápidos</h3>
      <a class="job-btn" href={resolve('/personajes')}><Users size={17} /> Mis personajes</a>
      <a class="job-btn" href={resolve('/personajes/nuevo')}><FilePlus2 size={17} /> Nueva ficha</a>
      <a class="job-btn" href={resolve('/gm')}><ShieldCheck size={17} /> Sala de aprobación</a>
    </div>
  </aside>
</div>
