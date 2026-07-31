<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    variant = 'primary',
    size = 'md',
    type = 'button',
    disabled = false,
    onclick,
    children,
  }: {
    variant?: 'primary' | 'ghost' | 'error';
    size?: 'xs' | 'sm' | 'md' | 'lg';
    type?: 'button' | 'submit';
    disabled?: boolean;
    onclick?: () => void;
    children: Snippet;
  } = $props();

  const variantClass = $derived({
    primary: 'btn-primary',
    ghost: 'btn-ghost',
    error: 'btn-error',
  }[variant]);

  const sizeClass = $derived(size !== 'md' ? `btn-${size}` : '');
</script>

<button {type} class="btn {variantClass} {sizeClass}" {disabled} {onclick}>
  {@render children()}
</button>