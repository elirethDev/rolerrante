<script lang="ts">
  import { Users } from '@lucide/svelte';
  import { statusColor, statusLabel } from '$lib/utils';

  interface ParticipantShape {
    character?: { id?: string; name?: string } | null;
    status?: string;
  }

  interface Props {
    participants?: ParticipantShape[];
    maxPlayers?: number | null;
  }

  let { participants = [], maxPlayers = null }: Props = $props();
</script>

<div class="card bg-base-200 border border-azeroth-border">
  <div class="card-body">
    <h2 class="card-title font-cinzel text-azeroth-gold">
      <Users size={18} />
      Participantes ({participants.length}{#if maxPlayers}/{maxPlayers}{/if})
    </h2>
    {#if participants.length === 0}
      <p class="text-gray-400">Nadie se ha inscrito todavía.</p>
    {:else}
      <ul class="divide-y divide-azeroth-border">
        {#each participants as p (p.character?.id ?? '')}
          <li class="py-2 flex justify-between items-center">
            <span>{p.character?.name ?? 'Personaje eliminado'}</span>
            {#if p.status}
              <span class="badge {statusColor(p.status)}">{statusLabel(p.status)}</span>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>