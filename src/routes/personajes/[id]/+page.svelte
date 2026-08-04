<script lang="ts">
  import { resolve } from '$app/paths';
  import type { PageData } from './$types';
  import { statusLabel, statusColor, formatDate } from '$lib/utils';
  import type { Character } from '$lib/types';
  import { FileText, MessagesSquare } from '@lucide/svelte';
  import CombatValues from '$lib/components/sheets/CombatValues.svelte';
  import CharacterSheetSummary from '$lib/components/sheets/CharacterSheetSummary.svelte';

  export let data: PageData;

  // character comes from Supabase join query with embedded skills, stories, race
  // Use auto-inferred DB type but cast to Character at component call sites
  $: character = data.character;
  $: skills = (character.skills ?? []).filter((s: { level: number }) => s.level > 0);
  $: stories = character.stories ?? [];
  $: canModerate = data.profile?.role === 'gm' || data.profile?.role === 'admin';
  $: isOwner = data.profile?.id === character.player_id;
  $: canEdit = canModerate || isOwner;
  $: canCreateStory = isOwner && character.status === 'aprobado';
  $: primaryStory = stories.find((s: { status: string }) => s.status === 'aprobado') ?? stories[0];
  $: secondaryStories = stories.filter((s: { id: string }) => s.id !== primaryStory?.id);
  $: narrativePresent = character.physical_description?.trim() ?? '';
</script>

<svelte:head>
  <title>{character.name} — RolErrante</title>
</svelte:head>

<section class="max-w-6xl mx-auto">
  <header
    class="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-azeroth-border"
  >
    <div>
      <p class="text-xs font-bold uppercase tracking-[0.18em] text-azeroth-gold">
        Censo del reino
      </p>
      <h1 class="text-2xl font-cinzel mt-1">Ficha de personaje</h1>
    </div>
    {#if canEdit}
      <a href={resolve(`/personajes/${character.id}/editar`)} class="btn btn-primary btn-sm font-cinzel">
        Editar ficha
      </a>
    {/if}
  </header>

  <div class="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
    <div class="min-w-0 space-y-6">
      <CharacterSheetSummary character={character as unknown as Character} />

      <section class="stack space-y-4" aria-label="Narrativa del personaje">
        <article class="card bg-base-200 border border-azeroth-border" data-testid="narrative-pasado">
          <div class="card-body">
            <h2 class="card-title font-cinzel text-azeroth-gold">Pasado</h2>
            <p class="text-gray-400 whitespace-pre-wrap">—</p>
          </div>
        </article>
        <article class="card bg-base-200 border border-azeroth-border" data-testid="narrative-presente">
          <div class="card-body">
            <h2 class="card-title font-cinzel text-azeroth-gold">Presente</h2>
            {#if narrativePresent}
              <p class="text-gray-400 whitespace-pre-wrap">{narrativePresent}</p>
            {:else}
              <p class="text-gray-500 italic">—</p>
            {/if}
          </div>
        </article>
        <article class="card bg-base-200 border border-azeroth-border" data-testid="narrative-objetivos">
          <div class="card-body">
            <h2 class="card-title font-cinzel text-azeroth-gold">Objetivos</h2>
            <p class="text-gray-400 whitespace-pre-wrap">—</p>
          </div>
        </article>
      </section>

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

      <section aria-labelledby="vinc-title">
        <h2 id="vinc-title" class="card-title font-cinzel text-azeroth-gold mb-3">
          Vínculos y referencias
        </h2>
        <div class="card bg-base-200 border border-azeroth-border">
          <div class="card-body p-4">
            {#if primaryStory}
              <div class="vinc flex items-center gap-2 py-2 border-b border-azeroth-border">
                <FileText size={16} class="text-azeroth-gold shrink-0" />
                <span class="text-sm text-gray-400">Crónica activa:</span>
                <a href={resolve(`/historias/${primaryStory.id}`)} class="link text-sm font-medium">
                  {primaryStory.title}
                </a>
              </div>
              {#each secondaryStories as story (story.id)}
                <div
                  class="vinc flex items-center gap-2 py-2 border-b border-azeroth-border last:border-b-0"
                >
                  <FileText size={16} class="text-azeroth-gold shrink-0" />
                  <a href={resolve(`/historias/${story.id}`)} class="link text-sm">
                    {story.title}
                  </a>
                  <span class="badge badge-xs {statusColor(story.status)} ml-auto">
                    {statusLabel(story.status)}
                  </span>
                </div>
              {/each}
            {:else}
              <p class="vinc text-sm text-gray-400 py-2">
                Sin vínculos registrados.
                {#if canCreateStory}
                  <a href={resolve('/historias/nueva')} class="link">Escribe una crónica</a>.
                {/if}
              </p>
            {/if}
            {#if character.reviewed_at}
              <div
                class="vinc flex items-center gap-2 py-2 border-b border-azeroth-border last:border-b-0"
              >
                <MessagesSquare size={16} class="text-azeroth-gold shrink-0" />
                <span class="text-sm text-gray-400">Historia de aprobación: aprobada el</span>
                <span class="text-sm">{formatDate(character.reviewed_at)}</span>
              </div>
            {/if}
          </div>
        </div>
      </section>

      <section aria-labelledby="story-thread-title">
        <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-azeroth-gold">Historia</p>
            <h2 id="story-thread-title" class="card-title font-cinzel mt-1">
              La historia como hilo del foro
            </h2>
          </div>
          {#if canCreateStory}
            <div class="flex gap-2">
              <a href={resolve('/foro/nuevo')} class="btn btn-secondary btn-sm">
                Nuevo acto en el foro
              </a>
              <a href={resolve('/foro')} class="btn btn-ghost btn-sm">Ir al foro</a>
            </div>
          {/if}
        </div>

        {#if stories.length > 0}
          <div class="stack space-y-3">
            {#each stories as story (story.id)}
              <a
                href={resolve(`/historias/${story.id}`)}
                class="card card-side bg-base-200 border border-azeroth-border hover:border-azeroth-gold transition-colors p-4 flex items-center justify-between gap-3"
              >
                <div class="min-w-0">
                  <p class="font-medium line-clamp-2">{story.title}</p>
                  <p class="text-xs text-gray-400 mt-1">Historia</p>
                </div>
                <span class="badge {statusColor(story.status)} shrink-0">
                  {statusLabel(story.status)}
                </span>
              </a>
            {/each}
          </div>
        {:else}
          <div class="card bg-base-200 border border-azeroth-border">
            <div class="card-body">
              <p class="text-gray-400">
                Esta ficha todavía no tiene historia publicada. La historia vive como un hilo del
                foro y queda enlazada a la ficha.
              </p>
              {#if canCreateStory}
                <div class="flex gap-2 mt-3">
                  <a href={resolve('/historias/nueva')} class="btn btn-primary btn-sm">
                    Escribir la historia de {character.name}
                  </a>
                  <a href={resolve('/foro')} class="btn btn-ghost btn-sm">Explorar el foro</a>
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </section>

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

    <aside class="space-y-6">
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
          <p class="text-sm text-gray-400">
            Puntos restantes:
            <span class="text-azeroth-gold font-bold">{character.rp_points}</span>
          </p>
        </div>
      </div>
    </aside>
  </div>
</section>
