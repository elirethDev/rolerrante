<script lang="ts">
  import { formatDateTime, statusColor, statusLabel } from '$lib/utils';

  interface EventShape {
    id: string;
    title: string;
    type?: string;
    status?: string;
    starts_at?: string | null;
    location?: string | null;
    creator?: { display_name?: string | null; username?: string | null } | null;
  }

  interface Props {
    event: EventShape;
  }

  let { event }: Props = $props();
</script>

<a
  href="/eventos/{event.id}"
  class="card bg-base-200 border border-azeroth-border hover:border-azeroth-gold transition-colors"
>
  <div class="card-body">
    <div class="flex justify-between items-start">
      <h2 class="card-title font-cinzel text-lg">{event.title}</h2>
      {#if event.status}
        <span class="badge {statusColor(event.status)}">{statusLabel(event.status)}</span>
      {/if}
    </div>
    <p class="text-sm text-gray-400">
      {formatDateTime(event.starts_at)}{#if event.type} · {event.type}{/if}{#if event.location} · {event.location}{/if}
    </p>
    {#if event.creator}
      <p class="text-sm text-gray-400">Organiza: {event.creator.display_name ?? event.creator.username}</p>
    {/if}
  </div>
</a>