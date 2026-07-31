<script lang="ts">
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';
  import { User, Check, X } from 'lucide-svelte';

  let { data, form }: { data: PageData; form: { success?: boolean; message?: string } | null } = $props();

  const playerName = (p: unknown): string =>
    (p as { display_name?: string | null; username?: string })?.display_name ??
    (p as { display_name?: string | null; username?: string })?.username ??
    '';
</script>

<svelte:head><title>Cola de Fichas — GM</title></svelte:head>

<h1 class="text-3xl font-cinzel text-azeroth-gold flex items-center gap-3 mb-6"><User /> Fichas pendientes ({data.characters.length})</h1>

{#if form?.success}<div class="alert alert-success mb-4">Acción realizada.</div>{/if}
{#if form?.message}<div class="alert alert-error mb-4">{form.message}</div>{/if}

{#if data.characters.length === 0}
  <p class="text-gray-400">No hay fichas pendientes.</p>
{:else}
  <div class="space-y-4">
    {#each data.characters as c}
      <div class="card bg-base-200 border border-azeroth-border">
        <div class="card-body">
          <h3 class="font-cinzel text-lg text-azeroth-gold">{c.name}</h3>
          <p class="text-sm text-gray-400">Raza: {Array.isArray(c.race) ? c.race[0]?.name : c.race?.name ?? ''} · Jugador: {playerName(c.player)}</p>
          <div class="card-actions justify-end mt-4 gap-2">
            <form method="POST" action="?/reject" use:enhance>
              <input type="hidden" name="charId" value={c.id} />
              <input type="text" name="notes" placeholder="Motivo del rechazo" class="input input-bordered input-sm w-40" />
              <button class="btn btn-sm btn-error"><X size={16} /> Rechazar</button>
            </form>
            <form method="POST" action="?/approve" use:enhance>
              <input type="hidden" name="charId" value={c.id} />
              <button class="btn btn-sm btn-success"><Check size={16} /> Aprobar</button>
            </form>
          </div>
        </div>
      </div>
    {/each}
  </div>
{/if}