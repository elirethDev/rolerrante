<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    class?: string;
    children: Snippet;
  }

  let { class: className = '', children }: Props = $props();
</script>

<div class="flex items-center -space-x-2.5 {className}">
  {@render children()}
</div>
