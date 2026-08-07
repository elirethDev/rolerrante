<script lang="ts">
  import { formatRelativeTime } from '$lib/utils';
  import { CircleCheck } from '@lucide/svelte';
  import { TYPE_LABELS, type WorklistItem, type WorklistItemType } from './types';

  // Per-type approve CTA (design gm.html): the label matches what the RPC does.
  const APPROVE_LABELS: Record<WorklistItemType, string> = {
    ficha: 'Aprobar ficha',
    cronica: 'Aprobar crónica',
    evento: 'Publicar evento',
    solicitud: 'Aprobar habilidad',
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
  const typeLabel = $derived(TYPE_LABELS[item.type]);
  // Author avatar initial (design gm.html: avatar avatar-lg avatar-ring).
  const initial = $derived((item.author || '?').trim().charAt(0).toUpperCase() || '?');

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
  class="wl-card {done ? 'done' : ''}"
>
  <div class="top">
    <span class="avatar avatar-lg avatar-ring" aria-hidden="true">{initial}</span>
    <div class="meta-box">
      <a data-testid="wl-detail" href={item.detailHref} class="wl-title">{item.name}</a>
      <div class="wl-meta">
        <span data-testid="wl-type" class="tag {item.type === 'ficha' ? 'blue' : ''}">
          {typeLabel}
        </span>
        <span>presentada por&nbsp;<b class="wl-author">{item.author}</b></span>
        <span class="sep">·</span>
        <span data-testid="wl-age">{age}</span>
      </div>
    </div>
    {#if item.stale}
      <span data-testid="wl-stale" class="stale-mark">Sin respuesta &gt; 48 h</span>
    {/if}
  </div>

  {#if done}
    <div class="wl-actions">
      <span data-testid="wl-done" class="badge badge-success no-dot">
        <CircleCheck size={14} aria-hidden="true" />
        Aprobado
      </span>
    </div>
  {:else}
    <div class="wl-actions">
      <button
        type="button"
        class="btn btn-primary btn-sm"
        data-testid="wl-approve"
        disabled={busy}
        onclick={() => emit(onApprove)}
      >
        {APPROVE_LABELS[item.type] ?? 'Aprobar'}
      </button>
      {#if item.type !== 'evento'}
        <button
          type="button"
          class="btn btn-danger btn-sm"
          data-testid="wl-reject"
          disabled={busy}
          onclick={() => emit(onReject)}
        >
          Rechazar
        </button>
      {/if}
      <button
        type="button"
        class="btn btn-secondary btn-sm"
        data-testid="wl-review"
        onclick={() => onReview?.(item)}
      >
        Revisar
      </button>
      {#if item.type !== 'evento'}
        <button
          type="button"
          class="btn btn-ghost btn-sm"
          data-testid="wl-comment"
          aria-expanded={commentOpen}
          disabled={busy}
          onclick={() => (commentOpen = !commentOpen)}
        >
          {commentOpen ? 'Cerrar comentario' : 'Comentar'}
        </button>
      {/if}
      <a data-testid="wl-preview" href={item.detailHref} class="btn btn-ghost btn-sm">
        Vista previa
      </a>
    </div>
  {/if}

  {#if commentOpen}
    <div class="inline-edit open" data-testid="wl-inline-edit">
      <div class="field" style="margin:0">
        <label for="wl-notes-{item.id}">Comentario para {item.author || 'la mesa'}</label>
        <textarea
          id="wl-notes-{item.id}"
          data-testid="wl-notes"
          bind:value={note}
          rows={3}
          class="textarea"
          style="min-height:80px"
          placeholder="P. ej. Falta añadir el vínculo a la crónica de origen… (se adjunta al aprobar o rechazar)"
        ></textarea>
      </div>
    </div>
  {/if}
</article>
