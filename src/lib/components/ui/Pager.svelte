<script lang="ts">
  import { ChevronLeft, ChevronRight } from '@lucide/svelte';

  interface Props {
    total: number;
    current: number;
    onChange?: (page: number) => void;
    class?: string;
  }

  let { total, current, onChange, class: className = '' }: Props = $props();

  function buildPages(total: number, current: number): (number | 'ellipsis')[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | 'ellipsis')[] = [1];
    const start = Math.max(2, current - 2);
    const end = Math.min(total - 1, current + 2);
    if (start > 2) pages.push('ellipsis');
    for (let p = start; p <= end; p++) pages.push(p);
    if (end < total - 1) pages.push('ellipsis');
    pages.push(total);
    return pages;
  }

  const pages = $derived(buildPages(total, current));
</script>

{#if total > 0}
  <nav class="mt-6 flex flex-wrap items-center justify-center gap-2 {className}" aria-label="Paginación">
    <button
      type="button"
      class="azeroth-focus inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-azeroth-border-strong bg-azeroth-surface px-3 text-azeroth-text-soft transition hover:border-azeroth-gold-dim hover:text-azeroth-gold-bright disabled:pointer-events-none disabled:opacity-40"
      onclick={() => onChange?.(current - 1)}
      disabled={current <= 1}
      aria-label="Anterior"
      aria-disabled={current <= 1}
    >
      <ChevronLeft size={18} aria-hidden="true" />
    </button>

    {#each pages as page, i (page === 'ellipsis' ? `e${i}` : page)}
      {#if page === 'ellipsis'}
        <span class="min-w-5 px-1 text-center text-azeroth-faint" aria-hidden="true">…</span>
      {:else}
        <button
          type="button"
          class:active={page === current}
          aria-current={page === current ? 'page' : undefined}
          class="azeroth-focus inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-azeroth-border-strong bg-azeroth-surface px-3 text-sm font-semibold text-azeroth-text-soft transition hover:border-azeroth-gold-dim hover:text-azeroth-gold-bright active:border-azeroth-gold active:bg-linear-to-b active:from-azeroth-gold-bright active:to-azeroth-gold active:text-[#1A1508]"
          onclick={() => onChange?.(page as number)}
        >
          {page}
        </button>
      {/if}
    {/each}

    <button
      type="button"
      class="azeroth-focus inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-azeroth-border-strong bg-azeroth-surface px-3 text-azeroth-text-soft transition hover:border-azeroth-gold-dim hover:text-azeroth-gold-bright disabled:pointer-events-none disabled:opacity-40"
      onclick={() => onChange?.(current + 1)}
      disabled={current >= total}
      aria-label="Siguiente"
      aria-disabled={current >= total}
    >
      <ChevronRight size={18} aria-hidden="true" />
    </button>
  </nav>
{/if}
