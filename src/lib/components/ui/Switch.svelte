<script lang="ts">
  interface Props {
    checked?: boolean;
    label?: string;
    name?: string;
    disabled?: boolean;
    'aria-label'?: string;
    class?: string;
  }

  let {
    checked = $bindable(false),
    label,
    name,
    disabled = false,
    'aria-label': ariaLabel,
    class: className = '',
  }: Props = $props();
</script>

<label class="inline-flex cursor-pointer select-none items-center gap-2.5 text-sm text-azeroth-text-soft {className}">
  <input
    type="checkbox"
    role="switch"
    {name}
    aria-label={ariaLabel}
    {disabled}
    bind:checked
    class="peer sr-only"
  />
  <span
    aria-hidden="true"
    class="relative inline-flex h-[22px] w-10 shrink-0 rounded-full border border-azeroth-border-strong bg-azeroth-surface-3 transition peer-focus-visible:[box-shadow:var(--focus-ring)] {checked
      ? 'border-azeroth-gold bg-linear-to-b from-azeroth-gold-bright to-azeroth-gold'
      : ''}"
  >
    <span
      class="{checked ? 'translate-x-[18px] bg-[#1A1508]' : 'translate-x-0 bg-azeroth-muted'} absolute left-0.5 top-0.5 h-4 w-4 rounded-full transition"
    ></span>
  </span>
  {#if label}
    <span>{label}</span>
  {/if}
</label>
