<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { Shield } from '@lucide/svelte';
</script>

<svelte:head>
  <title>Error — RolErrante</title>
</svelte:head>

<section class="max-w-lg mx-auto text-center py-20">
  <div class="flex justify-center mb-6">
    <Shield size={64} class="text-azeroth-gold" />
  </div>
  <h1 class="text-6xl font-cinzel text-azeroth-gold mb-4">{page.status}</h1>
  <p class="text-xl text-gray-300 mb-2">
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
  <p class="text-gray-400 mb-8">{page.error?.message ?? 'Algo salió mal.'}</p>
  <a href={resolve('/')} class="btn btn-primary font-cinzel">Volver al inicio</a>
</section>