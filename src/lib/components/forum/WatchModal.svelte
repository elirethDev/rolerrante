<script lang="ts">
  import { onMount } from 'svelte';

  let {
    open = false,
    following = false,
    notifyInApp = false,
    guest = false,
    onClose = () => {},
  }: {
    open?: boolean;
    following?: boolean;
    notifyInApp?: boolean;
    guest?: boolean;
    onClose?: () => void;
  } = $props();

  // The in-app toggle lives INSIDE the ?/preference form and carries its own
  // name="notify_in_app" value="on", so the browser submits "on" when checked
  // and nothing when unchecked. checked={notifyInApp} seeds it from the loader;
  // the user's DOM toggle is what gets posted (no stale hidden input).
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }

  onMount(() => {
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  });
</script>

{#if !guest && open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4"
    role="dialog"
    aria-modal="true"
    aria-label="Seguir hilo"
  >
    <button class="absolute inset-0 bg-black/60" aria-label="Cerrar" onclick={onClose}></button>
    <div class="relative card w-full max-w-sm bg-base-100 border border-azeroth-border p-6 shadow-xl">
      <h2 class="card-title font-cinzel text-lg mb-2">Seguir hilo</h2>
      <p class="text-sm text-gray-400 mb-4">
        Recibí una notificación dentro de la app cuando haya respuestas nuevas a este hilo.
      </p>

      {#if following}
        <form method="POST" action="?/unfollow">
          <button type="submit" class="btn btn-outline w-full" data-testid="unfollow-btn">
            Dejar de seguir
          </button>
        </form>

        <form method="POST" action="?/preference" class="mt-4">
          <label class="label flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              name="notify_in_app"
              value="on"
              checked={notifyInApp}
              data-testid="notify-toggle"
              class="checkbox checkbox-sm"
            />
            <span class="text-sm">Notificarme en la app</span>
          </label>
          <button type="submit" class="btn btn-ghost btn-sm" data-testid="save-pref">
            Guardar preferencia
          </button>
        </form>
      {:else}
        <form method="POST" action="?/follow">
          <button type="submit" class="btn btn-primary w-full" data-testid="follow-btn">
            Seguir
          </button>
        </form>
      {/if}

      <button type="button" class="btn btn-ghost btn-sm mt-2 w-full" onclick={onClose}>
        Cancelar
      </button>
    </div>
  </div>
{/if}
