<script lang="ts">
  import { enhance } from '$app/forms';
  import { resolve } from '$app/paths';
  import Field from '$lib/components/forms/Field.svelte';
  import AttributeInput from '$lib/components/forms/AttributeInput.svelte';
  import SubmitButton from '$lib/components/ui/SubmitButton.svelte';
  import CombatValues from '$lib/components/sheets/CombatValues.svelte';
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
</script>

<svelte:head>
  <title>Editar personaje — RolErrante</title>
</svelte:head>

<section class="max-w-4xl mx-auto">
  <h1 class="text-3xl font-cinzel text-azeroth-gold mb-6">Editar personaje</h1>

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
    use:enhance={() => {
      pending = true;
      return async ({ result, update }) => {
        pending = false;
        await update();
      };
    }}
  >
    <!-- DATOS BÁSICOS -->
    <div class="card bg-base-200 border border-azeroth-border mb-6">
      <div class="card-body">
        <h2 class="card-title font-cinzel text-azeroth-gold">Datos básicos</h2>
        <div class="grid md:grid-cols-2 gap-4">
          <Field label="Nombre" required error={form && 'errors' in form ? (form.errors as Record<string, string>).name ?? null : null}>
            {#snippet ctrl()}
              <input id="name" name="name" type="text" class="input" bind:value={name} required />
            {/snippet}
          </Field>
          <Field label="Raza" required error={form && 'errors' in form ? (form.errors as Record<string, string>).race ?? null : null}>
            {#snippet ctrl()}
              <select id="race_id" name="race_id" class="select" bind:value={raceId} required>
                <option value="">Selecciona</option>
                {#each data.races as race (race.id)}
                  <option value={race.id}>{race.name}</option>
                {/each}
              </select>
            {/snippet}
          </Field>
          <Field label="Edad">
            {#snippet ctrl()}
              <input id="age" name="age" type="number" class="input" min="0" bind:value={age} />
            {/snippet}
          </Field>
          <Field label="Sexo">
            {#snippet ctrl()}
              <input id="sex" name="sex" type="text" class="input" bind:value={sex} />
            {/snippet}
          </Field>
          <Field label="Descripción física" class="md:col-span-2">
            {#snippet ctrl()}
              <textarea id="physical_description" name="physical_description" class="textarea" rows="3" bind:value={physicalDescription}></textarea>
            {/snippet}
          </Field>
          <Field label="Fuente de maná">
            {#snippet ctrl()}
              <select id="mana_source" name="mana_source" class="select" bind:value={manaSource}>
                <option value="I">Inteligencia</option>
                <option value="E">Espíritu</option>
              </select>
            {/snippet}
          </Field>
          <Field label="URL de avatar" class="md:col-span-2" error={form && 'errors' in form ? (form.errors as Record<string, string>).avatar_url ?? null : null}>
            {#snippet ctrl()}
              <input id="avatar_url" name="avatar_url" type="text" class="input" placeholder="https://..." bind:value={avatarUrl} />
            {/snippet}
          </Field>
          <Field label="Estado" required>
            {#snippet ctrl()}
              <select id="status" name="status" class="select" bind:value={status}>
                <option value="borrador">Borrador</option>
                <option value="pendiente">Pendiente (enviar a revisión)</option>
              </select>
            {/snippet}
          </Field>
        </div>
      </div>
    </div>

    <!-- ATRIBUTOS -->
    <div class="card bg-base-200 border border-azeroth-border mb-6">
      <div class="card-body">
        <h2 class="card-title font-cinzel text-azeroth-gold">Atributos (4-10)</h2>
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
    <div class="flex gap-3 items-center">
      <SubmitButton class="font-cinzel" pending={pending}>Guardar cambios</SubmitButton>
      <a href={resolve(`/personajes/${character.id}`)} class="btn btn-ghost">Cancelar</a>
    </div>
  </form>
</section>
