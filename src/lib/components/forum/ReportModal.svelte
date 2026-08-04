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
</script>

<button type="button" class="btn btn-ghost btn-xs text-azeroth-muted" onclick={openModal}>
  Reportar
</button>

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Reportar mensaje">
    <div class="card bg-base-200 border border-azeroth-border w-full max-w-md">
      <div class="card-body">
        <div class="flex items-center justify-between">
          <h2 class="card-title font-cinzel text-azeroth-gold text-lg">Reportar mensaje</h2>
          <button type="button" class="btn btn-ghost btn-xs" aria-label="Cerrar" onclick={() => (open = false)}>
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
          <label class="label" for="reason">Motivo</label>
          <textarea
            id="reason"
            name="reason"
            class="textarea textarea-bordered w-full"
            rows="3"
            maxlength="500"
            placeholder="Explica brevemente el motivo del reporte"
            bind:value={reason}
            required
          ></textarea>

          <div class="mt-4 flex justify-end">
            <button type="submit" class="btn btn-error btn-sm" disabled={pending || reason.trim().length === 0}>
              Enviar reporte
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}
