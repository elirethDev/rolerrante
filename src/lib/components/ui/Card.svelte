<script lang="ts">
  import type { Snippet } from 'svelte';

  let { title, children }: { title?: string; children: Snippet } = $props();
</script>

<div class="card bg-base-200 border border-azeroth-border">
  <div class="card-body">
    {#if title}
      <h2 class="card-title font-cinzel text-azeroth-gold">{title}</h2>
    {/if}
    {@render children()}
  </div>
</div>