<script lang="ts">
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';
  import { CalendarCheck, Check } from '@lucide/svelte';
  import { formatDate } from '$lib/utils';

  let { data, form }: { data: PageData; form: { success?: boolean; message?: string } | null } = $props();
</script>

<svelte:head><title>Finalización de Eventos — GM</title></svelte:head>

<h1 class="text-3xl font-cinzel text-azeroth-gold flex items-center gap-3 mb-6"><CalendarCheck /> Eventos por finalizar ({data.events.length})</h1>

{#if form?.success}<div class="alert alert-success mb-4">Evento finalizado.</div>{/if}
{#if form?.message}<div class="alert alert-error mb-4">{form.message}</div>{/if}

{#if data.events.length === 0}
  <p class="text-gray-400">No hay eventos pendientes de finalización.</p>
{:else}
  <div class="space-y-4">
    {#each data.events as e (e.id)}
      <div class="card bg-base-200 border border-azeroth-border">
        <div class="card-body">
          <h3 class="font-cinzel text-lg text-azeroth-gold">{e.title}</h3>
          <p class="text-sm text-gray-400">por {e.creator?.display_name ?? e.creator?.username ?? ''} · {formatDate(e.created_at)}</p>
          <div class="card-actions justify-end mt-4 gap-2">
            <form method="POST" action="?/finalize" use:enhance>
              <input type="hidden" name="eventId" value={e.id} />
              <label class="flex items-center gap-2 text-sm">
                XP por participante:
                <input type="number" name="xp" value={10} min={1} max={100} class="input input-sm w-20" />
              </label>
              <button class="btn btn-sm btn-success"><Check size={16} /> Finalizar</button>
            </form>
          </div>
        </div>
      </div>
    {/each}
  </div>
{/if}