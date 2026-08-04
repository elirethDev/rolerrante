<script lang="ts">
  import { dismiss, toasts } from './toast';
  import Toast from './Toast.svelte';
</script>

<div
  class="fixed bottom-4 right-4 z-[400] flex max-w-[360px] flex-col items-stretch gap-2.5"
  role="status"
  aria-live="polite"
>
  {#each $toasts as item (item.id)}
    <Toast kind={item.kind} message={item.message} onClose={() => dismiss(item.id)} />
  {/each}
</div>
