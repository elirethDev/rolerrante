<script lang="ts">
  import { enhance } from '$app/forms';
  import { resolve } from '$app/paths';
  import { isGMOrAdmin } from '$lib/auth';
  import { statusLabel, statusColor, formatDate } from '$lib/utils';
  import TipTapViewer from '$lib/components/editor/TipTapViewer.svelte';
  import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
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

<article class="story-detail">
  <Breadcrumbs
    items={[{ label: 'Historias', href: '/historias' }, { label: story.title }]}
    class="mb-2"
  />

  <header class="story-head">
    <div style="min-width:0">
      <span class="kicker" style="margin-bottom:6px">Crónica</span>
      <h1 class="story-title">{story.title}</h1>
      <p class="story-sub">
        <span>por <b style="color:var(--gold-soft)">{playerName(story.character?.player)}</b></span>
        <span>· {formatDate(story.created_at)}</span>
        {#if story.character}
          <span>· Personaje: <a href={resolve(`/personajes/${story.character.id}`)}>{story.character.name}</a></span>
        {/if}
      </p>
    </div>
    <span class="badge {statusColor(story.status)} no-dot">{statusLabel(story.status)}</span>
  </header>

  {#if story.review_notes}
    <div class="review-note" data-od-id="notas-revision">
      <svg viewBox="0 0 24 24" fill="none"><path d="M12 3l2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6z" fill="currentColor"/></svg>
      <span><b>Notas de revisión:</b> {story.review_notes}</span>
    </div>
  {/if}

  <div class="story-body" data-od-id="historia-contenido">
    <div class="post-text">
      <TipTapViewer content={String(story.content)} />
    </div>
  </div>

  {#if canModerate && story.status === 'pendiente'}
    <div class="mod-panel" data-od-id="panel-moderacion">
      <h2>Moderación GM</h2>
      <div class="mod-row">
        <form method="POST" action="?/approve">
          <button type="submit" class="btn btn-success">✓ Aprobar historia</button>
        </form>
        <div class="mod-row reject">
          <form method="POST" action="?/reject" class="flex gap-2 items-center">
            <input name="notes" type="text" class="input" placeholder="Motivo del rechazo (visible para el autor)" />
            <button type="submit" class="btn btn-error">✕ Rechazar</button>
          </form>
        </div>
      </div>
      {#if form?.message}<p class="text-error text-sm mt-2">{form.message}</p>{/if}
    </div>
  {/if}

  {#if isOwner || canModerate}
    <div class="story-actions">
      <a href={resolve(`/historias/${story.id}/editar`)} class="btn btn-primary">✎ Editar historia</a>
    </div>
  {/if}
</article>
