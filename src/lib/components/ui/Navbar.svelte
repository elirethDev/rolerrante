<script lang="ts">
  import { Menu, User } from 'lucide-svelte';
  import type { User as SupabaseUser } from '@supabase/supabase-js';
  import type { Profile } from '$lib/types';
  import { isGMOrAdmin, isAdmin } from '$lib/auth';

  let { user, profile }: { user: SupabaseUser | null; profile: Profile | null } = $props();

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
            <li><a href="/personajes" onclick={() => (menuOpen = false)}>Fichas</a></li>
            <li><a href="/historias" onclick={() => (menuOpen = false)}>Historias</a></li>
            <li><a href="/eventos" onclick={() => (menuOpen = false)}>Eventos</a></li>
            {#if profile?.role !== 'pendiente'}
              <li><a href="/solicitudes" onclick={() => (menuOpen = false)}>Habilidades</a></li>
            {/if}
            {#if isGMOrAdmin(profile?.role)}
              <li><a href="/gm" onclick={() => (menuOpen = false)}>Panel GM</a></li>
            {/if}
            {#if isAdmin(profile?.role)}
              <li><a href="/admin" onclick={() => (menuOpen = false)}>Admin</a></li>
            {/if}
          </ul>
        {/if}
      </div>
    {/if}
    <a href="/" class="btn btn-ghost text-xl font-cinzel text-azeroth-gold">RolErrante</a>
  </div>
  <div class="navbar-center hidden lg:flex gap-2">
    {#if user}
      <a href="/personajes" class="btn btn-ghost btn-sm">Fichas</a>
      <a href="/historias" class="btn btn-ghost btn-sm">Historias</a>
      <a href="/eventos" class="btn btn-ghost btn-sm">Eventos</a>
      {#if profile?.role !== 'pendiente'}
        <a href="/solicitudes" class="btn btn-ghost btn-sm">Habilidades</a>
      {/if}
      {#if isGMOrAdmin(profile?.role)}
        <a href="/gm" class="btn btn-primary btn-sm">Panel GM</a>
      {/if}
      {#if isAdmin(profile?.role)}
        <a href="/admin" class="btn btn-error btn-sm">Admin</a>
      {/if}
    {/if}
  </div>
  <div class="navbar-end gap-2">
    {#if user}
      <a href="/perfil" class="btn btn-ghost btn-sm gap-2">
        <User size={18} />
        <span class="hidden sm:inline">{profile?.display_name ?? profile?.username ?? 'Perfil'}</span>
      </a>
      <form action="/logout" method="POST" data-sveltekit-reload>
        <button type="submit" class="btn btn-outline btn-error btn-sm">Salir</button>
      </form>
    {:else}
      <a href="/login" class="btn btn-ghost btn-sm">Entrar</a>
      <a href="/registro" class="btn btn-primary btn-sm">Registrarse</a>
    {/if}
  </div>
</nav>
