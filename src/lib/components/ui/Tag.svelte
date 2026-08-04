<script lang="ts">
  import type { Snippet } from 'svelte';

  type Variant = 'default' | 'gold' | 'blue';

  interface Props {
    variant?: Variant;
    class?: string;
    children: Snippet;
  }

  let { variant = 'default', class: className = '', children }: Props = $props();

  const variants: Record<Variant, string> = {
    default: 'border-azeroth-border bg-azeroth-sunken text-azeroth-text-soft',
    gold: 'border-[rgba(200,148,26,0.4)] bg-azeroth-sunken text-azeroth-gold-soft',
    blue: 'border-[rgba(14,134,202,0.4)] bg-azeroth-sunken text-[#8FC7EC]',
  };
</script>

<span
  class="inline-flex items-center rounded-md border px-2.5 py-0.5 text-[0.78rem] font-medium {variants[variant]} {className}"
>
  {@render children()}
</span>
