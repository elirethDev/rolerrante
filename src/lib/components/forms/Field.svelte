<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    label: string;
    hint?: string | null;
    error?: string | null;
    required?: boolean;
    size?: 'sm' | 'md' | 'lg';
    class?: string;
    ctrl: Snippet;
  }

  let {
    label,
    hint = null,
    error = null,
    required = false,
    size = 'md',
    class: className = '',
    ctrl,
  }: Props = $props();

  const uid = $state(
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10),
  );
  const hintId = $derived(`field-hint-${uid}`);
  const errorId = $derived(`field-error-${uid}`);
  const describedBy = $derived(error ? errorId : hint ? hintId : '');

  const sizeClass = $derived(size === 'sm' ? 'fieldset-sm' : size === 'lg' ? 'fieldset-lg' : '');
  const legendClass = $derived(size === 'sm' ? 'text-[13px]' : '');
</script>

<fieldset class="fieldset {sizeClass} {className}" aria-describedby={describedBy || undefined}>
  <legend class="fieldset-legend {legendClass}">
    {label}{#if required} <span class="text-error">*</span>{/if}
  </legend>
  {@render ctrl()}
  {#if hint && !error}
    <span id={hintId} class="fieldset-label text-gray-400">{hint}</span>
  {/if}
  {#if error}
    <span id={errorId} class="fieldset-label text-error" role="alert">{error}</span>
  {/if}
</fieldset>
