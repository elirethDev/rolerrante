<script lang="ts">
  import { groupSkillsByAttribute, skillCreationCost, attributeCost, validateAttributes, ATTR_POINTS_BUDGET } from '$lib/rules';
  import { enhance } from '$app/forms';
  import Turnstile from '$lib/components/ui/Turnstile.svelte';
  import SubmitButton from '$lib/components/ui/SubmitButton.svelte';
  import AttributeInput from '$lib/components/forms/AttributeInput.svelte';
  import CombatValues from '$lib/components/sheets/CombatValues.svelte';
  import type { ActionData, PageData } from './$types';
  import type { Skill } from '$lib/types';

  export let data: PageData;
  export let form: ActionData;

  let pending = false;
  let grouped = groupSkillsByAttribute(data.skills as unknown as Skill[] ?? []);
  let turnstileToken = '';

  const ATTR_KEYS = ['attr_fis', 'attr_des', 'attr_int', 'attr_per', 'attr_esp'] as const;
  const ATTR_LABELS: Record<string, string> = {
    attr_fis: 'Físico', attr_des: 'Destreza', attr_int: 'Inteligencia', attr_per: 'Percepción', attr_esp: 'Espíritu',
  };
  const SKILL_POINTS = data.creationPoints ?? 25;

  // Estados reactivos
  let attrValues: Record<string, number> = {
    attr_fis: 5, attr_des: 5, attr_int: 5, attr_per: 5, attr_esp: 5,
  };
  let skillLevels: Record<string, number> = {};

  $: attrSpent = attributeCost(attrValues);
  $: attrRemaining = ATTR_POINTS_BUDGET - attrSpent;
  $: attrErrors = validateAttributes(attrValues);

  $: skillSpent = Object.values(skillLevels).reduce((sum, lv) => sum + skillCreationCost(lv), 0);
  $: skillRemaining = SKILL_POINTS - skillSpent;

  $: totalErrors = [
    ...attrErrors,
    ...(skillSpent > SKILL_POINTS ? [`Has gastado ${skillSpent} de ${SKILL_POINTS} puntos de habilidad`] : []),
  ];
  $: canSubmit = totalErrors.length === 0;

  // Vista previa de valores de combate en vivo
  $: previewAttrs = {
    attr_fis: attrValues.attr_fis,
    attr_des: attrValues.attr_des,
    attr_int: attrValues.attr_int,
    attr_per: attrValues.attr_per,
    attr_esp: attrValues.attr_esp,
  };
  $: previewSkills = Object.entries(skillLevels)
    .filter(([, lvl]) => lvl > 0)
    .map(([id, level]) => {
      const skill = (data.skills as unknown as Skill[])?.find((s) => s.id === id);
      return skill
        ? { skill: { name: skill.name, attribute: skill.attribute }, level }
        : { level };
    });

  function handleSkillInput(key: string, e: Event) {
    const val = parseInt((e.target as HTMLInputElement).value) || 0;
    skillLevels = { ...skillLevels, [key]: val };
  }
</script>

<svelte:head>
  <title>Nuevo personaje — RolErrante</title>
</svelte:head>

<section class="max-w-4xl mx-auto">
  <h1 class="text-3xl font-cinzel text-azeroth-gold mb-6">Nuevo personaje</h1>

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
          <fieldset class="fieldset">
            <legend class="fieldset-legend">Nombre</legend>
            <input id="name" name="name" type="text" class="input" required />
          </fieldset>
          <fieldset class="fieldset">
            <legend class="fieldset-legend">Raza</legend>
            <select id="race_id" name="race_id" class="select" required>
              <option value="">Selecciona</option>
              {#each data.races as race (race.id)}
                <option value={race.id}>{race.name}</option>
              {/each}
            </select>
          </fieldset>
          <fieldset class="fieldset">
            <legend class="fieldset-legend">Edad</legend>
            <input id="age" name="age" type="number" class="input" min="0" />
          </fieldset>
          <fieldset class="fieldset">
            <legend class="fieldset-legend">Sexo</legend>
            <input id="sex" name="sex" type="text" class="input" />
          </fieldset>
          <fieldset class="fieldset md:col-span-2">
            <legend class="fieldset-legend">Descripción física</legend>
            <textarea id="physical_description" name="physical_description" class="textarea" rows="3"></textarea>
          </fieldset>
          <fieldset class="fieldset">
            <legend class="fieldset-legend">Fuente de maná</legend>
            <select id="mana_source" name="mana_source" class="select">
              <option value="I">Inteligencia</option>
              <option value="E">Espíritu</option>
            </select>
          </fieldset>
        </div>
      </div>
    </div>

    <!-- ATRIBUTOS -->
    <div class="card bg-base-200 border border-azeroth-border mb-6">
      <div class="card-body">
        <h2 class="card-title font-cinzel text-azeroth-gold">Atributos (4-10)</h2>

        <!-- Barra de puntos -->
        <div class="flex items-center gap-3 mb-4 p-3 rounded-lg {attrRemaining < 0 ? 'bg-red-900/30 border border-red-500' : 'bg-base-300'}">
          <span class="text-sm font-semibold">Puntos de atributo:</span>
          <span class="badge {attrRemaining < 0 ? 'badge-error' : attrRemaining <= 3 ? 'badge-warning' : 'badge-success'} badge-lg">
            {attrRemaining} restantes
          </span>
          <span class="text-xs text-gray-400">(gastados: {attrSpent} / {ATTR_POINTS_BUDGET})</span>
        </div>

        {#if attrErrors.length > 0}
          <div class="alert alert-warning mb-3 text-sm">
            <ul class="list-disc list-inside">
              {#each attrErrors as err (err)}
                <li>{err}</li>
              {/each}
            </ul>
          </div>
        {/if}

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

    <!-- HABILIDADES -->
    <div class="card bg-base-200 border border-azeroth-border mb-6">
      <div class="card-body">
        <h2 class="card-title font-cinzel text-azeroth-gold">Habilidades</h2>

        <!-- Barra de puntos -->
        <div class="flex items-center gap-3 mb-4 p-3 rounded-lg {skillRemaining < 0 ? 'bg-red-900/30 border border-red-500' : 'bg-base-300'}">
          <span class="text-sm font-semibold">Puntos de habilidad:</span>
          <span class="badge {skillRemaining < 0 ? 'badge-error' : skillRemaining <= 5 ? 'badge-warning' : 'badge-success'} badge-lg">
            {skillRemaining} restantes
          </span>
          <span class="text-xs text-gray-400">(gastados: {skillSpent} / {SKILL_POINTS})</span>
        </div>

        {#each Object.entries(grouped) as [attr, skills] (attr)}
          <div class="mb-4">
            <h3 class="font-cinzel text-azeroth-gold mb-2">{ATTR_LABELS['attr_' + attr.toLowerCase()] || attr}</h3>
            <div class="space-y-2">
              {#each skills as skill (skill.id)}
                <div class="flex flex-col md:flex-row md:items-center gap-2 p-2 bg-base-100 rounded border border-azeroth-border">
                  <div class="flex-1">
                    <p class="font-semibold">{skill.name}</p>
                    <p class="text-xs text-gray-400">{skill.description ?? ''}</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <label class="text-sm" for="skill_level_{skill.id}">Nivel</label>
                    <input
                      id="skill_level_{skill.id}"
                      name="skill_level_{skill.id}"
                      type="number"
                      class="input w-20 input-sm"
                      min="0" max="10" value="0"
                      on:input={(e) => handleSkillInput(skill.id, e)}
                    />
                    {#if skill.requires_specialization}
                      <input name="skill_spec_{skill.id}" type="text" class="input input-sm" placeholder="Especialización" />
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- VISTA PREVIA DE COMBATE -->
    <div class="mb-6">
      <CombatValues attrs={previewAttrs} skills={previewSkills} />
    </div>

    <!-- TURNSTILE -->
    <div class="flex justify-center mb-4">
      <Turnstile bind:token={turnstileToken} theme="dark" />
    </div>
    <input type="hidden" name="cf-turnstile-response" value={turnstileToken} />

    <!-- BOTONES -->
    <div class="flex gap-3 items-center">
      <SubmitButton class="font-cinzel" disabled={!canSubmit || !turnstileToken} pending={pending}>
        Crear personaje
      </SubmitButton>
      <a href="/personajes" class="btn btn-ghost">Cancelar</a>
      {#if !canSubmit}
        <span class="text-xs text-error">Corrige los errores antes de enviar</span>
      {/if}
    </div>
  </form>
</section>