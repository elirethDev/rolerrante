<script lang="ts">
  import { Calendar } from '@lucide/svelte';
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

<div class="panel">
  <div class="panel-head">
    <Calendar size={18} />
    <h2>
      Sesiones <span class="text-azeroth-faint font-medium">({sessions.length})</span>
    </h2>
    <span class="meta">masterizado</span>
  </div>
  <div class="panel-body">
    <div class="overflow-x-auto">
      <table class="table w-full">
        <thead>
          <tr class="text-azeroth-muted text-sm">
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
              <td class="text-sm text-azeroth-muted max-w-xs truncate">{s.summary ?? '-'}</td>
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
