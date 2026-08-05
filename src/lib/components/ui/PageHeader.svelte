<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    kicker?: string;
    title: string;
    subtitle?: string;
    actions?: Snippet;
    class?: string;
  }

  let { kicker, title, subtitle, actions, class: className = '' }: Props = $props();
</script>

<header class="page-head {className}" data-testid="page-head">
  <div class="flex flex-wrap items-end justify-between gap-4">
    <div class="min-w-0">
      {#if kicker}
        <span class="kicker">{kicker}</span>
      {/if}
      <h1 class="page-title" style="margin-bottom:6px">{title}</h1>
      {#if subtitle}
        <p class="page-sub">{subtitle}</p>
      {/if}
    </div>
    {#if actions}
      <div class="flex flex-wrap items-center gap-2">
        {@render actions()}
      </div>
    {/if}
  </div>
</header>

<style>
  .page-head {
    padding-bottom: 0;
    border-bottom: 0;
  }
</style>
