<script lang="ts">
  import type { PageData } from './$types';
  import { combatValues, ATTRIBUTE_LABELS } from '$lib/rules';
  import { statusLabel, statusColor, formatDate } from '$lib/utils';
  import type { Character, CharacterSkill } from '$lib/types';
  import { Shield, Heart, Zap, Swords } from 'lucide-svelte';

  export let data: PageData;

  // character comes from Supabase join query with embedded skills, stories, race
  // Use auto-inferred DB type but cast to Character at combatValues call site
  $: character = data.character;
  $: skills = (character.skills ?? []).filter((s: { level: number }) => s.level > 0);
  $: combat = combatValues(character as unknown as Character, character.skills as unknown as CharacterSkill[] ?? []);
  $: canModerate = data.profile?.role === 'gm' || data.profile?.role === 'admin';

  const ATTR_KEY_TO_COLUMN: Record<string, string> = {
    F: 'attr_fis',
    D: 'attr_des',
    I: 'attr_int',
    P: 'attr_per',
    E: 'attr_esp',
  };

  // Index-safe attribute accessor — DB row type lacks index signature
  const charAttr = (key: string) =>
    (character as Record<string, unknown>)[ATTR_KEY_TO_COLUMN[key]] ?? '?';
</script>

<svelte:head>
  <title>{character.name} — RolErrante</title>
</svelte:head>

<section class="max-w-4xl mx-auto">
  <div class="flex flex-wrap items-start justify-between gap-4 mb-6">
    <div>
      <h1 class="text-4xl font-cinzel text-azeroth-gold">{character.name}</h1>
      <p class="text-gray-400">{character.race?.name ?? ''} · {character.age ?? '?'} años · {character.sex ?? ''}</p>
    </div>
    <span class="badge badge-lg {statusColor(character.status)}">{statusLabel(character.status)}</span>
  </div>

  <div class="grid md:grid-cols-3 gap-6">
    <div class="md:col-span-2 space-y-6">
      <div class="card bg-base-200 border border-azeroth-border">
        <div class="card-body">
          <h2 class="card-title font-cinzel text-azeroth-gold">Atributos</h2>
          <div class="grid grid-cols-5 gap-4 text-center">
            {#each Object.entries(ATTRIBUTE_LABELS) as [key, label]}
              <div class="bg-base-100 rounded p-3 border border-azeroth-border">
                <p class="text-xs text-gray-400 uppercase">{label}</p>
                <p class="text-2xl font-cinzel text-azeroth-gold">{charAttr(key)}</p>
              </div>
            {/each}
          </div>
        </div>
      </div>

      <div class="card bg-base-200 border border-azeroth-border">
        <div class="card-body">
          <h2 class="card-title font-cinzel text-azeroth-gold">Habilidades</h2>
          {#if skills.length === 0}
            <p class="text-gray-400">Sin habilidades destacadas.</p>
          {:else}
            <div class="grid md:grid-cols-2 gap-3">
              {#each skills as s}
                <div class="flex justify-between bg-base-100 p-2 rounded border border-azeroth-border">
                  <span>{s.skill?.name}{s.specialization ? ` (${s.specialization})` : ''}</span>
                  <span class="font-cinzel text-azeroth-gold">{s.level}</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>

  {#if character.physical_description}
    <div class="card bg-base-200 border border-azeroth-border">
      <div class="card-body">
        <h2 class="card-title font-cinzel text-azeroth-gold">Descripción física</h2>
        <p class="whitespace-pre-wrap">{character.physical_description}</p>
      </div>
    </div>
  {/if}

  {#if canModerate && character.status === 'pendiente'}
    <div class="card bg-base-200 border border-azeroth-border">
      <div class="card-body">
        <h2 class="card-title font-cinzel text-azeroth-gold">Moderación GM</h2>
        <div class="flex flex-col gap-3 mt-2">
          <form method="POST" action="?/approve">
            <button type="submit" class="btn btn-success w-full">✓ Aprobar ficha</button>
          </form>
          <form method="POST" action="?/reject" class="flex gap-2">
            <button type="submit" class="btn btn-error">✕ Rechazar</button>
            <input name="notes" type="text" class="input input-bordered flex-1" placeholder="Motivo del rechazo" />
          </form>
        </div>
      </div>
    </div>
  {/if}
    </div>

    <div class="space-y-6">
      <div class="card bg-base-200 border border-azeroth-border">
        <div class="card-body">
          <h2 class="card-title font-cinzel text-azeroth-gold flex items-center gap-2"><Swords size={18} /> Combate</h2>
          <ul class="space-y-2 mt-2">
            <li class="flex items-center gap-2"><Heart size={16} /> PV: <span class="font-bold">{combat.pv}</span></li>
            <li class="flex items-center gap-2"><Zap size={16} /> PM: <span class="font-bold">{combat.pm}</span></li>
            <li class="flex items-center gap-2"><Shield size={16} /> Iniciativa: <span class="font-bold">{combat.iniciativa}</span></li>
            <li class="flex items-center gap-2"><Swords size={16} /> Ataque CC: <span class="font-bold">{combat.ataqueCC}</span></li>
            <li class="flex items-center gap-2"><Swords size={16} /> Ataque CC sutil: <span class="font-bold">{combat.ataqueCCSutil}</span></li>
            <li class="flex items-center gap-2"><Swords size={16} /> Ataque dist.: <span class="font-bold">{combat.ataqueDistancia}</span></li>
            <li class="flex items-center gap-2"><Shield size={16} /> Defensa: <span class="font-bold">{combat.defensa}</span></li>
          </ul>
        </div>
      </div>

      <div class="card bg-base-200 border border-azeroth-border">
        <div class="card-body">
          <h2 class="card-title font-cinzel text-azeroth-gold">Información</h2>
          <p class="text-sm text-gray-400">Creado: {formatDate(character.created_at)}</p>
          <p class="text-sm text-gray-400">Puntos restantes: <span class="text-azeroth-gold font-bold">{character.rp_points}</span></p>

          {#if character.stories && character.stories.length > 0}
            <div class="mt-3 pt-3 border-t border-azeroth-border">
              <p class="text-sm font-semibold mb-1">Historias:</p>
              {#each character.stories as story}
                <a href="/historias/{story.id}" class="link text-sm block">
                  {story.title} <span class="badge badge-xs {statusColor(story.status)}">{statusLabel(story.status)}</span>
                </a>
              {/each}
            </div>
          {:else if character.status === 'aprobado' && data.profile?.id === character.player_id}
            <div class="mt-3 pt-3 border-t border-azeroth-border">
              <a href="/historias/nueva" class="btn btn-primary btn-sm w-full">
                + Crear historia
              </a>
              <p class="text-xs text-gray-400 mt-1">Escribe la historia de {character.name}</p>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
</section>