<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    pending?: boolean;
    disabled?: boolean;
    class?: string;
    children: Snippet;
  }

  let { pending = false, disabled = false, class: className = '', children }: Props = $props();
</script>

<button
  type="submit"
  class="btn btn-primary {className}"
  disabled={pending || disabled}
  aria-busy={pending}
>
  {#if pending}
    <span class="loading loading-spinner loading-sm"></span>
  {/if}
  {@render children()}
</button>