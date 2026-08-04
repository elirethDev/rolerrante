<script lang="ts">
  import { Menu, User } from '@lucide/svelte';
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
</script>

<nav class="navbar bg-base-200 border-b border-azeroth-border sticky top-0 z-50">
  <div class="navbar-start">
    {#if user}
      <div class="dropdown dropdown-end lg:hidden mr-1">
        <button
          type="button"
          class="btn btn-ghost btn-square"
          aria-label="Abrir menú"
          aria-expanded={menuOpen}
          onclick={() => (menuOpen = !menuOpen)}
        >
          <Menu size={20} />
        </button>
        {#if menuOpen}
          <ul class="menu dropdown-content bg-base-200 rounded-box z-[1] mt-3 w-56 p-2 shadow border border-azeroth-border">
            <li><a href={resolve('/personajes')} onclick={() => (menuOpen = false)}>Fichas</a></li>
            <li><a href={resolve('/historias')} onclick={() => (menuOpen = false)}>Historias</a></li>
            <li><a href={resolve('/eventos')} onclick={() => (menuOpen = false)}>Eventos</a></li>
            {#if profile?.role !== 'pendiente'}
              <li><a href={resolve('/solicitudes')} onclick={() => (menuOpen = false)}>Habilidades</a></li>
            {/if}
            {#if isGMOrAdmin(profile?.role)}
              <li><a href={resolve('/gm')} onclick={() => (menuOpen = false)}>Panel GM</a></li>
            {/if}
            {#if isAdmin(profile?.role)}
              <li><a href={resolve('/admin')} onclick={() => (menuOpen = false)}>Admin</a></li>
            {/if}
          </ul>
        {/if}
      </div>
    {/if}
    <a href={resolve('/')} class="btn btn-ghost gap-2 px-2 text-xl font-cinzel text-azeroth-gold"><span class="text-azeroth-gold-bright"><svg width="26" height="26" viewBox="0 0 64 64" fill="none" aria-hidden="true"><defs><linearGradient id="nvgg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFC940"/><stop offset="0.5" stop-color="#F8B700"/><stop offset="1" stop-color="#C8941A"/></linearGradient></defs><circle cx="32" cy="32" r="27.5" stroke="url(#nvgg)" stroke-width="2"/><circle cx="32" cy="32" r="22.5" stroke="url(#nvgg)" stroke-width="0.75" opacity="0.45"/><path d="M32 13.5 L36.2 27.8 L50.5 32 L36.2 36.2 L32 50.5 L27.8 36.2 L13.5 32 L27.8 27.8 Z" fill="url(#nvgg)"/><path d="M18.5 48 C 25 41, 41 26, 47 19.5" stroke="url(#nvgg)" stroke-width="2.4" stroke-linecap="round" opacity="0.85"/><circle cx="18.5" cy="48" r="2.5" fill="url(#nvgg)"/><circle cx="47" cy="19.5" r="2" fill="url(#nvgg)"/></svg></span><span><span class="text-azeroth-gold-bright">Rol</span> Errante</span></a>
  </div>
  <div class="navbar-center hidden lg:flex gap-2">
    {#if user}
      <a href={resolve('/personajes')} class="btn btn-ghost btn-sm" aria-current={page.url.pathname.startsWith('/personajes') ? 'page' : undefined}>Fichas</a>
      <a href={resolve('/historias')} class="btn btn-ghost btn-sm" aria-current={page.url.pathname.startsWith('/historias') ? 'page' : undefined}>Historias</a>
      <a href={resolve('/eventos')} class="btn btn-ghost btn-sm" aria-current={page.url.pathname.startsWith('/eventos') ? 'page' : undefined}>Eventos</a>
      {#if profile?.role !== 'pendiente'}
        <a href={resolve('/solicitudes')} class="btn btn-ghost btn-sm" aria-current={page.url.pathname.startsWith('/solicitudes') ? 'page' : undefined}>Habilidades</a>
      {/if}
      {#if isGMOrAdmin(profile?.role)}
        <a href={resolve('/gm')} class="btn btn-primary btn-sm" aria-current={page.url.pathname.startsWith('/gm') ? 'page' : undefined}>Panel GM</a>
      {/if}
      {#if isAdmin(profile?.role)}
        <a href={resolve('/admin')} class="btn btn-error btn-sm" aria-current={page.url.pathname.startsWith('/admin') ? 'page' : undefined}>Admin</a>
      {/if}
    {/if}
  </div>
  <div class="navbar-end gap-2">
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
      <a href={resolve('/login')} class="btn btn-ghost btn-sm">Entrar</a>
      <a href={resolve('/registro')} class="btn btn-primary btn-sm">Registrarse</a>
    {/if}
  </div>
</nav>
