<script lang="ts">
  import { ChevronDown } from '@lucide/svelte';
  import type { Snippet } from 'svelte';

  interface Props {
    value?: string;
    name?: string;
    id?: string;
    required?: boolean;
    disabled?: boolean;
    invalid?: boolean;
    'aria-label'?: string;
    'aria-describedby'?: string;
    class?: string;
    children: Snippet;
  }

  let {
    value = $bindable(''),
    name,
    id,
    required = false,
    disabled = false,
    invalid = false,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    class: className = '',
    children,
  }: Props = $props();
</script>

<div class="relative">
  <select
    {name}
    {id}
    aria-label={ariaLabel}
    aria-describedby={ariaDescribedBy}
    {required}
    {disabled}
    bind:value
    aria-invalid={invalid || undefined}
    class="azeroth-focus min-h-10 w-full appearance-none rounded-lg border border-azeroth-border bg-azeroth-sunken py-2.5 pl-3 pr-9 font-sans text-sm text-base-content transition {invalid
      ? 'border-azeroth-danger bg-[rgba(170,36,9,0.06)]'
      : ''} {className}"
  >
    {@render children()}
  </select>
  <ChevronDown
    size={16}
    class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-azeroth-gold-dim"
    aria-hidden="true"
  />
</div>
