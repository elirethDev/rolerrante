<script lang="ts">
  import { enhance } from '$app/forms';
  import { skillUpgradeCost } from '$lib/rules';
  import { User } from '@lucide/svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
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
    size?: 'sm' | 'md';
  }

  let { characters = [], skills = [], form = null, size = 'md' }: Props = $props();

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
  <EmptyState icon={User} title="Sin personajes aprobados" description="Necesitás un personaje aprobado para solicitar mejoras." />
{:else}
  <section class="form-card">
    <div class="form-card-head">
      <h2>Nueva solicitud</h2>
      <span class="meta">Subir habilidades</span>
    </div>
    <div class="form-card-body">
      {#if form?.message}
        <div class="form-error" role="alert">{form.message}</div>
      {/if}
      <form method="POST" use:enhance>
        <div class="field">
          <label for="character_id">Personaje <span class="req">*</span></label>
          <select
            id="character_id"
            name="character_id"
            class="select"
            bind:value={selectedCharacterId}
            required
          >
            {#each characters as c (c.id)}
              <option value={c.id}>{c.name} ({c.rp_points ?? 0} pts)</option>
            {/each}
          </select>
        </div>

        <div class="picker-scroll">
          <SkillPicker
            mode="upgrade"
            skills={gridSkills}
            levels={targetLevels}
            onLevelChange={(id, value) => (targetLevels[id] = value)}
            specs={specs}
            onSpecChange={(id, value) => (specs[id] = value)}
            {size}
          />
        </div>

        <div class="field">
          <label for="justification">Justificación / Trama <span class="req">*</span></label>
          <textarea id="justification" name="justification" class="textarea" rows="3" required></textarea>
        </div>

        <div class="cost-bar {overBudget ? 'over' : ''}">
          <span class="lbl">Coste total</span>
          <span class="cost-right">
            <span class="xp">{totalCost} XP</span>
            <button type="submit" class="btn btn-primary" disabled={!canSubmit}>Enviar solicitud</button>
          </span>
        </div>
      </form>
    </div>
  </section>
{/if}