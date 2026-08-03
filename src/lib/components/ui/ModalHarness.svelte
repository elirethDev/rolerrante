<script lang="ts">
  import Modal from './Modal.svelte';

  interface Props {
    open?: boolean;
    title?: string;
    closeLabel?: string;
    class?: string;
  }

  let { open = false, title = 'Cerrar hilo', closeLabel, class: className }: Props = $props();
</script>

<Modal bind:open {title} {closeLabel} class={className}>
  <p>¿Confirmás el cierre del hilo?</p>
  {#snippet footer()}
    <button type="button">Cancelar</button>
    <button type="button">Confirmar</button>
  {/snippet}
</Modal>
