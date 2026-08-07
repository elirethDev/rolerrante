<script lang="ts">
  import { enhance } from '$app/forms';
  import { isGMOrAdmin } from '$lib/auth';
  import { statusLabel, statusColor, formatDateTime } from '$lib/utils';
  import { Info } from '@lucide/svelte';
  import TipTapViewer from '$lib/components/editor/TipTapViewer.svelte';
  import ParticipantList from '$lib/components/events/ParticipantList.svelte';
  import SessionList from '$lib/components/events/SessionList.svelte';
  import SessionManager from '$lib/components/events/SessionManager.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
  import type { ActionData, PageData } from './$types';

  export let data: PageData;
  export let form: ActionData;

  $: event = data.event;
  $: isCreator = data.profile?.id === event.creator_id;
  $: canManage = isGMOrAdmin(data.profile?.role ?? null) || isCreator;
  $: isOpen = ['publicado', 'en_curso'].includes(event.status);
  $: participants = event.participants ?? [];
  $: sessions = data.sessions ?? [];
</script>

<svelte:head>
  <title>{event.title} — RolErrante</title>
</svelte:head>

<div class="event-detail">
  <Breadcrumbs
    items={[{ label: 'Eventos', href: '/eventos' }, { label: event.title }]}
    class="mb-2"
  />

  <PageHeader
    kicker={`Evento · ${event.type}`}
    title={event.title}
  >
    {#snippet actions()}
      <span class="badge badge-lg {statusColor(event.status)}">{statusLabel(event.status)}</span>
    {/snippet}
  </PageHeader>
  <p class="detail-sub">
    <b>{formatDateTime(event.starts_at)}</b>{#if event.ends_at} — {formatDateTime(event.ends_at)}{/if}
    · {event.type} · {event.location ?? 'Sin ubicación'}
  </p>

  <div class="detail-body">
    <TipTapViewer content={String(event.description)} />
  </div>

  <div class="mt-5">
    <ParticipantList participants={participants} maxPlayers={event.max_players} />
  </div>

  {#if canManage && event.status !== 'finalizado'}
    <div class="mt-5">
      <SessionManager {sessions} />
    </div>
  {:else if sessions.length > 0}
    <div class="mt-5">
      <SessionList {sessions} />
    </div>
  {/if}

  {#if data.profile && isOpen}
    {#if !data.participant && data.characters.length > 0}
      <form method="POST" action="?/join" use:enhance class="panel join-form">
        <div class="field">
          <label for="character_id">Inscribir personaje</label>
          <select id="character_id" name="character_id" class="select" required>
            {#each data.characters as c (c.id)}
              <option value={c.id}>{c.name}</option>
            {/each}
          </select>
        </div>
        <button type="submit" class="btn btn-primary">Inscribirse</button>
        {#if form?.message}<span class="text-sm text-error basis-full">{form.message}</span>{/if}
      </form>
    {:else if data.participant}
      <form method="POST" action="?/leave" use:enhance class="text-center">
        <button type="submit" class="btn btn-outline btn-error btn-sm">Cancelar inscripción</button>
      </form>
    {/if}

    <p class="side-note">
      <Info size={16} />
      Necesitás una ficha aprobada para inscribirte. Se aplican las reglas del compendio.
    </p>
  {/if}

  {#if canManage && event.status !== 'finalizado'}
    <div class="panel">
      <div class="panel-head"><h2>Gestión del evento</h2><span class="meta">finalización</span></div>
      {#if form?.message}
        <div class="alert alert-error mx-5 mt-4 text-sm">{form.message}</div>
      {/if}
      <form method="POST" action="?/finalize" use:enhance class="join-form">
        <div class="field">
          <label for="xp">XP por participante confirmado</label>
          <input id="xp" name="xp" type="number" class="input" min="1" value="5" required />
        </div>
        <button type="submit" class="btn btn-success">Finalizar y otorgar XP</button>
      </form>
    </div>
  {/if}

  {#if event.status === 'finalizado'}
    <div class="alert alert-success mt-6">Evento finalizado. XP otorgada a los participantes confirmados.</div>
  {/if}
</div>
