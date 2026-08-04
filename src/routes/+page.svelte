<script lang="ts">
  import { resolve } from '$app/paths';
  import { Pin, Flame, Lock } from '@lucide/svelte';
  import Avatar from '$lib/components/ui/Avatar.svelte';
  import EmptyState from '$lib/components/ui/EmptyState.svelte';
  import Tag from '$lib/components/ui/Tag.svelte';
  import SectionHead from '$lib/components/landing/SectionHead.svelte';
  import { formatRelativeTime } from '$lib/utils';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  // Background-video playback: `muted` as an HTML attribute is not enough to
  // satisfy autoplay policies, so set the property and call play() explicitly.
  // $effect reacts to bind:this becoming available (more reliable than onMount
  // timing) and fires again on the first user gesture as a final resort.
  let heroVideo: HTMLVideoElement | undefined = $state();
  function tryPlay(v: HTMLVideoElement | undefined) {
    if (!v) return;
    v.muted = true;
    v.defaultMuted = true;
    const p = v.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  }
  $effect(() => {
    tryPlay(heroVideo);
    const onFirstGesture = () => {
      tryPlay(heroVideo);
      window.removeEventListener('pointerdown', onFirstGesture);
      window.removeEventListener('keydown', onFirstGesture);
    };
    window.addEventListener('pointerdown', onFirstGesture);
    window.addEventListener('keydown', onFirstGesture);
    return () => {
      window.removeEventListener('pointerdown', onFirstGesture);
      window.removeEventListener('keydown', onFirstGesture);
    };
  });

  // --- Discord widget: static demo numbers (no Discord presence API). Replace
  // with real values once a bot/API exposes them. DISCORD_INVITE is the real
  // invite the community configured.
  const DISCORD_INVITE = 'https://discord.gg/xDJTmZAxPU';
  const MEMBERS = 312;
  const ONLINE = 128;

  // --- "Conectados": static demo list (no presence backend). Placeholder only.
  const ONLINE_USERS = [
    { name: 'Kareth', activity: 'escribiendo', place: 'en Crínicas', ring: true },
    { name: 'Mariela', activity: '', place: 'en Eventos', ring: false },
    { name: 'Raviel', activity: '', place: 'en Fichas', ring: false },
    { name: 'Torgal', activity: '', place: 'en La Taberna', ring: false },
  ];

  const characterHref = (id: string) => resolve(`/personajes/${id}` as any) as string;
  const threadHref = (id: string) => resolve(`/foro/${id}` as any) as string;
</script>

<svelte:head>
  <title>Rol Errante — Comunidad de rol</title>
  <meta
    name="description"
    content="Foros, crónicas y personajes de rol en World of Warcraft. Un reino pequeño hecho por errantes, con un asiento esperándote."
  />
</svelte:head>

<section class="hero">
  <div class="hero-stage">
    <div class="hero-bg" aria-hidden="true">
      <video
        class="hero-video"
        bind:this={heroVideo}
        autoplay
        muted
        loop
        playsinline
        preload="auto"
        poster="/hero-poster.jpg"
        data-testid="hero-video"
      >
        <source src="/hero-loop.mp4" type="video/mp4" />
        <source src="/hero-loop.webm" type="video/webm" />
      </video>
      <div class="cinema hero-zoom"><div class="horizon"></div></div>
      <div class="veil"></div>
      <div class="embers">
        <i style="left:8%; --d:8s"></i>
        <i style="left:20%; --d:11s; animation-delay:1s"></i>
        <i style="left:35%; --d:9s; animation-delay:.5s"></i>
        <i style="left:58%; --d:12s; animation-delay:2s"></i>
        <i style="left:72%; --d:8.5s; animation-delay:1.5s"></i>
        <i style="left:88%; --d:10s; animation-delay:.3s"></i>
      </div>
    </div>
    <div class="hero-inner">
      <div class="hero-copy">
        <h1 class="hero-title">Construimos esta casa<br />para que en ella escribas tu <em>leyenda</em></h1>
        <p class="hero-sub">
          Somos una comunidad de rol en World of Warcraft: foros, crónicas y personajes para escribir
          historias juntos. Acércate y toma asiento: que tus días sean largos y tus contratiempos, escasos.
        </p>
        <div class="hero-cta">
          <a href={resolve('/foro')} class="btn btn-primary btn-lg">Explorar los foros</a>
          <a href={resolve('/personajes/nuevo')} class="btn btn-secondary btn-lg">Crear mi ficha</a>
        </div>
      </div>
    </div>
  </div>
</section>

<div class="info-wrap">
  <section class="feed" aria-labelledby="feed-heading">
    <SectionHead
      kicker="El salón ahora"
      title="Actividad reciente"
      linkLabel="Ver todo el foro"
      linkHref={resolve('/foro')}
      headingId="feed-heading"
    />
    {#if data.feed.length > 0}
      <div class="forum-panel">
        {#each data.feed as row (row.id)}
          <div class="thread-row">
            <div class="thread-flags" aria-hidden="true">
              {#if row.isSticky}
                <span class="marker marker-pin" title="Fijado"><Pin size={16} /></span>
              {/if}
              {#if row.isHot}
                <span class="marker marker-hot" title="Tendencia"><Flame size={16} /></span>
              {/if}
              {#if row.isLocked}
                <span class="marker marker-lock" title="Bloqueado"><Lock size={16} /></span>
              {/if}
            </div>
            <div class="thread-main">
              <a class="thread-title" href={threadHref(row.id)}>{row.title}</a>
              <div class="thread-meta">
                <span class="who">
                  <Avatar name={row.authorName} size="sm" alt={row.authorName} />
                  <b>{row.authorName}</b>
                </span>
                <span>{formatRelativeTime(row.updatedAt)}</span>
                <span class="tag-wrap"><Tag>{row.contentTypeLabel}</Tag></span>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <EmptyState
        title="Sin actividad todavía"
        description="Cuando alguien escriba en el salón, la actividad de la comunidad aparecerá aquí."
      />
    {/if}
  </section>

  <aside class="l-side" aria-label="Comunidad">
    <div class="ds-card">
      <div class="ds-head">
        <span class="ds-avatar" aria-hidden="true">RE</span>
        <div>
          <div class="ds-name">Rol Errante · Discord</div>
          <div class="ds-online">{ONLINE} en línea</div>
        </div>
      </div>
      <div class="ds-body">
        <p>
          El canal de la taberna: coordinación de eventos, dudas de tu personaje y charla fuera de juego.
          Las normas del foro se aplican también aquí.
        </p>
        <div class="ds-stats" data-testid="discord-stats">
          <span><b>{MEMBERS}</b> miembros</span>
          <span><b>{ONLINE}</b> en línea</span>
        </div>
        <a class="ds-btn" href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer">
          Unirse a Discord
        </a>
      </div>
    </div>

    <div class="users-online" aria-label="Quién está conectado">
      <span class="kicker">Conectados</span>
      {#each ONLINE_USERS as u (u.name)}
        <div class="uo-row">
          <Avatar name={u.name} size="sm" ring={u.ring} alt={u.name} />
          <span class="who">{u.name}</span>
          {#if u.activity}
            <span class="badge badge-success badge-xs">{u.activity}</span>
          {/if}
          <span class="uo-tag">{u.place}</span>
        </div>
      {/each}
      <a class="uo-more" href={resolve('/foro')}>Ver toda la lista ({ONLINE_USERS.length}) →</a>
    </div>
  </aside>
</div>

<section class="landing-section" aria-labelledby="cronicas-heading">
  <SectionHead
    kicker="Historias del reino"
    title="Crónicas en curso"
    linkLabel="Ver todas"
    linkHref={resolve('/foro')}
    headingId="cronicas-heading"
  />
  {#if data.cronicas.length > 0}
    <div class="media-grid">
      {#each data.cronicas as c (c.id)}
        <a class="media-card" href={threadHref(c.id)}>
          <div class="media-title">{c.title}</div>
          <p class="media-excerpt">{c.excerpt}</p>
          <div class="media-foot">
            <span class="who">
              <Avatar name={c.authorName} size="sm" alt={c.authorName} />
              {c.authorName}
            </span>
            <Tag>{c.tag}</Tag>
          </div>
        </a>
      {/each}
    </div>
  {:else}
    <EmptyState
      title="Sin crónicas todavía"
      description="Las historias que el consejo abra en el reino aparecerán aquí."
    />
    {/if}
</section>

<section class="landing-section" aria-labelledby="eventos-heading">
  <SectionHead
    kicker="Agenda del reino"
    title="Eventos activos"
    linkLabel="Ver agenda"
    linkHref={resolve('/foro')}
    headingId="eventos-heading"
  />
  {#if data.eventos.length > 0}
    <div class="media-grid">
      {#each data.eventos as ev (ev.id)}
        <a class="media-card" href={resolve(`/eventos/${ev.id}` as any) as string}>
          <div class="event-media">
            <div class="event-date" aria-hidden="true">
              <b>{ev.day}</b>
              <span>{ev.month}</span>
            </div>
            <div class="event-body">
              <div class="media-title">{ev.title}</div>
              <p class="media-excerpt">{ev.excerpt}</p>
              <div class="media-foot">
                <span class="who">por {ev.authorName}</span>
                <Tag>Evento</Tag>
              </div>
            </div>
          </div>
        </a>
      {/each}
    </div>
  {:else}
    <EmptyState
      title="Sin eventos activos todavía"
      description="Cuando haya una convocatoria en la agenda del reino, aparecerá aquí."
    />
  {/if}
</section>

<section class="landing-section" aria-labelledby="fichas-heading">
  <SectionHead
    kicker="Censo del reino"
    title="Fichas de personaje"
    linkLabel="Ver todas"
    linkHref={resolve('/foro')}
    headingId="fichas-heading"
  />
  {#if data.fichas.length > 0}
    <div class="char-grid">
      {#each data.fichas as ch (ch.id)}
        <a class="char-card" href={characterHref(ch.id)}>
          <div class="char-top">
            <Avatar src={ch.avatarUrl} name={ch.name} size="lg" ring={ch.tagKind === 'success'} alt={ch.name} />
            <div class="char-info">
              <span class="char-name">{ch.name}</span>
              <span class="char-meta">{ch.meta}</span>
            </div>
          </div>
          <div class="char-tags">
            <span class="badge {ch.tagKind === 'success' ? 'badge-success' : 'badge-info'} badge-sm">{ch.tag}</span>
          </div>
          <div class="char-owner">por {ch.ownerName} · {formatRelativeTime(ch.updatedAt)}</div>
        </a>
      {/each}
    </div>
  {:else}
    <EmptyState
      title="Sin fichas todavía"
      description="Presenta tu personaje al consejo y ocupa tu lugar en el censo del reino."
    />
  {/if}
</section>

<style>
  .hero {
    position: relative;
    min-height: calc(100vh - 64px);
    display: flex;
    align-items: stretch;
  }
  .hero-stage {
    position: relative;
    flex: 1;
    width: 100%;
    display: flex;
    align-items: center;
    border-bottom: 1px solid var(--color-azeroth-border);
    overflow: hidden;
  }

  .hero-bg {
    position: absolute;
    inset: 0;
    overflow: hidden;
    z-index: 0;
    background: var(--color-azeroth-bg-deep);
  }
  .hero-bg .cinema {
    position: absolute;
    inset: 0;
    z-index: 0;
  }
  .hero-bg .hero-video {
    position: absolute;
    inset: 0;
    z-index: 1;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .hero-bg .veil {
    position: absolute;
    inset: 0;
    z-index: 2;
    background: linear-gradient(90deg, rgba(7, 9, 16, 0.78) 0%, rgba(7, 9, 16, 0.55) 45%, rgba(7, 9, 16, 0.25) 75%, rgba(7, 9, 16, 0.5) 100%);
  }
  .hero-bg .embers {
    z-index: 3;
  }

  .cinema {
    position: relative;
    overflow: hidden;
    background: var(--color-azeroth-bg-deep);
    background-image:
      radial-gradient(130% 90% at 50% -10%, #101a30 0%, rgba(16, 26, 48, 0) 55%),
      radial-gradient(90% 70% at 50% 30%, rgba(56, 96, 190, 0.16), rgba(56, 96, 190, 0) 60%);
  }
  .cinema::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(46% 42% at 68% 30%, rgba(248, 183, 0, 0.2), rgba(248, 183, 0, 0) 62%),
      radial-gradient(30% 34% at 26% 62%, rgba(14, 134, 202, 0.14), rgba(14, 134, 202, 0) 60%);
  }
  .cinema::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: radial-gradient(120% 90% at 50% 108%, rgba(0, 0, 0, 0.85), transparent 58%),
      url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='.05'/%3E%3C/svg%3E");
    mix-blend-mode: soft-light;
  }
  .cinema .horizon {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 160px;
    background: linear-gradient(180deg, transparent, rgba(7, 9, 16, 0.9));
    pointer-events: none;
  }
  .hero-zoom {
    animation: zoom 22s ease-in-out infinite alternate;
  }
  @keyframes zoom {
    from {
      scale: 1;
    }
    to {
      scale: 1.06;
    }
  }

  .embers {
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.7;
  }
  .embers i {
    position: absolute;
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: var(--color-azeroth-gold-bright);
    box-shadow: 0 0 8px var(--color-azeroth-gold);
    animation: float var(--d, 9s) linear infinite;
    opacity: 0;
  }
  @keyframes float {
    0% {
      transform: translateY(6vh);
      opacity: 0;
    }
    12% {
      opacity: 0.9;
    }
    85% {
      opacity: 0.35;
    }
    100% {
      transform: translateY(-92vh);
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .embers i,
    .hero-zoom {
      animation: none;
    }
  }

  .hero-inner {
    position: relative;
    z-index: 2;
    width: 100%;
    max-width: 1180px;
    margin-inline: auto;
    display: flex;
    align-items: center;
    padding: clamp(48px, 7vw, 96px) clamp(16px, 3vw, 32px);
  }
  .hero-copy {
    max-width: 640px;
  }
  .hero-title {
    font-family: var(--font-cinzel);
    font-size: clamp(2.4rem, 5vw + 1rem, 4.15rem);
    line-height: 1.05;
    font-weight: 700;
    color: var(--color-azeroth-text-high);
    margin: 0 0 18px;
    letter-spacing: 0.01em;
  }
  .hero-title em {
    font-style: normal;
    color: transparent;
    background: linear-gradient(180deg, var(--color-azeroth-gold-bright), var(--color-azeroth-gold));
    -webkit-background-clip: text;
    background-clip: text;
  }
  .hero-sub {
    max-width: 560px;
    font-size: 1.12rem;
    line-height: 1.66;
    color: var(--color-azeroth-text-soft);
    margin: 0 0 30px;
  }
  .hero-cta {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }
  @media (max-width: 760px) {
    .hero-sub {
      font-size: 1rem;
    }
  }
  @media (max-width: 380px) {
    .hero-title {
      font-size: clamp(2rem, 6vw + 0.75rem, 3rem);
    }
    .hero-sub {
      font-size: 0.95rem;
    }
  }

  /* ---- shared section typography (used by SectionHead + inline kickers) ---- */
  :global(.section-head) {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 1.25rem;
  }
  :global(.kicker) {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--color-azeroth-gold);
  }
  :global(.kicker)::before {
    content: '';
    width: 26px;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--color-azeroth-gold-dim));
  }
  :global(.landing-h2) {
    font-family: var(--font-cinzel);
    font-size: clamp(1.9rem, 3.2vw + 0.45rem, 2.85rem);
    line-height: 1.1;
    font-weight: 700;
    color: var(--color-azeroth-text-high);
    margin: 12px 0 0;
  }

  .landing-section {
    max-width: 1180px;
    margin-inline: auto;
    padding: 2.5rem clamp(16px, 3vw, 32px);
  }

  /* ---- info-wrap: feed + sidebar ---- */
  .info-wrap {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 320px;
    gap: 2rem;
    align-items: start;
    max-width: 1180px;
    margin-inline: auto;
    padding: 3rem clamp(16px, 3vw, 32px) 2rem;
  }
  @media (max-width: 1080px) {
    .info-wrap {
      grid-template-columns: 1fr;
    }
  }
  .feed {
    align-self: stretch;
    display: flex;
    flex-direction: column;
  }
  .forum-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--color-azeroth-border);
    border-radius: var(--radius-lg);
    background: linear-gradient(180deg, var(--color-azeroth-surface-2), var(--color-azeroth-surface));
    box-shadow: var(--shadow-1);
    overflow: hidden;
  }
  .l-side {
    position: sticky;
    top: calc(64px + 16px);
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }
  @media (max-width: 1080px) {
    .l-side {
      position: static;
    }
  }

  /* feed rows */
  .thread-row {
    display: flex;
    gap: 14px;
    align-items: flex-start;
    padding: 13px 18px;
    border-bottom: 1px solid var(--color-azeroth-border);
  }
  .thread-row:last-child {
    border-bottom: 0;
  }
  .thread-flags {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: none;
    padding-top: 2px;
  }
  .marker {
    display: inline-flex;
    color: var(--color-azeroth-muted);
  }
  .marker-pin {
    color: var(--color-azeroth-gold);
  }
  .marker-hot {
    color: var(--color-azeroth-danger-fg);
  }
  .marker-lock {
    color: var(--color-azeroth-muted);
  }
  .thread-main {
    min-width: 0;
    flex: 1 1 0;
  }
  .thread-title {
    display: block;
    font-weight: 600;
    color: var(--color-azeroth-text-soft);
    text-decoration: none;
    line-height: 1.35;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .thread-title:hover {
    color: var(--color-azeroth-gold-soft);
  }
  .thread-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    margin-top: 6px;
    font-size: 0.78rem;
    color: var(--color-azeroth-muted);
  }
  .thread-meta .who {
    display: inline-flex;
    align-items: center;
    gap: 7px;
  }
  .thread-meta .who b {
    font-weight: 600;
    color: var(--color-azeroth-text-soft);
  }
  .tag-wrap {
    display: inline-flex;
  }

  /* discord widget */
  .ds-card {
    border: 1px solid var(--color-azeroth-border);
    border-radius: var(--radius-lg);
    background: linear-gradient(180deg, var(--color-azeroth-surface-2), var(--color-azeroth-surface));
    box-shadow: var(--shadow-1);
    overflow: hidden;
    position: relative;
  }
  .ds-card::before {
    content: '';
    position: absolute;
    inset-inline: 0;
    top: 0;
    height: 2px;
    background: var(--gold-hairline);
  }
  .ds-head {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 13px 18px;
    border-bottom: 1px solid var(--color-azeroth-border);
    background: linear-gradient(90deg, rgba(248, 183, 0, 0.07), rgba(248, 183, 0, 0) 70%);
  }
  .ds-avatar {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: linear-gradient(160deg, #5865f2, #3a45c5);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-cinzel);
    font-weight: 800;
    color: #fff;
    font-size: 1.05rem;
    flex: none;
  }
  .ds-name {
    font-family: var(--font-cinzel);
    font-weight: 700;
    color: var(--color-azeroth-text-high);
    font-size: 1.05rem;
    line-height: 1.2;
  }
  .ds-online {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.74rem;
    color: var(--color-azeroth-success-fg);
    font-weight: 600;
    margin-top: 2px;
  }
  .ds-online::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-azeroth-success);
    box-shadow: 0 0 8px var(--color-azeroth-success);
  }
  .ds-body {
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    font-size: 0.9rem;
    color: var(--color-azeroth-text-soft);
    line-height: 1.6;
  }
  .ds-body p {
    margin: 0;
  }
  .ds-stats {
    display: flex;
    gap: 12px;
    font-size: 0.8rem;
    color: var(--color-azeroth-muted);
  }
  .ds-stats b {
    color: var(--color-azeroth-text-high);
    font-family: var(--font-mono);
  }
  .ds-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    padding: 11px 12px;
    border-radius: var(--radius-sm);
    background: linear-gradient(180deg, var(--color-azeroth-gold-bright), var(--color-azeroth-gold));
    color: #1a1508;
    font-weight: 700;
    font-size: 0.9rem;
    letter-spacing: 0.02em;
    text-decoration: none;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35), 0 8px 22px -10px rgba(248, 183, 0, 0.5);
    transition: filter 0.15s, transform 0.12s;
  }
  .ds-btn:hover {
    filter: brightness(1.05);
    transform: translateY(-1px);
    color: #1a1508;
  }

  /* conectados */
  .users-online {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 14px 16px;
    border: 1px solid var(--color-azeroth-border);
    border-radius: var(--radius-lg);
    background: linear-gradient(180deg, var(--color-azeroth-surface-2), var(--color-azeroth-surface));
  }
  .users-online .kicker {
    margin-bottom: 2px;
  }
  .uo-row {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.88rem;
    color: var(--color-azeroth-text-soft);
  }
  .uo-row .who {
    font-weight: 600;
    color: var(--color-azeroth-text-high);
  }
  .uo-tag {
    margin-left: auto;
    font-size: 0.68rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-azeroth-faint);
  }
  .uo-more {
    font-size: 0.78rem;
    color: var(--color-azeroth-link);
    font-weight: 500;
    margin-top: 2px;
    text-decoration: none;
  }
  .uo-more:hover {
    text-decoration: underline;
  }

  /* media cards (crónicas / eventos) */
  .media-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1rem;
  }
  .media-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 16px 18px;
    border: 1px solid var(--color-azeroth-border);
    border-radius: var(--radius-lg);
    background: linear-gradient(180deg, var(--color-azeroth-surface-2), var(--color-azeroth-surface));
    transition: border-color 0.15s, translate 0.15s, background-color 0.15s;
    text-decoration: none;
  }
  .media-card:hover {
    border-color: var(--color-azeroth-gold-dim);
    translate: 0 -2px;
  }
  .media-title {
    font-family: var(--font-cinzel);
    font-weight: 700;
    color: var(--color-azeroth-text-high);
    font-size: 1.05rem;
    line-height: 1.25;
  }
  .media-excerpt {
    font-size: 0.86rem;
    color: var(--color-azeroth-muted);
    line-height: 1.55;
    margin: 0;
    display: -webkit-box;
    line-clamp: 3;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .media-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    font-size: 0.78rem;
    color: var(--color-azeroth-faint);
    margin-top: auto;
  }
  .media-foot .who {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-width: 0;
  }
  .event-media {
    display: flex;
    gap: 16px;
    align-items: center;
  }
  .event-date {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: var(--font-mono);
    line-height: 1.1;
    color: var(--color-azeroth-gold-bright);
    flex: none;
  }
  .event-date b {
    font-size: 1.2rem;
    color: var(--color-azeroth-gold);
  }
  .event-date span {
    font-size: 0.62rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-azeroth-faint);
  }
  .event-body {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  /* fichas del reino */
  .char-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 1rem;
  }
  .char-card {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 16px;
    min-width: 0;
    border: 1px solid var(--color-azeroth-border);
    border-radius: var(--radius-lg);
    background: linear-gradient(180deg, var(--color-azeroth-surface-2), var(--color-azeroth-surface));
    transition: border-color 0.15s, translate 0.15s;
    text-decoration: none;
  }
  .char-card:hover {
    border-color: var(--color-azeroth-gold-dim);
    translate: 0 -2px;
  }
  .char-top {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }
  .char-info {
    min-width: 0;
    flex: 1 1 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .char-name {
    font-family: var(--font-cinzel);
    font-weight: 700;
    color: var(--color-azeroth-text-high);
    font-size: 0.98rem;
    line-height: 1.2;
    display: -webkit-box;
    line-clamp: 2;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .char-meta {
    font-size: 0.78rem;
    color: var(--color-azeroth-muted);
  }
  .char-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: auto;
  }
  .char-owner {
    display: flex;
    align-items: center;
    gap: 7px;
    min-width: 0;
    font-size: 0.78rem;
    color: var(--color-azeroth-faint);
    margin-top: 2px;
  }
</style>
