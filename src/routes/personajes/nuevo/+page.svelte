<script lang="ts">
  import {
    groupSkillsByAttribute,
    skillCreationCost,
    attributeCost,
    validateAttributes,
    ATTR_POINTS_BUDGET,
    ATTR_BASE_VALUE,
    ATTR_MIN,
    ATTR_MAX,
  } from '$lib/rules';
  import { enhance } from '$app/forms';
  import { resolve } from '$app/paths';
  import Turnstile from '$lib/components/ui/Turnstile.svelte';
  import SubmitButton from '$lib/components/ui/SubmitButton.svelte';
  import AttributeInput from '$lib/components/forms/AttributeInput.svelte';
  import Field from '$lib/components/ui/Field.svelte';
  import CombatValues from '$lib/components/sheets/CombatValues.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
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

<section class="max-w-[1180px] mx-auto">
  <PageHeader kicker="Personajes" title="Nuevo personaje" />

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

  <div class="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
  <form
    class="min-w-0"
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
    <div class="form-card">
      <div class="form-card-head"><span class="form-card-num">1</span><h2>Datos básicos</h2><span class="meta">Identidad del personaje</span></div>
      <div class="form-card-body">
        <div class="grid md:grid-cols-2 gap-4">
          <Field label="Nombre" required>
            {#snippet ctrl()}
              <input id="name" name="name" type="text" class="input" required />
            {/snippet}
          </Field>
          <Field label="Raza" required>
            {#snippet ctrl()}
              <select id="race_id" name="race_id" class="select" required>
                <option value="">Selecciona</option>
                {#each data.races as race (race.id)}
                  <option value={race.id}>{race.name}</option>
                {/each}
              </select>
            {/snippet}
          </Field>
          <Field label="Edad">
            {#snippet ctrl()}
              <input id="age" name="age" type="number" class="input" min="0" />
            {/snippet}
          </Field>
          <Field label="Sexo">
            {#snippet ctrl()}
              <input id="sex" name="sex" type="text" class="input" />
            {/snippet}
          </Field>
          <Field label="Descripción física" class="md:col-span-2">
            {#snippet ctrl()}
              <textarea id="physical_description" name="physical_description" class="textarea" rows="3"></textarea>
            {/snippet}
          </Field>
          <Field label="Fuente de maná">
            {#snippet ctrl()}
              <select id="mana_source" name="mana_source" class="select">
                <option value="I">Inteligencia</option>
                <option value="E">Espíritu</option>
              </select>
            {/snippet}
          </Field>
          <Field label="URL de avatar" class="md:col-span-2" error={form && 'errors' in form ? (form.errors as Record<string, string>).avatar_url ?? null : null}>
            {#snippet ctrl()}
              <input id="avatar_url" name="avatar_url" type="text" class="input" placeholder="https://..." />
            {/snippet}
          </Field>
        </div>
      </div>
    </div>

    <!-- ATRIBUTOS -->
    <div class="form-card">
      <div class="form-card-head"><span class="form-card-num">2</span><h2>Atributos (4-10)</h2><span class="meta">base 4</span></div>
      <div class="form-card-body">

        <!-- Barra de puntos -->
        <div class="budget-bar ">
          <span class="text-sm font-semibold">Puntos de atributo</span>
          <div class="budget-track" style="max-width:320px"><div class="budget-fill" style="width:{(attrSpent / ATTR_POINTS_BUDGET) * 100}%"></div></div>
          <span class="budget-word">{attrRemaining} restantes</span>
          <span class="text-xs text-azeroth-muted">(gastados: {attrSpent} / {ATTR_POINTS_BUDGET})</span>
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
    <div class="form-card">
      <div class="form-card-head"><span class="form-card-num">3</span><h2>Habilidades</h2><span class="meta">{SKILL_POINTS} puntos</span></div>
      <div class="form-card-body">

        <!-- Barra de puntos -->
        <div class="budget-bar ">
          <span class="text-sm font-semibold">Puntos de habilidad</span>
          <div class="budget-track" style="max-width:320px"><div class="budget-fill" style="width:{(skillSpent / SKILL_POINTS) * 100}%"></div></div>
          <span class="budget-word">{skillRemaining} restantes</span>
          <span class="text-xs text-azeroth-muted">(gastados: {skillSpent} / {SKILL_POINTS})</span>
        </div>

        {#each Object.entries(grouped) as [attr, skills] (attr)}
          <div class="mb-4">
            <h3 class="font-cinzel text-azeroth-gold mb-2">{ATTR_LABELS['attr_' + attr.toLowerCase()] || attr}</h3>
            <div class="space-y-3">
              {#each skills as skill (skill.id)}
                <div class="flex flex-col md:flex-row md:items-center gap-2 p-2 bg-base-100 rounded border border-azeroth-border">
                  <div class="flex-1">
                    <p class="font-semibold">{skill.name}</p>
                    <p class="text-xs text-azeroth-muted">{skill.description ?? ''}</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <label class="text-sm" for="skill_level_{skill.id}">Nivel</label>
                    <input
                      id="skill_level_{skill.id}"
                      name="skill_level_{skill.id}"
                      type="number"
                      class="input w-20 input-sm"
                      min="0" max="10" value="0"
                      oninput={(e) => handleSkillInput(skill.id, e)}
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
      <a href={resolve('/personajes')} class="btn btn-ghost">Cancelar</a>
      {#if !canSubmit}
        <span class="text-xs text-error">Corrige los errores antes de enviar</span>
      {/if}
    </div>
  </form>

  <aside class="lg:sticky lg:top-6 space-y-6">
    <!-- SECCIÓN 4 — VISTA PREVIA DE COMBATE -->
    <section class="form-card" aria-labelledby="combat-preview-title">
      <div class="form-card-head">
        <span class="form-card-num">4</span>
        <h2 id="combat-preview-title">Vista previa de combate</h2>
        <span class="meta">en vivo</span>
      </div>
      <div class="form-card-body">
        <CombatValues attrs={previewAttrs} skills={previewSkills} />
      </div>
    </section>

    <!-- REGLAS DEL CENSO -->
    <div class="form-card">
      <div class="form-card-head"><h2>Reglas del censo</h2><span class="meta">cómo crear tu ficha</span></div>
      <div class="form-card-body text-sm">
        <ul class="list-inside list-disc space-y-2 text-azeroth-muted">
          <li>
            <span class="font-semibold text-azeroth-text-high">Atributos.</span> Los cinco valores
            (Físico, Destreza, Inteligencia, Percepción y Espíritu) parten de {ATTR_BASE_VALUE} y
            repartís hasta {ATTR_POINTS_BUDGET} puntos por encima de esa base, sin pasar de {ATTR_MAX}.
          </li>
          <li>Si un atributo llega al máximo, otro debe quedar en el mínimo ({ATTR_MIN}).</li>
          <li>
            <span class="font-semibold text-azeroth-text-high">Habilidades.</span> Contás con {SKILL_POINTS}
            puntos. Subir una habilidad al nivel N cuesta la suma acumulada 1 + 2 + … + N, así que
            conviene priorizar pocos niveles altos.
          </li>
          <li>
            Completás la ficha y la enviás a revisión; el consejo la aprueba y tu personaje pasa a
            formar parte del canon.
          </li>
        </ul>
      </div>
    </div>

    <!-- ¿Y DESPUÉS? -->
    <div class="form-card">
      <div class="form-card-head"><h2>¿Y después?</h2><span class="meta">siguientes pasos</span></div>
      <div class="form-card-body text-sm">
        <ol class="list-inside list-decimal space-y-2 text-azeroth-muted">
          <li>Envías la ficha a revisión con el botón “Crear personaje”.</li>
          <li>El consejo la revisa y la aprueba (o te pide ajustes).</li>
          <li>Una vez aprobada, tu personaje entra al canon y se muestra en el censo.</li>
          <li>Podés editar la ficha después del alta desde la sección Personajes.</li>
        </ol>
      </div>
    </div>
  </aside>
  </div>
</section>