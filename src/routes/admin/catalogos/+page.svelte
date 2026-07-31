<script lang="ts">
  import { enhance } from '$app/forms';
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

<h1 class="text-3xl font-cinzel text-azeroth-gold mb-6">Catálogos</h1>

{#if form?.message}<div class="alert alert-error mb-4">{form.message}</div>{/if}

<div class="grid lg:grid-cols-2 gap-6">

  <!-- Razas -->
  <div class="card bg-base-200 border border-azeroth-border">
    <div class="card-body">
      <div class="flex justify-between items-center">
        <h2 class="card-title font-cinzel text-azeroth-gold">Razas</h2>
        {#if !showRaceForm}
          <button class="btn btn-primary btn-sm" onclick={openNewRace}>Nueva raza</button>
        {/if}
      </div>

      {#if showRaceForm}
        <form
          method="POST"
          action="?/{editingRace ? 'updateRace' : 'createRace'}"
          use:enhance={() => cancelRace()}
          class="space-y-3 mt-2 p-3 bg-base-100 rounded border border-azeroth-border"
        >
          {#if editingRace}
            <input type="hidden" name="id" value={editingRace.id} />
          {/if}

          <div class="grid grid-cols-2 gap-2">
            <div class="form-control">
              <label class="label" for="r_name"><span class="label-text text-xs">Nombre</span></label>
              <input id="r_name" name="name" type="text" class="input input-bordered input-sm" value={editingRace?.name ?? ''} required />
            </div>
            <div class="form-control">
              <label class="label" for="r_group"><span class="label-text text-xs">Grupo</span></label>
              <input id="r_group" name="group_name" type="text" class="input input-bordered input-sm" value={editingRace?.group_name ?? ''} required placeholder="Alianza / Horda" />
            </div>
          </div>

          <div class="form-control">
            <label class="label" for="r_desc"><span class="label-text text-xs">Descripción</span></label>
            <textarea id="r_desc" name="description" class="textarea textarea-bordered textarea-sm" rows="2">{editingRace?.description ?? ''}</textarea>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div class="form-control">
              <label class="label" for="r_size"><span class="label-text text-xs">Tamaño</span></label>
              <input id="r_size" name="size" type="text" class="input input-bordered input-sm" value={editingRace?.size ?? ''} required placeholder="Mediano, Grande..." />
            </div>
            <div class="form-control">
              <label class="label" for="r_magic"><span class="label-text text-xs">Magia (separado por comas)</span></label>
              <input id="r_magic" name="magic_access" type="text" class="input input-bordered input-sm" value={editingRace?.magic_access?.join(', ') ?? ''} placeholder="Arcana, Luz Sagrada" />
            </div>
          </div>

          <fieldset class="border border-azeroth-border rounded p-2">
            <legend class="text-xs text-gray-400 px-1">Datos físicos</legend>
            <div class="grid grid-cols-2 gap-2">
              <div class="form-control">
                <label class="label" for="r_hmin"><span class="label-text text-xs">Altura mín (cm)</span></label>
                <input id="r_hmin" name="altura_min" type="number" class="input input-bordered input-sm" value={jval(editingRace?.physical_data, 'altura_min') ?? ''} />
              </div>
              <div class="form-control">
                <label class="label" for="r_hmax"><span class="label-text text-xs">Altura máx (cm)</span></label>
                <input id="r_hmax" name="altura_max" type="number" class="input input-bordered input-sm" value={jval(editingRace?.physical_data, 'altura_max') ?? ''} />
              </div>
              <div class="form-control">
                <label class="label" for="r_pmin"><span class="label-text text-xs">Peso mín (kg)</span></label>
                <input id="r_pmin" name="peso_min" type="number" class="input input-bordered input-sm" value={jval(editingRace?.physical_data, 'peso_min') ?? ''} />
              </div>
              <div class="form-control">
                <label class="label" for="r_pmax"><span class="label-text text-xs">Peso máx (kg)</span></label>
                <input id="r_pmax" name="peso_max" type="number" class="input input-bordered input-sm" value={jval(editingRace?.physical_data, 'peso_max') ?? ''} />
              </div>
            </div>
          </fieldset>

          <fieldset class="border border-azeroth-border rounded p-2">
            <legend class="text-xs text-gray-400 px-1">Edad</legend>
            <div class="grid grid-cols-3 gap-2">
              <div class="form-control">
                <label class="label" for="r_adu"><span class="label-text text-xs">Adultez</span></label>
                <input id="r_adu" name="adultez" type="number" class="input input-bordered input-sm" value={jval(editingRace?.age_data, 'adultez') ?? ''} />
              </div>
              <div class="form-control">
                <label class="label" for="r_med"><span class="label-text text-xs">Mediana edad</span></label>
                <input id="r_med" name="mediana_edad" type="number" class="input input-bordered input-sm" value={jval(editingRace?.age_data, 'mediana_edad') ?? ''} />
              </div>
              <div class="form-control">
                <label class="label" for="r_vej"><span class="label-text text-xs">Vejez</span></label>
                <input id="r_vej" name="vejez" type="number" class="input input-bordered input-sm" value={jval(editingRace?.age_data, 'vejez') ?? ''} />
              </div>
            </div>
          </fieldset>

          <div class="flex gap-2 justify-end">
            <button type="button" class="btn btn-ghost btn-sm" onclick={cancelRace}>Cancelar</button>
            <button type="submit" class="btn btn-primary btn-sm">
              {editingRace ? 'Guardar cambios' : 'Crear raza'}
            </button>
          </div>
        </form>
      {/if}

      <div class="overflow-x-auto mt-2">
        <table class="table table-sm">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Grupo</th>
              <th>Tamaño</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {#each data.races as race}
              <tr>
                <td class="font-semibold">{race.name}</td>
                <td>{race.group_name}</td>
                <td>{race.size}</td>
                <td>
                  <div class="flex gap-1">
                    <button class="btn btn-ghost btn-xs" onclick={() => openEditRace(race)}>Editar</button>
                    <form method="POST" action="?/deleteRace" use:enhance>
                      <input type="hidden" name="id" value={race.id} />
                      <button type="submit" class="btn btn-error btn-xs" onclick={(e: MouseEvent) => { if (!confirm('¿Eliminar esta raza?')) e.preventDefault(); }}>
                        Eliminar
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
        {#if data.races.length === 0}
          <p class="text-gray-500 text-center py-4">No hay razas registradas.</p>
        {/if}
      </div>
    </div>
  </div>

  <!-- Habilidades -->
  <div class="card bg-base-200 border border-azeroth-border">
    <div class="card-body">
      <div class="flex justify-between items-center">
        <h2 class="card-title font-cinzel text-azeroth-gold">Habilidades</h2>
        {#if !showSkillForm}
          <button class="btn btn-primary btn-sm" onclick={openNewSkill}>Nueva habilidad</button>
        {/if}
      </div>

      {#if showSkillForm}
        <form
          method="POST"
          action="?/{editingSkill ? 'updateSkill' : 'createSkill'}"
          use:enhance={() => cancelSkill()}
          class="space-y-3 mt-2 p-3 bg-base-100 rounded border border-azeroth-border"
        >
          {#if editingSkill}
            <input type="hidden" name="id" value={editingSkill.id} />
          {/if}

          <div class="form-control">
            <label class="label" for="s_name"><span class="label-text text-xs">Nombre</span></label>
            <input id="s_name" name="name" type="text" class="input input-bordered input-sm" value={editingSkill?.name ?? ''} required />
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div class="form-control">
              <label class="label" for="s_attr"><span class="label-text text-xs">Atributo</span></label>
              <select id="s_attr" name="attribute" class="select select-bordered select-sm" required>
                {#each ['F', 'D', 'I', 'P', 'E'] as a}
                  <option value={a} selected={(editingSkill?.attribute ?? 'F') === a}>{a} — {attrLabel(a)}</option>
                {/each}
              </select>
            </div>
            <div class="form-control items-start justify-end">
              <label class="label cursor-pointer gap-2">
                <span class="label-text text-xs">Requiere especialización</span>
                <input type="checkbox" name="requires_specialization" class="checkbox checkbox-sm" checked={editingSkill?.requires_specialization ?? false} />
              </label>
            </div>
          </div>

          <div class="form-control">
            <label class="label" for="s_desc"><span class="label-text text-xs">Descripción</span></label>
            <textarea id="s_desc" name="description" class="textarea textarea-bordered textarea-sm" rows="2">{editingSkill?.description ?? ''}</textarea>
          </div>

          <div class="form-control">
            <label class="label" for="s_specs"><span class="label-text text-xs">Especializaciones (separado por comas)</span></label>
            <input id="s_specs" name="specializations" type="text" class="input input-bordered input-sm" value={editingSkill?.specializations?.join(', ') ?? ''} placeholder="Armas a una mano, Escudos" />
          </div>

          <div class="flex gap-2 justify-end">
            <button type="button" class="btn btn-ghost btn-sm" onclick={cancelSkill}>Cancelar</button>
            <button type="submit" class="btn btn-primary btn-sm">
              {editingSkill ? 'Guardar cambios' : 'Crear habilidad'}
            </button>
          </div>
        </form>
      {/if}

      <div class="overflow-x-auto mt-2">
        <table class="table table-sm">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Atributo</th>
              <th>Especialización?</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {#each data.skills as skill}
              <tr>
                <td class="font-semibold">{skill.name}</td>
                <td>{attrLabel(skill.attribute)}</td>
                <td>
                  {#if skill.requires_specialization}
                    <span class="badge badge-sm">{skill.specializations?.length ?? 0} opciones</span>
                  {:else}
                    <span class="text-gray-500 text-xs">—</span>
                  {/if}
                </td>
                <td>
                  <div class="flex gap-1">
                    <button class="btn btn-ghost btn-xs" onclick={() => openEditSkill(skill)}>Editar</button>
                    <form method="POST" action="?/deleteSkill" use:enhance>
                      <input type="hidden" name="id" value={skill.id} />
                      <button type="submit" class="btn btn-error btn-xs" onclick={(e: MouseEvent) => { if (!confirm('¿Eliminar esta habilidad?')) e.preventDefault(); }}>
                        Eliminar
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
        {#if data.skills.length === 0}
          <p class="text-gray-500 text-center py-4">No hay habilidades registradas.</p>
        {/if}
      </div>
    </div>
  </div>

</div>