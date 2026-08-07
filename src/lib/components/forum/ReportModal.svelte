<script lang="ts">
  import { enhance } from '$app/forms';
  import { X } from '@lucide/svelte';

  let { postId }: { postId: string } = $props();

  let open = $state(false);
  let reason = $state('');
  let pending = $state(false);

  function openModal() {
    reason = '';
    open = true;
  }

  function closeModal() {
    open = false;
  }
</script>

<button type="button" class="danger" onclick={openModal}>
  Reportar
</button>

{#if open}
  <div class="modal open" role="dialog" aria-modal="true" aria-label="Reportar mensaje">
    <div class="modal-backdrop" aria-hidden="true" onclick={closeModal}></div>
    <div class="modal-panel">
      <div class="modal-head">
        <div>
          <h3>Reportar mensaje</h3>
          <p class="muted" style="margin:6px 0 0;font-size:.9rem">El equipo de moderación revisa cada reporte.</p>
        </div>
        <button type="button" class="modal-x" aria-label="Cerrar" onclick={closeModal}>
          <X size={18} />
        </button>
      </div>

      <form
        data-testid="report-form"
        method="POST"
        action="?/report"
        use:enhance={() => {
          pending = true;
          return async ({ update }) => {
            pending = false;
            await update();
          };
        }}
      >
        <input type="hidden" name="post_id" value={postId} />
        <div class="field">
          <label for="reason">Motivo</label>
          <textarea
            id="reason"
            name="reason"
            class="textarea"
            rows="3"
            maxlength="500"
            placeholder="Explica brevemente el motivo del reporte"
            bind:value={reason}
            required
          ></textarea>
        </div>

        <div class="modal-foot">
          <button type="submit" class="btn btn-danger" disabled={pending || reason.trim().length === 0}>
            Enviar reporte
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}