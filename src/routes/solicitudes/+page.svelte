<script lang="ts">
  import { enhance } from '$app/forms';
  import { skillUpgradeCost } from '$lib/rules';
  import { statusLabel, statusColor, formatDate } from '$lib/utils';
  import type { ActionData, PageData } from './$types';

  export let data: PageData;
  export let form: ActionData;

  let selectedCharacterId = data.characters[0]?.id ?? '';
  $: selectedCharacter = data.characters.find((c: { id: string }) => c.id === selectedCharacterId);
  $: skills = (selectedCharacter?.skills ?? []).sort((a: { skill?: { attribute?: string } }, b: { skill?: { attribute?: string } }) => (a.skill?.attribute ?? '').localeCompare(b.skill?.attribute ?? ''));

  let targetLevels: Record<string, number> = {};
  let newSpecs: Record<string, string> = {};

  $: totalCost = skills.reduce((acc: number, s: { skill_id: string; level: number }) => {
    const target = targetLevels[s.skill_id] ?? s.level;
    return acc + (target > s.level ? skillUpgradeCost(s.level, target) : 0);
  }, 0);

  // Skill embed helper — supabase type inference loses nested embed fields on multi-FK tables
  const skillHasSpec = (s: unknown): boolean =>
    (s as { requires_specialization?: boolean })?.requires_specialization ?? false;
</script>

<svelte:head>
  <title>Solicitudes de habilidad — RolErrante</title>
</svelte:head>

<h1 class="text-3xl font-cinzel text-azeroth-gold mb-6">Solicitudes de habilidad</h1>

{#if data.characters.length === 0}
  <div class="alert alert-warning">Necesitas un personaje aprobado para solicitar mejoras.</div>
{:else}
  <div class="card bg-base-200 border border-azeroth-border mb-6">
    <div class="card-body">
      <h2 class="card-title font-cinzel text-azeroth-gold">Nueva solicitud</h2>
      {#if form?.message}<div class="alert alert-error text-sm">{form.message}</div>{/if}
      <form method="POST" use:enhance class="space-y-4">
        <div class="form-control">
          <label class="label" for="character_id"><span class="label-text">Personaje</span></label>
          <select id="character_id" name="character_id" class="select select-bordered" bind:value={selectedCharacterId} required>
            {#each data.characters as c}
              <option value={c.id}>{c.name} ({c.rp_points} pts)</option>
            {/each}
          </select>
        </div>

        <div class="space-y-2 max-h-96 overflow-y-auto pr-2">
          {#each skills as s}
            <div class="flex flex-col md:flex-row md:items-center gap-2 p-2 bg-base-100 rounded border border-azeroth-border">
              <div class="flex-1">
                <p class="font-semibold">{s.skill?.name}</p>
                <p class="text-xs text-gray-400">Actual: {s.level} · {s.skill?.attribute}</p>
              </div>
              <div class="flex items-center gap-2">
                <label class="text-sm" for="skill_level_{s.skill_id}">A</label>
                <input id="skill_level_{s.skill_id}" name="skill_level_{s.skill_id}" type="number" class="input input-bordered w-20 input-sm" min={s.level} max="10" bind:value={targetLevels[s.skill_id]} />
                {#if skillHasSpec(s.skill) || s.specialization}
                  <input name="skill_spec_{s.skill_id}" type="text" class="input input-bordered input-sm" placeholder="Especialización" bind:value={newSpecs[s.skill_id]} />
                {/if}
              </div>
            </div>
          {/each}
        </div>

        <div class="form-control">
          <label class="label" for="justification"><span class="label-text">Justificación / Trama</span></label>
          <textarea id="justification" name="justification" class="textarea textarea-bordered" rows="3" required></textarea>
        </div>

        <div class="flex justify-between items-center">
          <span class="badge badge-lg {totalCost > (selectedCharacter?.rp_points ?? 0) ? 'badge-error' : 'badge-primary'}">Coste total: {totalCost} XP</span>
          <button type="submit" class="btn btn-primary" disabled={totalCost === 0 || totalCost > (selectedCharacter?.rp_points ?? 0)}>Enviar solicitud</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<div class="card bg-base-200 border border-azeroth-border">
  <div class="card-body">
    <h2 class="card-title font-cinzel text-azeroth-gold">Historial</h2>
    {#if data.requests.length === 0}
      <p class="text-gray-400">No has enviado solicitudes.</p>
    {:else}
      <div class="space-y-3">
        {#each data.requests as req}
          <div class="p-3 bg-base-100 rounded border border-azeroth-border">
            <div class="flex justify-between items-start">
              <div>
                <p class="font-semibold">{req.character?.name} · {req.total_xp_cost} XP</p>
                <p class="text-xs text-gray-400">{formatDate(req.created_at)}</p>
              </div>
              <span class="badge {statusColor(req.status)}">{statusLabel(req.status)}</span>
            </div>
            {#if req.review_notes}
              <p class="text-sm mt-2 text-warning">Nota: {req.review_notes}</p>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
