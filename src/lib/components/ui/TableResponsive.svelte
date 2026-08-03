<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    columns: string[];
    class?: string;
    children: Snippet;
  }

  let { columns, class: className = '', children }: Props = $props();
</script>

<div class="overflow-hidden rounded-2xl border border-azeroth-border bg-azeroth-surface shadow-[var(--shadow-1)]">
  <table class="azeroth-table w-full border-collapse text-sm {className}">
    <thead>
      <tr>
        {#each columns as column, i (column + i)}
          <th
            scope="col"
            class="border-b border-azeroth-border bg-azeroth-sunken px-4 py-3 text-left text-[0.7rem] font-bold uppercase tracking-[0.12em] text-azeroth-muted"
          >
            {column}
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {@render children()}
    </tbody>
  </table>
</div>
