<script lang="ts">
  import { enhance } from '$app/forms';
  import { isGMOrAdmin } from '$lib/auth';
  import { statusLabel, statusColor, formatDateTime } from '$lib/utils';
  import TipTapViewer from '$lib/components/editor/TipTapViewer.svelte';
  import ParticipantList from '$lib/components/events/ParticipantList.svelte';
  import SessionList from '$lib/components/events/SessionList.svelte';
  import SessionManager from '$lib/components/events/SessionManager.svelte';
  import Field from '$lib/components/ui/Field.svelte';
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
  $: confirmedParticipants = participants.filter((p: { status?: string }) => p.status === 'confirmado');
  $: sessions = data.sessions ?? [];
</script>

<svelte:head>
  <title>{event.title} — RolErrante</title>
</svelte:head>

<div class="max-w-3xl mx-auto">
  <Breadcrumbs
    items={[{ label: 'Eventos', href: '/eventos' }, { label: event.title }]}
    class="mb-2"
  />

  <PageHeader
    kicker="Evento"
    title={event.title}
  >
    {#snippet actions()}
      <span class="badge badge-lg {statusColor(event.status)}">{statusLabel(event.status)}</span>
    {/snippet}
  </PageHeader>
  <p class="page-sub" style="margin-top:-0.5rem;margin-bottom:1.5rem">
    {formatDateTime(event.starts_at)}{#if event.ends_at} — {formatDateTime(event.ends_at)}{/if}
    · {event.type} · {event.location ?? 'Sin ubicación'}
  </p>

  <div class="panel mb-6">
    <div class="panel-body">
      <TipTapViewer content={String(event.description)} />
    </div>
  </div>

  <div class="mb-6">
    <ParticipantList participants={participants} maxPlayers={event.max_players} />
  </div>

  {#if canManage && event.status !== 'finalizado'}
    <div class="mb-6">
      <SessionManager {sessions} />
    </div>
  {:else if sessions.length > 0}
    <div class="mb-6">
      <SessionList {sessions} />
    </div>
  {/if}

  {#if data.profile && isOpen}
    {#if !data.participant && data.characters.length > 0}
      <form method="POST" action="?/join" use:enhance class="panel mb-6">
        <div class="panel-body flex-row items-end gap-4">
          <Field label="Inscribir personaje" required class="flex-1">
            {#snippet ctrl()}
              <select id="character_id" name="character_id" class="select" required>
                {#each data.characters as c (c.id)}
                  <option value={c.id}>{c.name}</option>
                {/each}
              </select>
            {/snippet}
          </Field>
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
    <div class="panel">
      <div class="panel-head"><h2>Gestión del evento</h2></div>
      <div class="panel-body">
        {#if form?.message}<div class="alert alert-error text-sm">{form.message}</div>{/if}
        <form method="POST" action="?/finalize" use:enhance class="flex gap-3 items-end mt-2">
          <Field label="XP por participante confirmado" required>
            {#snippet ctrl()}
              <input id="xp" name="xp" type="number" class="input w-32" min="1" value="5" required />
            {/snippet}
          </Field>
          <button type="submit" class="btn btn-success">Finalizar y otorgar XP</button>
        </form>
      </div>
    </div>
  {/if}

  {#if event.status === 'finalizado'}
    <div class="alert alert-success mt-6">Evento finalizado. XP otorgada a los participantes confirmados.</div>
  {/if}
</div>
