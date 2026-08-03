<script lang="ts">
  import { CircleAlert, CircleCheck, Sparkles, X } from '@lucide/svelte';

  type Kind = 'success' | 'danger' | 'gold';

  interface Props {
    kind?: Kind;
    message: string;
    onClose?: () => void;
  }

  let { kind = 'gold', message, onClose }: Props = $props();

  const border: Record<Kind, string> = {
    success: 'border-[rgba(60,115,86,0.5)]',
    danger: 'border-[rgba(170,36,9,0.5)]',
    gold: 'border-[rgba(200,148,26,0.5)]',
  };
</script>

<div
  class="animate-[toast-in_0.22s_ease-out] flex items-start gap-3 rounded-xl border bg-linear-to-b from-azeroth-surface-3 to-azeroth-surface px-4 py-3.5 text-sm text-base-content shadow-[var(--shadow-2)] {border[kind]}"
>
  {#if kind === 'success'}
    <CircleCheck size={20} class="mt-0.5 shrink-0 text-azeroth-success-fg" aria-hidden="true" />
  {:else if kind === 'danger'}
    <CircleAlert size={20} class="mt-0.5 shrink-0 text-azeroth-danger-fg" aria-hidden="true" />
  {:else}
    <Sparkles size={20} class="mt-0.5 shrink-0 text-azeroth-gold-bright" aria-hidden="true" />
  {/if}
  <div class="flex-1">{message}</div>
  {#if onClose}
    <button
      type="button"
      class="azeroth-focus -m-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-azeroth-muted hover:text-azeroth-gold-bright"
      onclick={onClose}
      aria-label="Cerrar notificación"
    >
      <X size={14} aria-hidden="true" />
    </button>
  {/if}
</div>
