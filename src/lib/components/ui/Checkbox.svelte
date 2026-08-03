<script lang="ts">
  import { Check } from '@lucide/svelte';

  interface Props {
    checked?: boolean;
    label: string;
    name?: string;
    value?: string;
    disabled?: boolean;
    class?: string;
  }

  let {
    checked = $bindable(false),
    label,
    name,
    value,
    disabled = false,
    class: className = '',
  }: Props = $props();
</script>

<label class="inline-flex cursor-pointer select-none items-center gap-2 text-sm text-azeroth-text-soft {className}">
  <input type="checkbox" {name} {value} {disabled} bind:checked class="peer sr-only" />
  <span
    aria-hidden="true"
    class="relative inline-flex h-[17px] w-[17px] shrink-0 rounded-[5px] border border-azeroth-border-strong bg-azeroth-sunken transition peer-focus-visible:[box-shadow:var(--focus-ring)] {checked
      ? 'border-azeroth-gold bg-linear-to-b from-azeroth-gold-bright to-azeroth-gold'
      : ''}"
  >
    {#if checked}
      <Check size={12} strokeWidth={3} class="absolute inset-0 m-auto text-[#1A1508]" />
    {/if}
  </span>
  {label}
</label>
