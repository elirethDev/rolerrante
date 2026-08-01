<script lang="ts">
  import { enhance } from '$app/forms';
  import { isGMOrAdmin } from '$lib/auth';
  import { statusLabel, statusColor, formatDateTime } from '$lib/utils';
  import TipTapViewer from '$lib/components/editor/TipTapViewer.svelte';
  import ParticipantList from '$lib/components/events/ParticipantList.svelte';
  import SessionList from '$lib/components/events/SessionList.svelte';
  import type { ActionData, PageData } from './$types';

  export let data: PageData;
  export let form: ActionData;

  $: event = data.event;
  $: isCreator = data.profile?.id === event.creator_id;
  $: canManage = isGMOrAdmin(data.profile?.role ?? null) || isCreator;
  $: isOpen = ['publicado', 'en_curso'].includes(event.status);
  $: participants = event.participants ?? [];
  $: confirmedParticipants = participants.filter((p: { status?: string }) => p.status === 'confirmado');
  $: sessions = data.sessions ?? [];
</script>

<svelte:head>
  <title>{event.title} — RolErrante</title>
</svelte:head>

<section class="max-w-3xl mx-auto">
  <div class="flex flex-wrap items-start justify-between gap-4 mb-4">
    <div>
      <h1 class="text-3xl md:text-4xl font-cinzel text-azeroth-gold">{event.title}</h1>
      <p class="text-sm text-gray-400 mt-1">
        {formatDateTime(event.starts_at)}{#if event.ends_at} — {formatDateTime(event.ends_at)}{/if}
        · {event.type} · {event.location ?? 'Sin ubicación'}
      </p>
    </div>
    <span class="badge badge-lg {statusColor(event.status)}">{statusLabel(event.status)}</span>
  </div>

  <div class="bg-base-100 border border-azeroth-border rounded-lg p-6 mb-6">
    <TipTapViewer content={String(event.description)} />
  </div>

  <div class="mb-6">
    <ParticipantList participants={participants} maxPlayers={event.max_players} />
  </div>

  {#if sessions.length > 0}
    <div class="mb-6">
      <SessionList {sessions} />
    </div>
  {/if}

  {#if data.profile && isOpen}
    {#if !data.participant && data.characters.length > 0}
      <form method="POST" action="?/join" use:enhance class="card bg-base-200 border border-azeroth-border mb-6">
        <div class="card-body flex-row items-end gap-4">
          <div class="form-control flex-1">
            <label class="label" for="character_id"><span class="label-text">Inscribir personaje</span></label>
            <select id="character_id" name="character_id" class="select select-bordered" required>
              {#each data.characters as c}
                <option value={c.id}>{c.name}</option>
              {/each}
            </select>
          </div>
          <button type="submit" class="btn btn-primary">Inscribirse</button>
        </div>
        {#if form?.message}<p class="text-error text-sm px-6 pb-4">{form.message}</p>{/if}
      </form>
    {:else if data.participant}
      <form method="POST" action="?/leave" use:enhance class="text-center mb-6">
        <button type="submit" class="btn btn-outline btn-error btn-sm">Cancelar inscripción</button>
      </form>
    {/if}
  {/if}

  {#if canManage && event.status !== 'finalizado'}
    <div class="card bg-base-200 border border-azeroth-border">
      <div class="card-body">
        <h2 class="card-title font-cinzel text-azeroth-gold">Gestión del evento</h2>
        {#if form?.message}<div class="alert alert-error text-sm">{form.message}</div>{/if}
        <form method="POST" action="?/finalize" use:enhance class="flex gap-3 items-end mt-2">
          <div class="form-control">
            <label class="label" for="xp"><span class="label-text">XP por participante confirmado</span></label>
            <input id="xp" name="xp" type="number" class="input input-bordered w-32" min="1" value="5" required />
          </div>
          <button type="submit" class="btn btn-success">Finalizar y otorgar XP</button>
        </form>
      </div>
    </div>
  {/if}

  {#if event.status === 'finalizado'}
    <div class="alert alert-success mt-6">Evento finalizado. XP otorgada a los participantes confirmados.</div>
  {/if}
</section>
