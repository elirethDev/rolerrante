<script lang="ts">
  import { User } from '@lucide/svelte';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import type { User as SupabaseUser } from '@supabase/supabase-js';
  import type { Profile } from '$lib/types';
  import { isGMOrAdmin, isAdmin } from '$lib/auth';
  import NotificationBell from '$lib/components/notifications/NotificationBell.svelte';

  let {
    user,
    profile,
    unreadCount = 0,
  }: { user: SupabaseUser | null; profile: Profile | null; unreadCount?: number } = $props();

  let menuOpen = $state(false);

  function closeMenu() {
    menuOpen = false;
  }

  // Ruta activa: coincidencia exacta para el inicio, prefijo para el resto.
  function active(href: string): 'page' | undefined {
    const p = page.url.pathname;
    if (href === resolve('/')) return p === '/' ? 'page' : undefined;
    return p.startsWith(href) ? 'page' : undefined;
  }
</script>

<header class="topbar">
  <div class="topbar-inner">
    <a class="brand" href={resolve('/')} aria-label="Rol Errante — inicio">
      <span class="sigil" aria-hidden="true">
        <svg width="30" height="30" viewBox="0 0 64 64" fill="none">
          <defs>
            <linearGradient id="nvgg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#FFC940" />
              <stop offset="0.5" stop-color="#F8B700" />
              <stop offset="1" stop-color="#C8941A" />
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r="27.5" stroke="url(#nvgg)" stroke-width="2" />
          <circle cx="32" cy="32" r="22.5" stroke="url(#nvgg)" stroke-width="0.75" opacity="0.45" />
          <path
            d="M32 13.5 L36.2 27.8 L50.5 32 L36.2 36.2 L32 50.5 L27.8 36.2 L13.5 32 L27.8 27.8 Z"
            fill="url(#nvgg)"
          />
          <path d="M18.5 48 C 25 41, 41 26, 47 19.5" stroke="url(#nvgg)" stroke-width="2.4" stroke-linecap="round" opacity="0.85" />
          <circle cx="18.5" cy="48" r="2.5" fill="url(#nvgg)" />
          <circle cx="47" cy="19.5" r="2" fill="url(#nvgg)" />
        </svg>
      </span>
      <span class="brand-name"><span class="r">Rol</span> Errante</span>
    </a>

    <nav class="topnav" aria-label="Principal">
      <a href={resolve('/')} aria-current={active(resolve('/'))}>Inicio</a>
      <a href={resolve('/foro')} aria-current={active(resolve('/foro'))}>Foros</a>
      <a href={resolve('/personajes')} aria-current={active(resolve('/personajes'))}>Personajes</a>
      <a href={resolve('/historias')} aria-current={active(resolve('/historias'))}>Crónicas</a>
      <a href={resolve('/eventos')} aria-current={active(resolve('/eventos'))}>Eventos</a>
      {#if profile?.role !== 'pendiente'}
        <a href={resolve('/solicitudes')} aria-current={active(resolve('/solicitudes'))}>Habilidades</a>
      {/if}
      {#if isGMOrAdmin(profile?.role)}
        <a href={resolve('/gm')} aria-current={active(resolve('/gm'))}>Panel GM</a>
      {/if}
      {#if isAdmin(profile?.role)}
        <a href={resolve('/admin')} aria-current={active(resolve('/admin'))}>Admin</a>
      {/if}
    </nav>

    <div class="topnav-actions">
      {#if user}
        <NotificationBell unreadCount={unreadCount} guest={false} />
        <a href={resolve('/perfil')} class="btn btn-ghost btn-sm gap-2">
          <User size={18} />
          <span class="hidden sm:inline">{profile?.display_name ?? profile?.username ?? 'Perfil'}</span>
        </a>
        <form action="/logout" method="POST" data-sveltekit-reload>
          <button type="submit" class="btn btn-outline btn-error btn-sm">Salir</button>
        </form>
      {:else}
        <a href={resolve('/login')} class="btn btn-ghost">Iniciar sesión</a>
        <a href={resolve('/registro')} class="btn btn-primary nav-cta">Únete</a>
      {/if}
      <button
        type="button"
        class="hamburger"
        aria-label="Abrir menú"
        aria-expanded={menuOpen}
        onclick={() => (menuOpen = !menuOpen)}
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        </svg>
      </button>
    </div>
  </div>

  <nav class="mobile-menu {menuOpen ? 'open' : ''}" aria-label="Menú móvil">
    <a href={resolve('/')} onclick={closeMenu} class={active(resolve('/')) === 'page' ? 'active' : ''}>Inicio</a>
    <a href={resolve('/foro')} onclick={closeMenu} class={active(resolve('/foro')) === 'page' ? 'active' : ''}>Foros</a>
    <a href={resolve('/personajes')} onclick={closeMenu} class={active(resolve('/personajes')) === 'page' ? 'active' : ''}>Personajes</a>
    <a href={resolve('/historias')} onclick={closeMenu} class={active(resolve('/historias')) === 'page' ? 'active' : ''}>Crónicas</a>
    <a href={resolve('/eventos')} onclick={closeMenu} class={active(resolve('/eventos')) === 'page' ? 'active' : ''}>Eventos</a>
    {#if profile?.role !== 'pendiente'}
      <a href={resolve('/solicitudes')} onclick={closeMenu} class={active(resolve('/solicitudes')) === 'page' ? 'active' : ''}>Habilidades</a>
    {/if}
    {#if isGMOrAdmin(profile?.role)}
      <a href={resolve('/gm')} onclick={closeMenu} class={active(resolve('/gm')) === 'page' ? 'active' : ''}>Panel GM</a>
    {/if}
    {#if isAdmin(profile?.role)}
      <a href={resolve('/admin')} onclick={closeMenu} class={active(resolve('/admin')) === 'page' ? 'active' : ''}>Admin</a>
    {/if}
    <div class="div"></div>
    {#if user}
      <a href={resolve('/perfil')} onclick={closeMenu} class="btn btn-ghost btn-block">
        <User size={18} /> Mi perfil
      </a>
      <form action="/logout" method="POST" data-sveltekit-reload>
        <button type="submit" class="btn btn-outline btn-error btn-block mt-1">Salir</button>
      </form>
    {:else}
      <a href={resolve('/registro')} onclick={closeMenu} class="btn btn-primary btn-block">Únete a la comunidad</a>
    {/if}
  </nav>
</header>

<style>
  /* ===== CHROME: topbar replicada del sistema de diseño (landing) ===== */
  .topbar {
    position: sticky;
    top: 0;
    z-index: 120;
    height: 64px;
    background: rgba(10, 13, 20, 0.82);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--color-azeroth-border);
    display: flex;
    align-items: center;
  }
  .topbar-inner {
    width: 100%;
    max-width: 1180px;
    margin-inline: auto;
    display: flex;
    align-items: center;
    gap: 1rem;
    padding-inline: clamp(16px, 3vw, 32px);
  }
  .brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    color: var(--color-base-content);
    text-decoration: none;
    flex: none;
  }
  .brand svg {
    width: 30px;
    height: 30px;
  }
  .brand-name {
    font-family: var(--font-cinzel);
    font-weight: 700;
    font-size: 1.12rem;
    letter-spacing: 0.02em;
  }
  .brand-name .r {
    color: var(--color-azeroth-gold-bright);
  }
  .topnav {
    display: flex;
    align-items: center;
    gap: 2px;
    margin-inline: auto;
  }
  .topnav a {
    padding: 8px 12px;
    border-radius: var(--radius-sm);
    color: var(--color-azeroth-text-soft);
    font-size: 0.92rem;
    font-weight: 500;
    text-decoration: none;
    transition:
      color 0.12s,
      background 0.12s;
  }
  .topnav a:hover {
    color: var(--color-azeroth-gold-bright);
    background: rgba(255, 255, 255, 0.04);
  }
  .topnav a[aria-current='page'] {
    color: var(--color-azeroth-gold-bright);
    background: rgba(248, 183, 0, 0.08);
  }
  .topnav-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
    flex: none;
  }
  .hamburger {
    display: none;
    width: 40px;
    height: 40px;
    border: 1px solid var(--color-azeroth-border-strong);
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--color-azeroth-text-soft);
    cursor: pointer;
    align-items: center;
    justify-content: center;
  }
  .hamburger svg {
    width: 20px;
    height: 20px;
  }
  .mobile-menu {
    display: none;
  }
  .mobile-menu .div {
    margin: 8px 0;
    border-top: 1px solid var(--color-azeroth-border);
  }

  /* Botones dentro de la topbar: mismas proporciones que el landing */
  .topbar .btn {
    min-height: 40px;
    padding: 0 18px;
    border-radius: var(--radius-sm);
    font-size: 0.92rem;
    font-weight: 600;
  }
  .topbar .btn-sm {
    min-height: 34px;
    padding: 0 12px;
    font-size: 0.86rem;
  }

  @media (max-width: 900px) {
    .topnav,
    .topnav-actions .nav-cta {
      display: none;
    }
    .hamburger {
      display: inline-flex;
    }
    .mobile-menu.open {
      display: block;
      position: absolute;
      top: 64px;
      left: 0;
      right: 0;
      background: rgba(10, 13, 20, 0.98);
      border-bottom: 1px solid var(--color-azeroth-border);
      padding: 14px 18px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      box-shadow: var(--shadow-2);
    }
    .mobile-menu a {
      padding: 11px 12px;
      border-radius: var(--radius-sm);
      color: var(--color-azeroth-text-soft);
      font-weight: 500;
      text-decoration: none;
    }
    .mobile-menu a:hover {
      color: var(--color-azeroth-gold-bright);
      background: rgba(255, 255, 255, 0.04);
    }
    .mobile-menu a.active {
      color: var(--color-azeroth-gold-bright);
      background: rgba(248, 183, 0, 0.08);
    }
    /* los botones dentro del menú móvil conservan su propio estilo (DaisyUI) */
    .mobile-menu a.btn,
    .mobile-menu button.btn {
      width: 100%;
      justify-content: center;
    }
  }
</style>
