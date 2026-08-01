<script lang="ts">
  import { enhance } from '$app/forms';
  import TipTapEditor from '$lib/components/editor/TipTapEditor.svelte';
  import { isGMOrAdmin } from '$lib/auth';
  import { statusLabel, statusColor, formatDate } from '$lib/utils';
  import TipTapViewer from '$lib/components/editor/TipTapViewer.svelte';
  import type { ActionData, PageData } from './$types';

  export let data: PageData;
  export let form: ActionData;

  $: story = data.story;
  $: isOwner = data.profile?.id === story.character?.player_id;
  $: canModerate = isGMOrAdmin(data.profile?.role ?? null);

  // Player embed helper — supabase type inference loses nested join types on multi-FK tables
  const playerName = (p: unknown): string =>
    (p as { display_name?: string | null; username?: string })?.display_name ??
    (p as { display_name?: string | null; username?: string })?.username ??
    'Anónimo';
</script>

<svelte:head>
  <title>{story.title} — RolErrante</title>
</svelte:head>

<article class="max-w-3xl mx-auto">
  <div class="flex flex-wrap items-start justify-between gap-4 mb-4">
    <div>
      <h1 class="text-3xl md:text-4xl font-cinzel text-azeroth-gold">{story.title}</h1>
      <p class="text-sm text-gray-400 mt-1">
        Por <span class="text-azeroth-gold">{playerName(story.character?.player)}</span>
        · {formatDate(story.created_at)}
        {#if story.character}
          · Personaje: <a href="/personajes/{story.character.id}" class="link">{story.character.name}</a>
        {/if}
      </p>
    </div>
    <span class="badge {statusColor(story.status)}">{statusLabel(story.status)}</span>
  </div>

  {#if story.review_notes}
    <div class="alert alert-warning text-sm mb-6">
      <strong>Notas de revisión:</strong> {story.review_notes}
    </div>
  {/if}

  <div class="prose prose-invert max-w-none bg-base-100 border border-azeroth-border rounded-lg p-6">
    <TipTapViewer content={String(story.content)} />
  </div>

  {#if canModerate && story.status === 'pendiente'}
    <div class="card bg-base-200 border border-azeroth-border mt-6">
      <div class="card-body">
        <h2 class="card-title font-cinzel">Moderación GM</h2>
        {#if form?.message}<div class="alert alert-error text-sm">{form.message}</div>{/if}
        <div class="flex flex-col gap-3 mt-2">
          <form method="POST" action="?/approve">
            <button type="submit" class="btn btn-success w-full">✓ Aprobar historia</button>
          </form>
          <form method="POST" action="?/reject" class="flex gap-2">
            <button type="submit" class="btn btn-error">✕ Rechazar</button>
            <input name="notes" type="text" class="input input-bordered flex-1" placeholder="Motivo del rechazo" />
          </form>
        </div>
      </div>
    </div>
  {/if}

  {#if isOwner && story.status === 'rechazado'}
    <div class="mt-6 text-center">
      <a href="/historias/{story.id}/editar" class="btn btn-primary">Editar y reenviar</a>
    </div>
  {/if}
</article>