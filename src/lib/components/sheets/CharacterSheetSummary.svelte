<script lang="ts">
  import type { ComponentType } from 'svelte';
  import { ATTRIBUTE_LABELS } from '$lib/rules';
  import { statusColor, statusLabel } from '$lib/utils';

  interface CharacterShape {
    name: string;
    race?: string | { name?: string } | null;
    age?: number | null;
    sex?: string | null;
    attr_fis: number;
    attr_des: number;
    attr_int: number;
    attr_per: number;
    attr_esp: number;
    mana_source?: 'I' | 'E';
    status?: string;
    rp_points?: number;
  }

  interface Props {
    character: CharacterShape;
    CombatValues?: ComponentType;
  }

  let { character, CombatValues }: Props = $props();

  const attrKeys = [
    { key: 'attr_fis', label: ATTRIBUTE_LABELS.F },
    { key: 'attr_des', label: ATTRIBUTE_LABELS.D },
    { key: 'attr_int', label: ATTRIBUTE_LABELS.I },
    { key: 'attr_per', label: ATTRIBUTE_LABELS.P },
    { key: 'attr_esp', label: ATTRIBUTE_LABELS.E },
  ] as const;

  let raceName = $derived(
    typeof character.race === 'string' ? character.race : (character.race?.name ?? 'Desconocida'),
  );
  let manaLabel = $derived(
    character.mana_source === 'I'
      ? 'Inteligencia'
      : character.mana_source === 'E'
        ? 'Espíritu'
        : '—',
  );
</script>

<div class="card bg-base-200 border border-azeroth-border">
  <div class="card-body">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-3xl font-cinzel text-azeroth-gold">{character.name}</h1>
        <p class="text-sm text-gray-400 mt-1">
          {raceName}{#if character.age != null} · {character.age} años{/if}{#if character.sex} · {character.sex}{/if}
        </p>
      </div>
      {#if character.status}
        <span class="badge badge-lg {statusColor(character.status)}">{statusLabel(character.status)}</span>
      {/if}
    </div>

    <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
      {#each attrKeys as attr (attr.key)}
        <div class="bg-base-100 rounded-lg p-3 text-center border border-azeroth-border">
          <p class="text-xs text-gray-400 uppercase tracking-wide">{attr.label}</p>
          <p class="text-2xl font-cinzel text-azeroth-gold">{character[attr.key]}</p>
        </div>
      {/each}
    </div>

    <div class="flex flex-wrap gap-4 mt-4 text-sm text-gray-400">
      <span>Fuente de maná: {manaLabel}</span>
      {#if character.rp_points != null}
        <span>Puntos de rol: {character.rp_points}</span>
      {/if}
    </div>

    {#if CombatValues}
      {@const Combat = CombatValues}
      <div class="mt-4">
        <Combat />
      </div>
    {/if}
  </div>
</div>