<script lang="ts">
  type Size = 'sm' | 'md' | 'lg' | 'xl';

  interface Props {
    src?: string | null;
    name?: string;
    size?: Size;
    ring?: boolean;
    staff?: boolean;
    alt?: string;
    class?: string;
  }

  let {
    src = null,
    name = '',
    size = 'md',
    ring = false,
    staff = false,
    alt,
    class: className = '',
  }: Props = $props();

  const initial = $derived((name || alt || '?').trim().charAt(0).toUpperCase() || '?');

  const sizes: Record<Size, string> = {
    sm: 'h-[30px] w-[30px] text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-xl',
    xl: 'h-[92px] w-[92px] text-3xl',
  };
</script>

<span
  class="relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full border border-azeroth-border-strong bg-linear-to-br from-azeroth-surface-3 to-azeroth-navy font-cinzel font-bold text-azeroth-gold-soft {sizes[size]} {ring
    ? 'border-azeroth-gold-dim shadow-[0_0_0_2px_rgba(248,183,0,0.16),0_8px_20px_-12px_rgba(248,183,0,0.5)]'
    : ''} {className}"
>
  {#if src}
    <img src={src} alt={alt ?? name ?? ''} class="h-full w-full object-cover" />
  {:else}
    {initial}
  {/if}
  {#if staff}
    <span
      class="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-azeroth-gold-dim bg-azeroth-bg text-[10px] leading-none text-azeroth-gold-bright"
      aria-hidden="true"
      >✦</span
    >
  {/if}
</span>
