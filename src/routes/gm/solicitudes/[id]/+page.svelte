<script lang="ts">
  import { enhance } from '$app/forms';
  import Field from '$lib/components/ui/Field.svelte';
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

<section class="max-w-3xl mx-auto">
  <h1 class="text-3xl font-cinzel text-azeroth-gold mb-2">Solicitud de habilidad</h1>
  <p class="text-gray-400 mb-6">{req.character?.name} · {req.total_xp_cost} XP · {playerName(req.character?.player)}</p>

  <div class="card bg-base-200 border border-azeroth-border mb-6">
    <div class="card-body">
      <h2 class="card-title font-cinzel text-azeroth-gold">Mejoras solicitadas</h2>
      <ul class="divide-y divide-azeroth-border mt-2">
        {#each items as item (item.id)}
          <li class="py-2 flex justify-between">
            <span>{item.skill?.name}{item.specialization ? ` (${item.specialization})` : ''}</span>
            <span class="text-azeroth-gold">{item.from_level} → {item.to_level} ({item.xp_cost} XP)</span>
          </li>
        {/each}
      </ul>
      <p class="mt-4"><strong>Justificación:</strong> {req.justification}</p>
    </div>
  </div>

  {#if form?.message}<div class="alert alert-error mb-4">{form.message}</div>{/if}

  <div class="flex flex-col gap-3">
    <form method="POST" action="?/approve">
      <button type="submit" class="btn btn-success w-full">✓ Aprobar solicitud</button>
    </form>
    <form method="POST" action="?/reject" class="flex gap-2 items-center">
      <button type="submit" class="btn btn-error">✕ Rechazar</button>
      <Field label="Motivo del rechazo" class="flex-1">
        {#snippet ctrl()}
          <input name="notes" type="text" class="input flex-1" placeholder="Motivo del rechazo" />
        {/snippet}
      </Field>
    </form>
  </div>
</section>
