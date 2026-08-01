<script lang="ts">
  import type { PageData } from './$types';
  import { statusLabel, statusColor, formatDate } from '$lib/utils';
  import { BookOpen, Scroll } from 'lucide-svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';

  export let data: PageData;

  // Player embed helper — supabase type inference loses nested join types on multi-FK tables
  const playerName = (p: unknown): string =>
    (p as { display_name?: string | null; username?: string })?.display_name ??
    (p as { display_name?: string | null; username?: string })?.username ??
    'Anónimo';
</script>

<svelte:head>
  <title>Historias — RolErrante</title>
</svelte:head>

<div class="flex items-center justify-between mb-6">
  <h1 class="text-3xl font-cinzel text-azeroth-gold flex items-center gap-3"><Scroll /> Historias</h1>
  {#if data.profile}
    <a href="/historias/nueva" class="btn btn-primary btn-sm font-cinzel">Nueva historia</a>
  {/if}
</div>

{#if data.stories.length === 0}
  <EmptyState icon={BookOpen} title="Sin historias" description="No hay historias aprobadas todavía." />
{:else}
  <div class="grid md:grid-cols-2 gap-6">
    {#each data.stories as story (story.id)}
      <a href="/historias/{story.id}" class="card bg-base-200 border border-azeroth-border hover:border-azeroth-gold transition-colors">
        <div class="card-body">
          <div class="flex justify-between items-start">
            <h2 class="card-title font-cinzel text-lg">{story.title}</h2>
            <span class="badge {statusColor(story.status)}">{statusLabel(story.status)}</span>
          </div>
          <p class="text-sm text-gray-400">
            Por <span class="text-azeroth-gold">{playerName(story.character?.player)}</span>
            · {formatDate(story.created_at)}
          </p>
          {#if story.character}
            <p class="text-sm">Personaje: <span class="font-semibold">{story.character.name}</span></p>
          {/if}
        </div>
      </a>
    {/each}
  </div>
{/if}
