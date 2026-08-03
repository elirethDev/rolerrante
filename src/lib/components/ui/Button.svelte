<script lang="ts">
  import type { Component, Snippet } from 'svelte';

  type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
  type Size = 'sm' | 'md' | 'lg';

  interface Props {
    variant?: Variant;
    size?: Size;
    type?: 'button' | 'submit';
    href?: string;
    disabled?: boolean;
    block?: boolean;
    icon?: Component;
    class?: string;
    children: Snippet;
  }

  let {
    variant = 'primary',
    size = 'md',
    type = 'button',
    href,
    disabled = false,
    block = false,
    icon,
    class: className = '',
    children,
  }: Props = $props();

  const base =
    'azeroth-focus inline-flex cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap font-medium transition hover:-translate-y-px active:translate-y-0 disabled:pointer-events-none disabled:opacity-45';

  const variants: Record<Variant, string> = {
    primary:
      'border border-transparent bg-linear-to-b from-azeroth-gold-bright to-azeroth-gold text-[#1A1508] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_8px_22px_-10px_rgba(248,183,0,0.55)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_12px_30px_-10px_rgba(248,183,0,0.7)]',
    secondary:
      'border border-azeroth-border-strong bg-linear-to-b from-azeroth-surface-3 to-azeroth-surface text-base-content shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-azeroth-gold-dim hover:text-azeroth-gold-soft',
    ghost:
      'border border-transparent bg-transparent text-azeroth-text-soft hover:bg-white/[4%] hover:text-azeroth-gold-bright',
    danger:
      'border border-transparent bg-linear-to-b from-[#c43a1f] to-[#a52d15] text-[#FFF4EC] shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_8px_20px_-12px_rgba(170,36,9,0.7)] hover:brightness-105',
    link: 'h-auto min-h-0 border-0 px-2 py-1.5 text-azeroth-link shadow-none hover:text-azeroth-gold-bright',
  };

  const sizes: Record<Size, string> = {
    sm: 'min-h-8 rounded-md px-3 text-[0.82rem]',
    md: 'min-h-10 rounded-lg px-4 text-sm',
    lg: 'min-h-12 rounded-xl px-6 text-base',
  };

  function handleClick(e: MouseEvent) {
    if (disabled) e.preventDefault();
  }
</script>

{#if href}
  <a
    href={href}
    class="{base} {variants[variant]} {sizes[size]} {block ? 'w-full' : ''} {className}"
    aria-disabled={disabled || undefined}
    onclick={handleClick}
  >
    {#if icon}
      {@const Icon = icon}
      <Icon size={18} class="shrink-0" aria-hidden="true" />
    {/if}
    {@render children()}
  </a>
{:else}
  <button
    {type}
    {disabled}
    class="{base} {variants[variant]} {sizes[size]} {block ? 'w-full' : ''} {className}"
  >
    {#if icon}
      {@const Icon = icon}
      <Icon size={18} class="shrink-0" aria-hidden="true" />
    {/if}
    {@render children()}
  </button>
{/if}
