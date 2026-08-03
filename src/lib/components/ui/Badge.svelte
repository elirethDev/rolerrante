<script lang="ts">
  import type { Snippet } from 'svelte';

  type Variant = 'gold' | 'danger' | 'success' | 'blue' | 'soft' | 'neutral';

  interface Props {
    variant?: Variant;
    dot?: boolean;
    class?: string;
    children: Snippet;
  }

  let { variant = 'gold', dot = true, class: className = '', children }: Props = $props();

  const variants: Record<Variant, string> = {
    gold: 'border-[rgba(200,148,26,0.35)] bg-[rgba(248,183,0,0.1)] text-azeroth-gold-bright',
    danger:
      'border-[rgba(170,36,9,0.45)] bg-[rgba(170,36,9,0.14)] text-azeroth-danger-fg',
    success:
      'border-[rgba(60,115,86,0.4)] bg-[rgba(60,115,86,0.15)] text-azeroth-success-fg',
    blue: 'border-[rgba(14,134,202,0.35)] bg-[rgba(14,134,202,0.12)] text-[#7FB0E8]',
    soft: 'border-[rgba(235,226,194,0.22)] bg-[rgba(235,226,194,0.07)] text-azeroth-cream',
    neutral: 'border-azeroth-border-strong bg-white/[3%] text-azeroth-muted',
  };
</script>

<span
  class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[0.72rem] font-bold uppercase leading-[1.5] tracking-[0.06em] {variants[variant]} {className}"
>
  {#if dot}
    <span class="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true"></span>
  {/if}
  {@render children()}
</span>
