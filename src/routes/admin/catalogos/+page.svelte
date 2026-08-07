<script lang="ts">
  import { enhance } from '$app/forms';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let showRaceForm = $state(false);
  let editingRace = $state<typeof data.races[number] | null>(null);

  let showSkillForm = $state(false);
  let editingSkill = $state<typeof data.skills[number] | null>(null);

  // Json type narrowing helper — Supabase returns Json which TS can't drill into
  function jval(obj: unknown, key: string): string | number | undefined {
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      return (obj as Record<string, unknown>)[key] as string | number | undefined;
    }
    return undefined;
  }

  function openNewRace() {
    editingRace = null;
    showRaceForm = true;
  }

  function openEditRace(race: typeof data.races[number]) {
    editingRace = race;
    showRaceForm = true;
  }

  function cancelRace() {
    showRaceForm = false;
    editingRace = null;
  }

  function openNewSkill() {
    editingSkill = null;
    showSkillForm = true;
  }

  function openEditSkill(skill: typeof data.skills[number]) {
    editingSkill = skill;
    showSkillForm = true;
  }

  function cancelSkill() {
    showSkillForm = false;
    editingSkill = null;
  }

  function attrLabel(a: string) {
    const labels: Record<string, string> = { F: 'Físico', D: 'Destreza', I: 'Inteligencia', P: 'Percepción', E: 'Espíritu' };
    return labels[a] ?? a;
  }
</script>

<svelte:head>
  <title>Catálogos — RolErrante</title>
</svelte:head>

<Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Catálogos' }]} class="mb-2" />

<PageHeader kicker="Panel admin" title="Catálogos" />

{#if form?.message}<div class="alert alert-error mb-4">{form.message}</div>{/if}

<!-- design admin-catalogos.html: .cat-grid with a .cat-card per catalog -->
<div class="cat-grid">

  <!-- Razas -->
  <section class="cat-card">
    <div class="cat-head">
      <h2>Razas</h2>
      {#if !showRaceForm}
        <button class="btn btn-primary btn-sm" onclick={openNewRace}>Nueva raza</button>
      {/if}
    </div>
    <div class="cat-body">

      {#if showRaceForm}
        <form
          method="POST"
          action="?/{editingRace ? 'updateRace' : 'createRace'}"
          use:enhance={() => cancelRace()}
          class="tint"
          style="margin-bottom:12px"
        >
          {#if editingRace}
            <input type="hidden" name="id" value={editingRace.id} />
          {/if}

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="field"><label for="r_name">Nombre</label><input id="r_name" name="name" type="text" class="input" value={editingRace?.name ?? ''} required /></div>
            <div class="field"><label for="r_group">Grupo</label><input id="r_group" name="group_name" type="text" class="input" value={editingRace?.group_name ?? ''} required placeholder="Alianza / Horda" /></div>
          </div>

          <div class="field"><label for="r_desc">Descripción</label><textarea id="r_desc" name="description" class="textarea" rows="2">{editingRace?.description ?? ''}</textarea></div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="field"><label for="r_size">Tamaño</label><input id="r_size" name="size" type="text" class="input" value={editingRace?.size ?? ''} required placeholder="Mediano, Grande..." /></div>
            <div class="field"><label for="r_magic">Magia (separado por comas)</label><input id="r_magic" name="magic_access" type="text" class="input" value={editingRace?.magic_access?.join(', ') ?? ''} placeholder="Arcana, Luz Sagrada" /></div>
          </div>

          <div class="field" style="border:1px solid var(--border);border-radius:var(--r-md);padding:12px">
            <span class="label">Datos físicos</span>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              <div class="field" style="margin:0"><label for="r_hmin">Altura mín (cm)</label><input id="r_hmin" name="altura_min" type="number" class="input" value={jval(editingRace?.physical_data, 'altura_min') ?? ''} /></div>
              <div class="field" style="margin:0"><label for="r_hmax">Altura máx (cm)</label><input id="r_hmax" name="altura_max" type="number" class="input" value={jval(editingRace?.physical_data, 'altura_max') ?? ''} /></div>
              <div class="field" style="margin:0"><label for="r_pmin">Peso mín (kg)</label><input id="r_pmin" name="peso_min" type="number" class="input" value={jval(editingRace?.physical_data, 'peso_min') ?? ''} /></div>
              <div class="field" style="margin:0"><label for="r_pmax">Peso máx (kg)</label><input id="r_pmax" name="peso_max" type="number" class="input" value={jval(editingRace?.physical_data, 'peso_max') ?? ''} /></div>
            </div>
          </div>

          <div class="field" style="border:1px solid var(--border);border-radius:var(--r-md);padding:12px">
            <span class="label">Edad</span>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
              <div class="field" style="margin:0"><label for="r_adu">Adultez</label><input id="r_adu" name="adultez" type="number" class="input" value={jval(editingRace?.age_data, 'adultez') ?? ''} /></div>
              <div class="field" style="margin:0"><label for="r_med">Mediana edad</label><input id="r_med" name="mediana_edad" type="number" class="input" value={jval(editingRace?.age_data, 'mediana_edad') ?? ''} /></div>
              <div class="field" style="margin:0"><label for="r_vej">Vejez</label><input id="r_vej" name="vejez" type="number" class="input" value={jval(editingRace?.age_data, 'vejez') ?? ''} /></div>
            </div>
          </div>

          <div class="row" style="gap:10px;justify-content:flex-end">
            <button type="button" class="btn btn-ghost btn-sm" onclick={cancelRace}>Cancelar</button>
            <button type="submit" class="btn btn-primary btn-sm">
              {editingRace ? 'Guardar cambios' : 'Crear raza'}
            </button>
          </div>
        </form>
      {/if}

      {#each data.races as race (race.id)}
        <div class="cat-row">
          <b>{race.name}</b>
          <span class="sub">{race.group_name} · {race.size}</span>
          <span class="acts">
            <button type="button" onclick={() => openEditRace(race)}>Editar</button>
            <form method="POST" action="?/deleteRace" use:enhance>
              <input type="hidden" name="id" value={race.id} />
              <button type="submit" class="danger" onclick={(e: MouseEvent) => { if (!confirm('¿Eliminar esta raza?')) e.preventDefault(); }}>
                Eliminar
              </button>
            </form>
          </span>
        </div>
      {/each}
      {#if data.races.length === 0}
        <p class="muted" style="font-size:.9rem;padding:8px 0">No hay razas registradas.</p>
      {/if}
    </div>
  </section>

  <!-- Habilidades -->
  <section class="cat-card">
    <div class="cat-head">
      <h2>Habilidades</h2>
      {#if !showSkillForm}
        <button class="btn btn-primary btn-sm" onclick={openNewSkill}>Nueva habilidad</button>
      {/if}
    </div>
    <div class="cat-body">

      {#if showSkillForm}
        <form
          method="POST"
          action="?/{editingSkill ? 'updateSkill' : 'createSkill'}"
          use:enhance={() => cancelSkill()}
          class="tint"
          style="margin-bottom:12px"
        >
          {#if editingSkill}
            <input type="hidden" name="id" value={editingSkill.id} />
          {/if}

          <div class="field"><label for="s_name">Nombre</label><input id="s_name" name="name" type="text" class="input" value={editingSkill?.name ?? ''} required /></div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="field"><label for="s_attr">Atributo</label>
              <select id="s_attr" name="attribute" class="select" required>
                {#each ['F', 'D', 'I', 'P', 'E'] as a (a)}
                  <option value={a} selected={(editingSkill?.attribute ?? 'F') === a}>{a} — {attrLabel(a)}</option>
                {/each}
              </select>
            </div>
            <div class="field"><span class="label">Requiere especialización</span>
              <label class="check" style="margin-top:8px">
                <input type="checkbox" name="requires_specialization" checked={editingSkill?.requires_specialization ?? false} />
                Sí
              </label>
            </div>
          </div>

          <div class="field"><label for="s_desc">Descripción</label><textarea id="s_desc" name="description" class="textarea" rows="2">{editingSkill?.description ?? ''}</textarea></div>

          <div class="field"><label for="s_specs">Especializaciones (separado por comas)</label><input id="s_specs" name="specializations" type="text" class="input" value={editingSkill?.specializations?.join(', ') ?? ''} placeholder="Armas a una mano, Escudos" /></div>

          <div class="row" style="gap:10px;justify-content:flex-end">
            <button type="button" class="btn btn-ghost btn-sm" onclick={cancelSkill}>Cancelar</button>
            <button type="submit" class="btn btn-primary btn-sm">
              {editingSkill ? 'Guardar cambios' : 'Crear habilidad'}
            </button>
          </div>
        </form>
      {/if}

      {#each data.skills as skill (skill.id)}
        {@const specCount = skill.specializations?.length ?? 0}
        <div class="cat-row">
          <b>{skill.name}</b>
          <span class="sub">
            {attrLabel(skill.attribute)}
            {#if skill.requires_specialization}· con espec. ({specCount}){:else}· sin espec.{/if}
          </span>
          <span class="acts">
            <button type="button" onclick={() => openEditSkill(skill)}>Editar</button>
            <form method="POST" action="?/deleteSkill" use:enhance>
              <input type="hidden" name="id" value={skill.id} />
              <button type="submit" class="danger" onclick={(e: MouseEvent) => { if (!confirm('¿Eliminar esta habilidad?')) e.preventDefault(); }}>
                Eliminar
              </button>
            </form>
          </span>
        </div>
      {/each}
      {#if data.skills.length === 0}
        <p class="muted" style="font-size:.9rem;padding:8px 0">No hay habilidades registradas.</p>
      {/if}
    </div>
  </section>

</div>
