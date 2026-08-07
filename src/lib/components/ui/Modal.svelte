<script lang="ts">
  import { X } from '@lucide/svelte';
  import { tick } from 'svelte';
  import type { Snippet } from 'svelte';

  interface Props {
    open?: boolean;
    title: string;
    closeLabel?: string;
    class?: string;
    children: Snippet;
    footer?: Snippet;
  }

  let {
    open = $bindable(false),
    title,
    closeLabel = 'Cerrar',
    class: className = '',
    children,
    footer,
  }: Props = $props();

  let panel = $state<HTMLElement | null>(null);
  let previouslyFocused: HTMLElement | null = null;

  function trapFocus(event: KeyboardEvent) {
    const focusables = panel
      ? Array.from(
          panel.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
          ),
        )
      : [];
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function close() {
    if (open) {
      open = false;
      previouslyFocused?.focus?.();
    }
  }

  $effect(() => {
    if (!open) return;

    previouslyFocused = document.activeElement as HTMLElement | null;
    void tick().then(() => panel?.focus());

    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      } else if (event.key === 'Tab') {
        trapFocus(event);
      }
    };
    document.addEventListener('keydown', onKeydown);
    return () => document.removeEventListener('keydown', onKeydown);
  });
</script>

{#if open}
  <div class="modal open">
    <div class="modal-backdrop" onclick={close} aria-hidden="true"></div>
    <div
      bind:this={panel}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      tabindex="-1"
      class="modal-panel {className}"
    >
      <div class="modal-head">
        <h3>{title}</h3>
        <button
          type="button"
          class="modal-x"
          onclick={close}
          aria-label={closeLabel}
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      {@render children()}
      {#if footer}
        <div class="modal-foot">
          {@render footer()}
        </div>
      {/if}
    </div>
  </div>
{/if}