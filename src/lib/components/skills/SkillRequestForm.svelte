<script lang="ts">
  import { enhance } from '$app/forms';
  import { skillUpgradeCost } from '$lib/rules';
  import SkillPicker from './SkillPicker.svelte';

  interface CharacterShape {
    id: string;
    name: string;
    rp_points?: number;
    skills?: Array<{
      id?: string;
      name?: string;
      attribute?: string;
      description?: string | null;
      requires_specialization?: boolean;
      skill_id: string;
      level: number;
      specialization?: string | null;
      skill?: { id?: string; name?: string; attribute?: string; requires_specialization?: boolean } | null;
    }>;
  }

  interface AnySkill {
    skill_id: string;
    level: number;
    specialization?: string | null;
    skill?: { id?: string; name?: string; attribute?: string; description?: string | null; requires_specialization?: boolean } | null;
  }

  interface Props {
    characters?: CharacterShape[];
    skills?: AnySkill[];
    form?: { message?: string } | null;
  }

  let { characters = [], skills = [], form = null }: Props = $props();

  let selectedCharacterId = $state('');
  let targetLevels = $state<Record<string, number>>({});
  let specs = $state<Record<string, string>>({});

  let effectiveCharacterId = $derived(selectedCharacterId || characters[0]?.id || '');
  let selectedCharacter = $derived(characters.find((c) => c.id === effectiveCharacterId));
  let gridSkills = $derived<AnySkill[]>(skills.length > 0 ? skills : (selectedCharacter?.skills ?? []));

  let totalCost = $derived(
    gridSkills.reduce((acc, s) => {
      const target = targetLevels[s.skill_id] ?? s.level;
      return acc + (target > s.level ? skillUpgradeCost(s.level, target) : 0);
    }, 0),
  );
  let availablePoints = $derived(selectedCharacter?.rp_points ?? 0);
  let overBudget = $derived(totalCost > availablePoints);
  let canSubmit = $derived(totalCost > 0 && !overBudget);
</script>

{#if characters.length === 0}
  <div class="alert alert-warning">Necesitas un personaje aprobado para solicitar mejoras.</div>
{:else}
  <div class="card bg-base-200 border border-azeroth-border">
    <div class="card-body">
      <h2 class="card-title font-cinzel text-azeroth-gold">Nueva solicitud</h2>
      {#if form?.message}
        <div class="alert alert-error text-sm">{form.message}</div>
      {/if}
      <form method="POST" use:enhance class="space-y-4">
        <div class="form-control">
          <label class="label" for="character_id"><span class="label-text">Personaje</span></label>
          <select
            id="character_id"
            name="character_id"
            class="select select-bordered"
            bind:value={selectedCharacterId}
            required
          >
            {#each characters as c}
              <option value={c.id}>{c.name} ({c.rp_points ?? 0} pts)</option>
            {/each}
          </select>
        </div>

        <div class="space-y-2 max-h-96 overflow-y-auto pr-2">
          <SkillPicker
            mode="upgrade"
            skills={gridSkills}
            levels={targetLevels}
            onLevelChange={(id, value) => (targetLevels[id] = value)}
            specs={specs}
            onSpecChange={(id, value) => (specs[id] = value)}
          />
        </div>

        <div class="form-control">
          <label class="label" for="justification"><span class="label-text">Justificación / Trama</span></label>
          <textarea id="justification" name="justification" class="textarea textarea-bordered" rows="3" required></textarea>
        </div>

        <div class="flex justify-between items-center">
          <span class="badge badge-lg {overBudget ? 'badge-error' : totalCost > 0 ? 'badge-primary' : 'badge-ghost'}">
            Coste total: {totalCost} XP
          </span>
          <button type="submit" class="btn btn-primary" disabled={!canSubmit}>Enviar solicitud</button>
        </div>
      </form>
    </div>
  </div>
{/if}