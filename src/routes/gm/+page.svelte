<script lang="ts">
  import { goto } from '$app/navigation';
  import { enhance } from '$app/forms';
  import { Shield } from '@lucide/svelte';
  import type { PageData } from './$types';
  import { applyFilter } from '$lib/components/gm/filter';
  import type { FilterKey, WorklistItem } from '$lib/components/gm/types';
  import GmAnalytics from '$lib/components/gm/GmAnalytics.svelte';
  import FilterChips from '$lib/components/gm/FilterChips.svelte';
  import WorklistCard from '$lib/components/gm/WorklistCard.svelte';
  import AuditBanner from '$lib/components/admin/AuditBanner.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';

  let { data }: { data: PageData } = $props();
  const queue = $derived(data.queue);
  const kpi = $derived(data.kpi);
  const lastAction = $derived(data.lastAction);

  // Client-side filter state driven by FilterChips (spec gm-worklist R2).
  // FilterChips owns the list and echoes its (list, selected) back here; the
  // page keeps only the selected key and derives the filtered view of `queue`
  // so no duplicate reactive source is introduced.
  let selected: FilterKey = $state('todas');
  const filtered = $derived(applyFilter(queue, selected));

  function onFilter(_list: WorklistItem[], sel: FilterKey) {
    selected = sel;
  }

  // Reject needs a required reason (spec R4). A single form is reused for every
  // row; the hidden inputs are populated from the clicked item before submit, so
  // the server-side actions disambiguate by entityType/entityId.
  let form!: HTMLFormElement;

  // In-flight guard: the backing RPCs (approve_character, reject_story,
  // finalize_event, ...) are NOT idempotent, so a double click / Enter on the
  // hidden form would double-approve. Set before requestSubmit(), cleared by
  // the use:enhance callback after success, failure, or navigation.
  let submitting = $state(false);

  // Optimistic "done ✓" overlay (design gm.html / rolerrante.js): after an
  // approve succeeds, the entity id stays in this set so its card renders the
  // done badge while the page reload finishes (or if the row lingers).
  let approvedIds = $state<Set<string>>(new Set());
  // Success toast (design rolerrante.js:84-87): "Aprobado — firmado en auditoría".
  let notice = $state<string | null>(null);
  // Which action the hidden form is submitting; the enhance callback uses it to
  // decide whether a success result is an approve (marks done + toast).
  let pending: { action: 'approve' | 'reject'; entityId: string } | null = $state(null);

  function submitApprove(item: WorklistItem, notes = '') {
    if (submitting) return;
    if (item.type === 'evento') {
      // finalize_event requires XP per participant; the server defaults to 0
      // when the field is absent, so the GM must opt in explicitly. Cancel or
      // an invalid (non non-negative integer) input aborts the submit.
      const raw = window.prompt('XP por participante (número):', '100');
      if (raw === null) return;
      const xp = Number.parseInt(raw, 10);
      if (Number.isNaN(xp) || xp < 0) return;
      form.querySelector<HTMLInputElement>('input[name="xp"]')!.value = String(xp);
    }
    form.action = `?/${'approve'}`;
    form.querySelector<HTMLInputElement>('input[name="entityType"]')!.value = item.type;
    form.querySelector<HTMLInputElement>('input[name="entityId"]')!.value = item.entityId;
    form.querySelector<HTMLInputElement>('input[name="notes"]')!.value = notes;
    submitting = true;
    pending = { action: 'approve', entityId: item.entityId };
    form.requestSubmit();
  }

  function submitReject(item: WorklistItem, notes = '') {
    if (submitting) return;
    // A reason is required (spec R4): prefer the inline note, fall back to the
    // prompt when the GM approved/rejected without opening the comment editor.
    const reason = notes.trim() || window.prompt('Motivo del rechazo (obligatorio):', item.name);
    if (!reason) return;
    form.action = `?/${'reject'}`;
    form.querySelector<HTMLInputElement>('input[name="entityType"]')!.value = item.type;
    form.querySelector<HTMLInputElement>('input[name="entityId"]')!.value = item.entityId;
    form.querySelector<HTMLInputElement>('input[name="notes"]')!.value = reason;
    submitting = true;
    pending = { action: 'reject', entityId: item.entityId };
    form.requestSubmit();
  }

  function review(item: WorklistItem) {
    goto(item.detailHref);
  }

  function dismissNotice() {
    notice = null;
  }
</script>

<svelte:head>
  <title>Panel GM — RolErrante</title>
</svelte:head>

<Breadcrumbs items={[{ label: 'Panel GM' }]} class="mb-2" />

<PageHeader
  kicker="Zona del consejo · GM"
  title="Panel GM"
  subtitle="Revisa y aprueba fichas, historias, habilidades y cierres de eventos en una sola cola."
/>

{#if lastAction}
  <!-- service_role audit last-action banner (design AD-1), reusing AuditBanner -->
  <AuditBanner
    actor={lastAction.actor}
    action={lastAction.action}
    entityType={lastAction.entityType}
    entityId={lastAction.entityId}
    createdAt={lastAction.createdAt}
  />
{/if}

{#if notice}
  <div
    class="alert alert-success mb-4"
    role="status"
    data-testid="gm-success"
    aria-live="polite"
  >
    <span>{notice}</span>
    <button
      type="button"
      class="btn btn-xs btn-ghost"
      aria-label="Descartar aviso"
      onclick={dismissNotice}
    >
      ✕
    </button>
  </div>
{/if}

<GmAnalytics kpi={kpi} />

<div class="mt-6">
  <FilterChips items={queue} onFilter={onFilter} />
</div>

<div class="mt-4" data-testid="gm-worklist">
  {#if filtered.length === 0 && queue.length > 0}
    <EmptyState title="Sin resultados para este filtro" />
  {:else if filtered.length === 0}
    <EmptyState title="Sin pendientes" icon={Shield} />
  {:else}
    <!-- OD gm.html: pending cards render as a .stack of .wl-card, no extra panel. -->
    <div class="stack">
      {#each filtered as item (item.id)}
        <WorklistCard
          {item}
          done={approvedIds.has(item.entityId)}
          busy={submitting}
          onApprove={(it, n) => submitApprove(it, n)}
          onReject={(it, n) => submitReject(it, n)}
          onReview={() => review(item)}
        />
      {/each}
    </div>
  {/if}
</div>

<!-- Hidden, reused form that posts to the gm page actions (design AD-2). The
     use:enhance callback clears the in-flight guard and, on a successful
     approve, records the entity id so the card renders the "done" overlay and
     the success toast shows (design rolerrante.js:84-87). -->
<form
  method="POST"
  use:enhance={(props) => async ({ update, result }) => {
    const entityId = props.formElement.querySelector<HTMLInputElement>('input[name="entityId"]')?.value;
    try {
      await update({ reset: false });
      if (result.type === 'success') {
        if (pending?.action === 'approve' && entityId) {
          approvedIds = new Set([...approvedIds, entityId]);
          notice = 'Aprobado — firmado en auditoría';
        } else if (pending?.action === 'reject') {
          notice = 'Rechazado';
        }
      } else {
        notice = null;
      }
    } finally {
      submitting = false;
      pending = null;
    }
  }}
  bind:this={form}
  aria-hidden="true"
>
  <input type="hidden" name="entityType" value="" />
  <input type="hidden" name="entityId" value="" />
  <input type="hidden" name="notes" value="" />
  <input type="hidden" name="xp" value="" />
</form>
