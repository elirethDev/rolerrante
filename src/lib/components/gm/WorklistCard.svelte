<script lang="ts">
  import { formatRelativeTime } from '$lib/utils';
  import { Award, BookOpen, CalendarDays, User } from '@lucide/svelte';
  import type { Component } from 'svelte';
  import type { WorklistItem, WorklistItemType } from './types';

  const ICONS: Record<WorklistItemType, Component> = {
    ficha: User,
    evento: CalendarDays,
    cronica: BookOpen,
    solicitud: Award,
  };

  let {
    item,
    onReject,
    onReview,
    onApprove,
  }: {
    item: WorklistItem;
    onReject?: (item: WorklistItem) => void;
    onReview?: (item: WorklistItem) => void;
    onApprove?: (item: WorklistItem) => void;
  } = $props();

  const age = $derived(formatRelativeTime(item.createdAt));
  const Icon = $derived(ICONS[item.type]);
</script>

<article data-testid="wl-card" class="card bg-base-200 border border-azeroth-border mb-2">
  <div class="card-body flex flex-row items-center gap-3 py-3">
    <span data-testid="wl-icon" class="text-azeroth-gold shrink-0">
      <Icon size={18} strokeWidth={1.5} />
    </span>
    <div class="min-w-0 flex-1">
      <a data-testid="wl-detail" href={item.detailHref} class="font-semibold hover:underline">
        {item.name}
      </a>
      <div class="text-xs text-gray-400">
        {item.author}
        <span data-testid="wl-age" class="ml-1">· {age}</span>
      </div>
    </div>
    {#if item.stale}
      <span data-testid="wl-stale" class="badge badge-warning badge-outline">Antigua</span>
    {/if}
    <div class="flex flex-row gap-1 shrink-0">
      {#if item.type !== 'evento'}
        <button
          type="button"
          class="btn btn-xs btn-error"
          data-testid="wl-reject"
          onclick={() => onReject?.(item)}
        >
          Rechazar
        </button>
      {/if}
      <button
        type="button"
        class="btn btn-xs btn-ghost"
        data-testid="wl-review"
        onclick={() => onReview?.(item)}
      >
        Revisar
      </button>
      <button
        type="button"
        class="btn btn-xs btn-success"
        data-testid="wl-approve"
        onclick={() => onApprove?.(item)}
      >
        Aprobar
      </button>
    </div>
  </div>
</article>
