<script lang="ts">
  import { enhance } from '$app/forms';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
  import type { ActionData, PageData } from './$types';

  export let data: PageData;
  export let form: ActionData;

  $: req = data.request;
  $: items = req.items ?? [];

  // Player embed helper — supabase type inference loses nested join types on multi-FK tables
  const playerName = (p: unknown): string =>
    (p as { display_name?: string | null; username?: string })?.display_name ??
    (p as { display_name?: string | null; username?: string })?.username ??
    '';
</script>

<svelte:head>
  <title>Solicitud de habilidad — RolErrante</title>
</svelte:head>

<section class="gm-detail">
  <Breadcrumbs
    items={[{ label: 'Panel GM', href: '/gm' }, { label: 'Solicitud' }]}
    class="mb-2"
  />

  <PageHeader
    kicker="Panel GM"
    title="Solicitud de habilidad"
    subtitle={`${req.character?.name ?? ''} · ${req.total_xp_cost} XP · ${playerName(req.character?.player)}`}
  />

  {#if form?.message}<div class="form-error" role="alert">{form.message}</div>{/if}

  <section class="up-card">
    <div class="up-head"><h2>Mejoras solicitadas</h2></div>
    <div class="up-body">
      {#each items as item (item.id)}
        <div class="up-row">
          <span class="u-name"><b>{item.skill?.name}</b>{item.specialization ? ` (${item.specialization})` : ''}</span>
          <span class="arrow">{item.from_level} → {item.to_level}</span>
          <span class="cost">{item.xp_cost} XP</span>
        </div>
      {/each}
      <p class="justific"><b>Justificación:</b> {req.justification}</p>
    </div>
  </section>

  <div class="gm-actions">
    <form method="POST" action="?/approve">
      <button type="submit" class="btn btn-success btn-lg btn-block">✓ Aprobar solicitud</button>
    </form>
    <form method="POST" action="?/reject" class="reject">
      <div class="field">
        <label for="gm-rej">Motivo del rechazo</label>
        <input id="gm-rej" name="notes" type="text" class="input" placeholder="Motivo del rechazo" />
      </div>
      <button type="submit" class="btn btn-danger">✕ Rechazar</button>
    </form>
  </div>
</section>
