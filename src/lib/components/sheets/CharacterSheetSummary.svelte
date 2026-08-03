<script lang="ts">
  import type { ComponentType } from 'svelte';
  import { ATTRIBUTE_LABELS } from '$lib/rules';
  import { statusColor, statusLabel } from '$lib/utils';

  interface CharacterShape {
    name: string;
    race?: string | { name?: string; group_name?: string | null } | null;
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
    avatar_url?: string | null;
    nivel?: number | null;
  }

  interface Props {
    character: CharacterShape;
    CombatValues?: ComponentType;
  }

  let { character, CombatValues }: Props = $props();

  let avatarFailed = $state(false);
  let avatarUrl = $derived(character.avatar_url ?? '');
  let initial = $derived(character.name?.trim()?.[0]?.toUpperCase() ?? '?');

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
  let originName = $derived(
    typeof character.race === 'string' ? '—' : (character.race?.group_name ?? '—'),
  );
  let manaLabel = $derived(
    character.mana_source === 'I'
      ? 'Inteligencia'
      : character.mana_source === 'E'
        ? 'Espíritu'
        : '—',
  );

  let kpis = $derived([
    { key: 'raza', label: 'Raza', value: raceName },
    { key: 'clase', label: 'Clase', value: '—' },
    { key: 'origen', label: 'Origen', value: originName },
    { key: 'alineamiento', label: 'Alineamiento', value: '—' },
  ]);
</script>

<div class="card bg-base-200 border border-azeroth-border">
  <div class="card-body">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="flex items-start gap-4 min-w-0">
        {#if avatarUrl && !avatarFailed}
          <figure class="avatar avatar-xl">
            <img
              src={avatarUrl}
              alt={`Avatar de ${character.name}`}
              class="w-20 h-20 rounded-lg object-cover ring-4 ring-[var(--color-azeroth-gold)]"
              loading="lazy"
              onerror={() => (avatarFailed = true)}
            />
          </figure>
        {:else}
          <figure class="avatar avatar-xl">
            <div
              data-testid="character-avatar-initial"
              class="flex items-center justify-center w-20 h-20 rounded-lg bg-base-100 text-3xl font-cinzel text-azeroth-gold ring-4 ring-[var(--color-azeroth-gold)]"
            >
              {initial}
            </div>
          </figure>
        {/if}
        <div>
          <h1 class="text-3xl font-cinzel text-azeroth-gold">{character.name}</h1>
          <p class="text-sm text-azeroth-gold-soft mt-1">
            {raceName}{#if character.age != null} · {character.age} años{/if}{#if character.sex} · {character.sex}{/if}
          </p>
          {#if character.status}
            <div class="flex flex-wrap gap-2 mt-3">
              <span
                data-testid="character-status-badge"
                class="badge badge-lg {statusColor(character.status)}"
              >
                {statusLabel(character.status)}
              </span>
              {#if character.status === 'aprobado'}
                <span data-testid="character-canon-badge" class="badge badge-lg badge-primary">
                  Canon
                </span>
              {/if}
              {#if character.nivel != null}
                <span class="badge badge-lg badge-neutral">Nivel {character.nivel}</span>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    </div>

    <div data-testid="character-kpis" class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
      {#each kpis as kpi (kpi.key)}
        <div class="bg-base-100 rounded-lg p-3 text-center border border-azeroth-border">
          <p class="font-cinzel text-lg text-azeroth-gold truncate" title={kpi.value}>{kpi.value}</p>
          <p class="text-xs text-gray-400 uppercase tracking-wide">{kpi.label}</p>
        </div>
      {/each}
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
