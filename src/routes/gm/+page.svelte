<script lang="ts">
  import { goto } from '$app/navigation';
  import { enhance } from '$app/forms';
  import { Shield } from '@lucide/svelte';
  import type { PageData } from './$types';
  import type { WorklistItem } from '$lib/components/gm/types';
  import GmAnalytics from '$lib/components/gm/GmAnalytics.svelte';
  import FilterChips from '$lib/components/gm/FilterChips.svelte';
  import WorklistCard from '$lib/components/gm/WorklistCard.svelte';
  import AuditBanner from '$lib/components/admin/AuditBanner.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';

  let { data }: { data: PageData } = $props();
  const queue = $derived(data.queue);
  const kpi = $derived(data.kpi);
  const lastAction = $derived(data.lastAction);

  // Client-side filter state driven by FilterChips (spec gm-worklist R2).
  let filtered: WorklistItem[] = $state([...queue]);
  let selected: 'todas' | 'ficha' | 'evento' | 'cronica' = $state('todas');

  function onFilter(list: WorklistItem[], sel: typeof selected) {
    filtered = list;
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

  function submitApprove(item: WorklistItem) {
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
    submitting = true;
    form.requestSubmit();
  }

  function submitReject(item: WorklistItem) {
    if (submitting) return;
    const reason = window.prompt('Motivo del rechazo (obligatorio):', item.name);
    if (!reason) return;
    form.action = `?/${'reject'}`;
    form.querySelector<HTMLInputElement>('input[name="entityType"]')!.value = item.type;
    form.querySelector<HTMLInputElement>('input[name="entityId"]')!.value = item.entityId;
    form.querySelector<HTMLInputElement>('input[name="notes"]')!.value = reason;
    submitting = true;
    form.requestSubmit();
  }

  function review(item: WorklistItem) {
    goto(item.detailHref);
  }
</script>

<svelte:head>
  <title>Panel GM — RolErrante</title>
</svelte:head>

<h1 class="text-3xl font-cinzel text-azeroth-gold flex items-center gap-3 mb-6"><Shield /> Panel GM</h1>

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
    {#each filtered as item (item.id)}
      <WorklistCard
        {item}
        busy={submitting}
        onApprove={() => submitApprove(item)}
        onReject={() => submitReject(item)}
        onReview={() => review(item)}
      />
    {/each}
  {/if}
</div>

<!-- Hidden, reused form that posts to the gm page actions (design AD-2). The
     use:enhance callback only exists to clear the in-flight guard: on submit we
     set submitting=true, and after the action resolves (success, failure or
     navigation) the finally block releases the flag so the next click works. -->
<form
  method="POST"
  use:enhance={() => async ({ update }) => {
    try {
      await update({ reset: false });
    } finally {
      submitting = false;
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
