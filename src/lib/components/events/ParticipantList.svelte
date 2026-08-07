<script lang="ts">
  import { Users } from '@lucide/svelte';
  import { statusColor, statusLabel } from '$lib/utils';
  import Avatar from '$lib/components/ui/Avatar.svelte';

  interface ParticipantShape {
    character?: { id?: string; name?: string } | null;
    status?: string;
  }

  interface Props {
    participants?: ParticipantShape[];
    maxPlayers?: number | null;
  }

  let { participants = [], maxPlayers = null }: Props = $props();

  const confirmed = $derived(
    participants.filter((p: ParticipantShape) => p.status === 'confirmado').length,
  );
  const inscritos = $derived(participants.length - confirmed);
</script>

<div class="panel">
  <div class="panel-head">
    <Users size={18} />
    <h2>
      Participantes <span class="text-azeroth-faint font-medium">({participants.length}{#if maxPlayers}/{maxPlayers}{/if})</span>
    </h2>
    <span class="meta">{inscritos} inscritos · {confirmed} confirmados</span>
  </div>
  <div class="panel-body">
    {#if participants.length === 0}
      <p class="text-azeroth-muted py-3">Nadie se ha inscrito todavía.</p>
    {:else}
      {#each participants as p (p.character?.id ?? '')}
        <div class="p-row">
          <span class="who">
            <Avatar name={p.character?.name ?? '?'} size="sm" alt={p.character?.name ?? 'Personaje eliminado'} />
            <span class="truncate">{p.character?.name ?? 'Personaje eliminado'}</span>
          </span>
          {#if p.status}
            <span class="badge {statusColor(p.status)}">{statusLabel(p.status)}</span>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
</div>
