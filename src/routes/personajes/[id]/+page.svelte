<script lang="ts">
  import type { PageData } from './$types';
  import { statusLabel, statusColor, formatDate } from '$lib/utils';
  import type { Character } from '$lib/types';
  import CombatValues from '$lib/components/sheets/CombatValues.svelte';
  import CharacterSheetSummary from '$lib/components/sheets/CharacterSheetSummary.svelte';

  export let data: PageData;

  // character comes from Supabase join query with embedded skills, stories, race
  // Use auto-inferred DB type but cast to Character at component call sites
  $: character = data.character;
  $: skills = (character.skills ?? []).filter((s: { level: number }) => s.level > 0);
  $: canModerate = data.profile?.role === 'gm' || data.profile?.role === 'admin';
</script>

<svelte:head>
  <title>{character.name} — RolErrante</title>
</svelte:head>

<section class="max-w-4xl mx-auto">
  <CharacterSheetSummary character={character as unknown as Character} />

  <div class="grid md:grid-cols-3 gap-6 mt-6">
    <div class="md:col-span-2 space-y-6">
      <div class="card bg-base-200 border border-azeroth-border">
        <div class="card-body">
          <h2 class="card-title font-cinzel text-azeroth-gold">Habilidades</h2>
          {#if skills.length === 0}
            <p class="text-gray-400">Sin habilidades destacadas.</p>
          {:else}
            <div class="grid md:grid-cols-2 gap-3">
              {#each skills as s (s.id ?? s.skill?.name ?? '')}
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
            <input name="notes" type="text" class="input flex-1" placeholder="Motivo del rechazo" />
          </form>
        </div>
      </div>
    </div>
  {/if}
    </div>

    <div class="space-y-6">
      <CombatValues
        attrs={{
          attr_fis: character.attr_fis,
          attr_des: character.attr_des,
          attr_int: character.attr_int,
          attr_per: character.attr_per,
          attr_esp: character.attr_esp,
          mana_source: character.mana_source as 'I' | 'E',
        }}
        skills={skills}
      />

      <div class="card bg-base-200 border border-azeroth-border">
        <div class="card-body">
          <h2 class="card-title font-cinzel text-azeroth-gold">Información</h2>
          <p class="text-sm text-gray-400">Creado: {formatDate(character.created_at)}</p>
          <p class="text-sm text-gray-400">Puntos restantes: <span class="text-azeroth-gold font-bold">{character.rp_points}</span></p>

          {#if character.stories && character.stories.length > 0}
            <div class="mt-3 pt-3 border-t border-azeroth-border">
              <p class="text-sm font-semibold mb-1">Historias:</p>
              {#each character.stories as story (story.id)}
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