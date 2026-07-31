<script lang="ts">
  import { User } from 'lucide-svelte';
  import type { User as SupabaseUser } from '@supabase/supabase-js';
  import type { Profile } from '$lib/types';
  import { isGMOrAdmin, isAdmin } from '$lib/auth';

  export let user: SupabaseUser | null;
  export let profile: Profile | null;
</script>

<nav class="navbar bg-base-200 border-b border-azeroth-border sticky top-0 z-50">
  <div class="navbar-start">
    <a href="/" class="btn btn-ghost text-xl font-cinzel text-azeroth-gold">RolErrante</a>
  </div>
  <div class="navbar-center hidden lg:flex gap-2">
    {#if user}
      <a href="/personajes" class="btn btn-ghost btn-sm">Fichas</a>
      <a href="/historias" class="btn btn-ghost btn-sm">Historias</a>
      <a href="/eventos" class="btn btn-ghost btn-sm">Eventos</a>
      {#if profile.role !== 'pendiente'}
        <a href="/solicitudes" class="btn btn-ghost btn-sm">Habilidades</a>
      {/if}
      {#if isGMOrAdmin(profile.role)}
        <a href="/gm" class="btn btn-primary btn-sm">Panel GM</a>
      {/if}
      {#if isAdmin(profile.role)}
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
