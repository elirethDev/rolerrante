<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { Shield } from '@lucide/svelte';
</script>

<svelte:head>
  <title>Error — RolErrante</title>
</svelte:head>

<section class="error-screen">
  <div class="relative z-10 w-full max-w-lg text-center">
    <div class="mb-6 flex justify-center" aria-hidden="true">
      <span class="flex h-20 w-20 items-center justify-center rounded-full border border-azeroth-gold-dim bg-azeroth-sunken text-azeroth-gold shadow-[0_0_44px_-8px_rgba(248,183,0,0.55)]">
        <Shield size={36} />
      </span>
    </div>
    <h1 class="error-code">{page.status}</h1>
    <p class="text-xl text-azeroth-text-soft mb-2">
      {#if page.status === 404}
        Página no encontrada
      {:else if page.status === 403}
        Acceso denegado
      {:else if page.status === 429}
        Demasiadas solicitudes
      {:else}
        Error del servidor
      {/if}
    </p>
    <p class="text-azeroth-muted mb-8">{page.error?.message ?? 'Algo salió mal.'}</p>
    <div class="flex flex-wrap items-center justify-center gap-3">
      <a href={resolve('/')} class="btn btn-primary btn-lg font-cinzel">Volver al inicio</a>
      <a href={resolve('/foro')} class="btn btn-ghost btn-lg font-cinzel">Ir a los foros</a>
    </div>
  </div>
</section>