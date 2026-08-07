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
  <div class="modal open" role="dialog" aria-modal="true" aria-label="Seguir hilo">
    <div class="modal-backdrop" aria-hidden="true" onclick={onClose}></div>
    <div class="modal-panel">
      <div class="modal-head">
        <div>
          <h3>Seguir hilo</h3>
          <p class="muted" style="margin:6px 0 0;font-size:.9rem">
            Recibí una notificación dentro de la app cuando haya respuestas nuevas a este hilo.
          </p>
        </div>
        <button type="button" class="modal-x" aria-label="Cerrar" onclick={onClose}>✕</button>
      </div>

      {#if following}
        <form method="POST" action="?/unfollow">
          <button type="submit" class="btn btn-secondary btn-block" data-testid="unfollow-btn">
            Dejar de seguir
          </button>
        </form>

        <form method="POST" action="?/preference" class="mt-4 stack" style="gap:12px">
          <label class="check">
            <input
              type="checkbox"
              name="notify_in_app"
              value="on"
              checked={notifyInApp}
              data-testid="notify-toggle"
            />
            <span>Notificarme en la app</span>
          </label>
          <button type="submit" class="btn btn-ghost btn-sm" data-testid="save-pref">
            Guardar preferencia
          </button>
        </form>
      {:else}
        <form method="POST" action="?/follow">
          <button type="submit" class="btn btn-primary btn-block" data-testid="follow-btn">
            Seguir
          </button>
        </form>
      {/if}

      <div class="modal-foot">
        <button type="button" class="btn btn-ghost" onclick={onClose}>Cancelar</button>
      </div>
    </div>
  </div>
{/if}