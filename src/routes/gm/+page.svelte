<script lang="ts">
  import type { PageData } from './$types';
  import { formatDate } from '$lib/utils';
  import { BookOpen, Scroll, Shield, Users } from '@lucide/svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';

  export let data: PageData;

  // Player embed helper — supabase type inference loses nested join types on multi-FK tables
  const playerName = (p: unknown): string =>
    (p as { display_name?: string | null; username?: string })?.display_name ??
    (p as { display_name?: string | null; username?: string })?.username ??
    '';
</script>

<svelte:head>
  <title>Panel GM — RolErrante</title>
</svelte:head>

<h1 class="text-3xl font-cinzel text-azeroth-gold flex items-center gap-3 mb-6"><Shield /> Panel GM</h1>

<div class="grid md:grid-cols-3 gap-6">
  <div class="card bg-base-200 border border-azeroth-border">
    <div class="card-body">
      <h2 class="card-title font-cinzel text-azeroth-gold">Fichas pendientes ({data.characters.length})</h2>
      {#if data.characters.length === 0}
        <EmptyState icon={Users} title="Sin fichas pendientes" />
      {:else}
        <div class="space-y-2 max-h-80 overflow-y-auto">
          {#each data.characters as c (c.id)}
            <a href="/personajes/{c.id}" class="block p-2 bg-base-100 rounded border border-azeroth-border hover:border-azeroth-gold">
              <p class="font-semibold">{c.name}</p>
              <p class="text-xs text-gray-400">{c.race?.name} · {playerName(c.player)} · {formatDate(c.created_at)}</p>
            </a>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <div class="card bg-base-200 border border-azeroth-border">
    <div class="card-body">
      <h2 class="card-title font-cinzel text-azeroth-gold">Historias pendientes ({data.stories.length})</h2>
      {#if data.stories.length === 0}
        <EmptyState icon={BookOpen} title="Sin historias pendientes" />
      {:else}
        <div class="space-y-2 max-h-80 overflow-y-auto">
          {#each data.stories as s (s.id)}
            <a href="/historias/{s.id}" class="block p-2 bg-base-100 rounded border border-azeroth-border hover:border-azeroth-gold">
              <p class="font-semibold">{s.title}</p>
              <p class="text-xs text-gray-400">{s.character?.name} · {playerName(s.character?.player)} · {formatDate(s.created_at)}</p>
            </a>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <div class="card bg-base-200 border border-azeroth-border">
    <div class="card-body">
      <h2 class="card-title font-cinzel text-azeroth-gold">Solicitudes de habilidad ({data.skillRequests.length})</h2>
      {#if data.skillRequests.length === 0}
        <EmptyState icon={Scroll} title="Sin solicitudes pendientes" />
      {:else}
        <div class="space-y-2 max-h-80 overflow-y-auto">
          {#each data.skillRequests as req (req.id)}
            <a href="/gm/solicitudes/{req.id}" class="block p-2 bg-base-100 rounded border border-azeroth-border hover:border-azeroth-gold">
              <p class="font-semibold">{req.character?.name} · {req.total_xp_cost} XP</p>
              <p class="text-xs text-gray-400">{playerName(req.character?.player)} · {formatDate(req.created_at)}</p>
            </a>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>
