<script lang="ts">
  import { enhance } from '$app/forms';
  import { resolve } from '$app/paths';
  import { onDestroy } from 'svelte';
  import Field from '$lib/components/ui/Field.svelte';
  import AttributeInput from '$lib/components/forms/AttributeInput.svelte';
  import SubmitButton from '$lib/components/ui/SubmitButton.svelte';
  import CombatValues from '$lib/components/sheets/CombatValues.svelte';
  import AvatarCropper from '$lib/components/ui/AvatarCropper.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import type { ActionData, PageData } from './$types';
  import type { Character } from '$lib/types';

  export let data: PageData;
  export let form: ActionData;

  let pending = false;
  const character = data.character as Character;

  let name = character.name;
  let raceId = character.race_id;
  let age = character.age ?? 0;
  let sex = character.sex ?? '';
  let physicalDescription = character.physical_description ?? '';
  let manaSource = character.mana_source ?? 'I';
  let avatarUrl = character.avatar_url ?? '';
  let status = character.status === 'borrador' ? 'borrador' : 'pendiente';

  let attrValues: Record<string, number> = {
    attr_fis: character.attr_fis,
    attr_des: character.attr_des,
    attr_int: character.attr_int,
    attr_per: character.attr_per,
    attr_esp: character.attr_esp,
  };
  const ATTR_KEYS = ['attr_fis', 'attr_des', 'attr_int', 'attr_per', 'attr_esp'] as const;
  const ATTR_LABELS: Record<string, string> = {
    attr_fis: 'Físico', attr_des: 'Destreza', attr_int: 'Inteligencia', attr_per: 'Percepción', attr_esp: 'Espíritu',
  };

  $: previewAttrs = {
    attr_fis: attrValues.attr_fis,
    attr_des: attrValues.attr_des,
    attr_int: attrValues.attr_int,
    attr_per: attrValues.attr_per,
    attr_esp: attrValues.attr_esp,
    mana_source: manaSource as 'I' | 'E',
  };
  let previewSkills: { skill: { name: string }; level: number }[] = [];

  // Avatar upload UI (REQ-AVUP-01/05): crop to 1:1 and attach the WebP File to
  // the form submit as `avatar_file`. The URL text field remains as fallback.
  let avatarFile: File | null = null;
  let pickerKey = 0;
  let cropSrc: string | null = null;

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

  onDestroy(() => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
  });
</script>

<svelte:head>
  <title>Editar personaje — RolErrante</title>
</svelte:head>

<div class="max-w-4xl mx-auto">
  <PageHeader
    kicker="Censo del reino"
    title="Editar personaje"
    subtitle="Los cambios se guardan como borrador o se envían a revisión del consejo."
  />

  {#if form?.message}
    <div class="alert alert-error mb-4">{form.message}</div>
  {/if}
  {#if form && 'errors' in form}
    <div class="alert alert-warning mb-4">
      <ul class="list-disc list-inside">
        {#each Object.values(form.errors as Record<string, string>) as err (err)}
          <li>{err}</li>
        {/each}
      </ul>
    </div>
  {/if}

  <form
    method="POST"
    enctype="multipart/form-data"
    use:enhance={({ formData }) => {
      pending = true;
      if (avatarFile) {
        formData.set('avatar_file', avatarFile, avatarFile.name);
      }
      return async ({ result, update }) => {
        pending = false;
        await update();
      };
    }}
  >
    <!-- DATOS BÁSICOS -->
    <div class="form-card">
      <div class="form-card-head"><span class="form-card-num">1</span><h2>Datos básicos</h2><span class="meta">Identidad</span></div>
      <div class="form-card-body">
        <div class="grid2">
          <div class="field"><label for="name">Nombre <span style="color:var(--color-azeroth-danger)">*</span></label><input class="input" id="name" name="name" type="text" bind:value={name} required /></div>
          <div class="field"><label for="race_id">Raza <span style="color:var(--color-azeroth-danger)">*</span></label><select class="select" id="race_id" name="race_id" bind:value={raceId} required><option value="">Selecciona</option>{#each data.races as race (race.id)}<option value={race.id}>{race.name}</option>{/each}</select></div>
          <div class="field"><label for="age">Edad</label><input class="input" id="age" name="age" type="number" min="0" bind:value={age} /></div>
          <div class="field"><label for="sex">Sexo</label><input class="input" id="sex" name="sex" type="text" bind:value={sex} /></div>
          <div class="field full"><label for="physical_description">Descripción física</label><textarea class="textarea" id="physical_description" name="physical_description" rows="3" bind:value={physicalDescription}></textarea></div>
          <div class="field"><label for="mana_source">Fuente de maná</label><select class="select" id="mana_source" name="mana_source" bind:value={manaSource}><option value="I">Inteligencia</option><option value="E">Espíritu</option></select></div>
          <div class="field full">
            <label for="avatar_url">URL de avatar</label>
            <input class="input" id="avatar_url" name="avatar_url" type="text" placeholder="https://..." bind:value={avatarUrl} />
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
              La imagen se recorta a un cuadrado y se sube como WebP (máx. 150KB). Se conserva la URL externa como alternativa.
            </p>
          </div>
          <div class="field"><label for="status">Estado</label><select class="select" id="status" name="status" bind:value={status}><option value="borrador">Borrador</option><option value="pendiente">Pendiente (enviar a revisión)</option></select></div>
        </div>
      </div>
    </div>

    <!-- ATRIBUTOS -->
    <div class="form-card">
      <div class="form-card-head"><span class="form-card-num">2</span><h2>Atributos (4-10)</h2><span class="meta">base 4</span></div>
      <div class="form-card-body">
        <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
          {#each ATTR_KEYS as key (key)}
            <AttributeInput
              label={ATTR_LABELS[key]}
              value={attrValues[key]}
              onchange={(val) => (attrValues = { ...attrValues, [key]: val })}
            />
            <input type="hidden" name={key} value={attrValues[key]} />
          {/each}
        </div>
      </div>
    </div>

    <!-- VISTA PREVIA DE COMBATE -->
    <div class="mb-6">
      <CombatValues attrs={previewAttrs} skills={previewSkills} />
    </div>

    <!-- BOTONES -->
    <div class="flex flex-wrap gap-3 items-center">
      <SubmitButton class="font-cinzel" pending={pending}>Guardar cambios</SubmitButton>
      {#if data.isOwner}
        <button
          type="submit"
          formaction="?/request_review"
          class="btn btn-secondary font-cinzel"
          disabled={pending}
          aria-busy={pending}
        >
          Guardar y enviar a revisión
        </button>
      {/if}
      <a href={resolve(`/personajes/${character.id}`)} class="btn btn-ghost">Cancelar</a>
    </div>
  </form>
</div>
