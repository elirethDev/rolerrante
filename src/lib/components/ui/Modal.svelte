<script lang="ts">
  import { X } from 'lucide-svelte';
  import type { Snippet } from 'svelte';

  let { open, title, children, onclose }: {
    open: boolean;
    title?: string;
    children: Snippet;
    onclose?: () => void;
  } = $props();
</script>

<dialog class="modal" class:modal-open={open}>
  <div class="modal-box">
    {#if title}
      <h3 class="text-lg font-cinzel text-azeroth-gold">{title}</h3>
    {/if}
    {@render children()}
    <div class="modal-action">
      <button class="btn btn-ghost btn-sm" onclick={() => onclose?.()}>
        <X size={18} />
      </button>
    </div>
  </div>
</dialog>