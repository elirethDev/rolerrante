<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { Shield } from '@lucide/svelte';
</script>

<svelte:head>
  <title>Error — RolErrante</title>
</svelte:head>

<section class="error-screen">
  <div class="err-inner w-full max-w-lg px-6 text-center">
    <span class="err-emblem" aria-hidden="true"><Shield size={30} /></span>
    <h1 class="error-code">{page.status}</h1>
    <p class="err-title">
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
    <p class="err-sub">{page.error?.message ?? 'Algo salió mal.'}</p>
    <div class="err-actions">
      <a href={resolve('/')} class="btn btn-primary btn-lg font-cinzel">Volver al inicio</a>
      <a href={resolve('/foro')} class="btn btn-ghost btn-lg font-cinzel">Ir a los foros</a>
    </div>
  </div>
</section>
