<script lang="ts">
  import { resolve } from '$app/paths';
  import type { PageData } from './$types';
  import { statusLabel, statusColor, formatDate } from '$lib/utils';
  import type { Character } from '$lib/types';
  import { FileText, MessagesSquare } from '@lucide/svelte';
  import CombatValues from '$lib/components/sheets/CombatValues.svelte';
  import CharacterSheetSummary from '$lib/components/sheets/CharacterSheetSummary.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';

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
  <PageHeader kicker="Censo del reino" title="Ficha de personaje">
    {#snippet actions()}
      {#if character.status === 'pendiente'}
        <span class="badge badge-lg badge-warning" data-testid="character-revision-state">
          En revisión
        </span>
      {/if}
      {#if canEdit}
        <a href={resolve(`/personajes/${character.id}/editar`)} class="btn btn-primary btn-sm font-cinzel">
          Editar ficha
        </a>
      {/if}
    {/snippet}
  </PageHeader>

  <div class="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
    <div class="min-w-0 space-y-6">
      <CharacterSheetSummary character={character as unknown as Character} />

      <section class="stack space-y-4" aria-label="Narrativa del personaje">
        <article class="panel" data-testid="narrative-pasado">
          <div class="panel-head"><h2>Pasado</h2></div>
          <div class="panel-body">
            <p class="text-azeroth-muted whitespace-pre-wrap">—</p>
          </div>
        </article>
        <article class="panel" data-testid="narrative-presente">
          <div class="panel-head"><h2>Presente</h2></div>
          <div class="panel-body">
            {#if narrativePresent}
              <p class="text-azeroth-muted whitespace-pre-wrap">{narrativePresent}</p>
            {:else}
              <p class="text-azeroth-faint italic">—</p>
            {/if}
          </div>
        </article>
        <article class="panel" data-testid="narrative-objetivos">
          <div class="panel-head"><h2>Objetivos</h2></div>
          <div class="panel-body">
            <p class="text-azeroth-muted whitespace-pre-wrap">—</p>
          </div>
        </article>
      </section>

      <div class="panel">
        <div class="panel-head"><h2>Habilidades</h2></div>
        <div class="panel-body">
          {#if skills.length === 0}
            <p class="text-azeroth-muted">Sin habilidades destacadas.</p>
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
        <span class="kicker">Referencias</span>
        <h2 id="vinc-title" class="page-title" style="font-size:1.15rem;margin:8px 0 12px">
          Vínculos y referencias
        </h2>
        <div class="panel">
          <div class="panel-body p-4">
            {#if primaryStory}
              <div class="vinc flex items-center gap-2 py-2 border-b border-azeroth-border">
                <FileText size={16} class="text-azeroth-gold shrink-0" />
                <span class="text-sm text-azeroth-muted">Crónica activa:</span>
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
              <p class="vinc text-sm text-azeroth-muted py-2">
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
                <span class="text-sm text-azeroth-muted">Historia de aprobación: aprobada el</span>
                <span class="text-sm">{formatDate(character.reviewed_at)}</span>
              </div>
            {/if}
          </div>
        </div>
      </section>

      <section aria-labelledby="story-thread-title">
        <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <span class="kicker">Historia</span>
            <h2 id="story-thread-title" class="page-title" style="font-size:1.15rem;margin:8px 0 0">
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
                class="panel hover:border-azeroth-gold transition-colors p-4 flex items-center justify-between gap-3"
              >
                <div class="min-w-0">
                  <p class="font-medium line-clamp-2">{story.title}</p>
                  <p class="text-xs text-azeroth-muted mt-1">Historia</p>
                </div>
                <span class="badge {statusColor(story.status)} shrink-0">
                  {statusLabel(story.status)}
                </span>
              </a>
            {/each}
          </div>
        {:else}
          <div class="panel">
            <div class="panel-body">
              <p class="text-azeroth-muted">
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
        <div class="panel">
          <div class="panel-head"><h2>Moderación GM</h2></div>
          <div class="panel-body">
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

      <div class="panel">
        <div class="panel-head"><h2>Información</h2></div>
        <div class="panel-body">
          <p class="text-sm text-azeroth-muted">Creado: {formatDate(character.created_at)}</p>
          <p class="text-sm text-azeroth-muted">
            Puntos restantes:
            <span class="text-azeroth-gold font-bold">{character.rp_points}</span>
          </p>
        </div>
      </div>
    </aside>
  </div>
</section>
