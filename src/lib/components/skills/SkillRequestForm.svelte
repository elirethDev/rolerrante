<script lang="ts">
  import { enhance } from '$app/forms';
  import { skillUpgradeCost } from '$lib/rules';
  import { User } from '@lucide/svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import Field from '$lib/components/ui/Field.svelte';
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
  <div class="card bg-base-200 border border-azeroth-border">
    <div class="card-body">
      <h2 class="card-title font-cinzel text-azeroth-gold">Nueva solicitud</h2>
      {#if form?.message}
        <div class="alert alert-error text-sm">{form.message}</div>
      {/if}
      <form method="POST" use:enhance class="space-y-4">
        <Field label="Personaje" required {size}>
          {#snippet ctrl()}
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
          {/snippet}
        </Field>

        <div class="space-y-2 max-h-96 overflow-y-auto pr-2">
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

        <Field label="Justificación / Trama" required {size}>
          {#snippet ctrl()}
            <textarea id="justification" name="justification" class="textarea" rows="3" required></textarea>
          {/snippet}
        </Field>

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