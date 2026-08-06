<script lang="ts">
  import { formatRelativeTime } from '$lib/utils';
  import { Award, BookOpen, CalendarDays, CircleCheck, User } from '@lucide/svelte';
  import type { Component } from 'svelte';
  import { TYPE_LABELS, type WorklistItem, type WorklistItemType } from './types';

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
    busy = false,
    done = false,
  }: {
    item: WorklistItem;
    onReject?: (item: WorklistItem, notes?: string) => void;
    onReview?: (item: WorklistItem) => void;
    onApprove?: (item: WorklistItem, notes?: string) => void;
    busy?: boolean;
    done?: boolean;
  } = $props();

  const age = $derived(formatRelativeTime(item.createdAt));
  const Icon = $derived(ICONS[item.type]);
  const typeLabel = $derived(TYPE_LABELS[item.type]);

  // Inline review (design gm.html): the GM writes a comment and then approves
  // or rejects in the same view. The note is only forwarded to the callbacks
  // when non-empty so the plain one-click path (no comment) is preserved.
  let commentOpen = $state(false);
  let note = $state('');

  function emit(fn: ((item: WorklistItem, notes?: string) => void) | undefined) {
    const trimmed = note.trim();
    if (trimmed) fn?.(item, trimmed);
    else fn?.(item);
  }
</script>

<article
  data-testid="wl-card"
  data-done={done || undefined}
  class="card bg-base-200 border border-azeroth-border mb-2 {done ? 'opacity-80' : ''}"
>
  <div class="card-body py-3">
    <div class="flex flex-row items-center gap-3">
      <span data-testid="wl-icon" class="text-azeroth-gold shrink-0">
        <Icon size={18} strokeWidth={1.5} />
      </span>
      <div class="min-w-0 flex-1">
        <a data-testid="wl-detail" href={item.detailHref} class="font-semibold hover:underline">
          {item.name}
        </a>
        <div class="text-xs text-azeroth-muted flex flex-wrap items-center gap-1.5">
          <span data-testid="wl-type" class="badge badge-sm badge-outline badge-ghost">{typeLabel}</span>
          {item.author}
          <span data-testid="wl-age" class="ml-1">· {age}</span>
        </div>
      </div>
      {#if item.stale}
        <span data-testid="wl-stale" class="badge badge-warning badge-outline">Antigua</span>
      {/if}
      <div class="flex flex-row gap-1 shrink-0">
        {#if done}
          <span data-testid="wl-done" class="badge badge-success gap-1">
            <CircleCheck size={14} aria-hidden="true" />
            Aprobado
          </span>
        {:else}
          {#if item.type !== 'evento'}
            <button
              type="button"
              class="btn btn-xs btn-error"
              data-testid="wl-reject"
              disabled={busy}
              onclick={() => emit(onReject)}
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
          <a data-testid="wl-preview" href={item.detailHref} class="btn btn-xs btn-ghost">
            Vista previa
          </a>
          {#if item.type !== 'evento'}
            <button
              type="button"
              class="btn btn-xs btn-ghost"
              data-testid="wl-comment"
              aria-expanded={commentOpen}
              disabled={busy}
              onclick={() => (commentOpen = !commentOpen)}
            >
              {commentOpen ? 'Cerrar comentario' : 'Comentar'}
            </button>
          {/if}
          <button
            type="button"
            class="btn btn-xs btn-success"
            data-testid="wl-approve"
            disabled={busy}
            onclick={() => emit(onApprove)}
          >
            Aprobar
          </button>
        {/if}
      </div>
    </div>

    {#if commentOpen}
      <div class="mt-3 border-t border-azeroth-border pt-3" data-testid="wl-inline-edit">
        <label for="wl-notes-{item.id}" class="text-xs text-azeroth-muted block mb-1">
          Comentario para {item.author || 'la mesa'}
        </label>
        <textarea
          id="wl-notes-{item.id}"
          data-testid="wl-notes"
          bind:value={note}
          rows={3}
          class="textarea textarea-bordered w-full text-sm"
          placeholder="P. ej. Falta añadir el vínculo a la crónica de origen… (se adjunta al aprobar o rechazar)"
        ></textarea>
      </div>
    {/if}
  </div>
</article>
