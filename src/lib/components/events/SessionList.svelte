<script lang="ts">
  import { Calendar } from 'lucide-svelte';
  import { formatDate } from '$lib/utils';

  interface SessionShape {
    id: string;
    title: string | null;
    summary: string | null;
    session_date: string;
    counts_as_masteo: boolean;
  }

  interface Props {
    sessions: SessionShape[];
  }

  let { sessions }: Props = $props();
</script>

<div class="card bg-base-200 border border-azeroth-border">
  <div class="card-body">
    <h2 class="card-title font-cinzel text-azeroth-gold">
      <Calendar size={18} />
      Sesiones ({sessions.length})
    </h2>
    <div class="overflow-x-auto">
      <table class="table w-full">
        <thead>
          <tr class="text-gray-400 text-sm">
            <th>Fecha</th>
            <th>Título</th>
            <th>Resumen</th>
            <th>Masteo</th>
          </tr>
        </thead>
        <tbody>
          {#each sessions as s (s.id)}
            <tr class="border-t border-azeroth-border">
              <td class="whitespace-nowrap">{formatDate(s.session_date)}</td>
              <td>{s.title ?? '-'}</td>
              <td class="text-sm text-gray-400 max-w-xs truncate">{s.summary ?? '-'}</td>
              <td>
                {#if s.counts_as_masteo}
                  <span class="badge badge-success">Sí</span>
                {:else}
                  <span class="badge badge-neutral">No</span>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>