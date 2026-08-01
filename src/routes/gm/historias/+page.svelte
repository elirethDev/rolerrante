<script lang="ts">
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';
  import { BookOpen, Check, X } from '@lucide/svelte';

  let { data, form }: { data: PageData; form: { success?: boolean; message?: string } | null } = $props();
</script>

<svelte:head><title>Cola de Historias — GM</title></svelte:head>

<h1 class="text-3xl font-cinzel text-azeroth-gold flex items-center gap-3 mb-6"><BookOpen /> Historias pendientes ({data.stories.length})</h1>

{#if form?.success}<div class="alert alert-success mb-4">Acción realizada.</div>{/if}
{#if form?.message}<div class="alert alert-error mb-4">{form.message}</div>{/if}

{#if data.stories.length === 0}
  <p class="text-gray-400">No hay historias pendientes.</p>
{:else}
  <div class="space-y-4">
    {#each data.stories as s (s.id)}
      {@const char = Array.isArray(s.character) ? s.character[0] : s.character}
      <div class="card bg-base-200 border border-azeroth-border">
        <div class="card-body">
          <h3 class="font-cinzel text-lg text-azeroth-gold">{char?.name ?? 'Sin personaje'}</h3>
          <p class="text-sm text-gray-400">por {char?.player?.display_name ?? char?.player?.username ?? ''}</p>
          <p class="mt-2 line-clamp-3">{s.content ?? ''}</p>
          <div class="card-actions justify-end mt-4 gap-2">
            <form method="POST" action="?/reject" use:enhance>
              <input type="hidden" name="storyId" value={s.id} />
              <input type="text" name="notes" placeholder="Motivo del rechazo" class="input input-sm w-40" />
              <button class="btn btn-sm btn-error"><X size={16} /> Rechazar</button>
            </form>
            <form method="POST" action="?/approve" use:enhance>
              <input type="hidden" name="storyId" value={s.id} />
              <button class="btn btn-sm btn-success"><Check size={16} /> Aprobar</button>
            </form>
          </div>
        </div>
      </div>
    {/each}
  </div>
{/if}