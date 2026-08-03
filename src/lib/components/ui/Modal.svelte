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

  let panel: HTMLElement;
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
  <div class="fixed inset-0 z-[300] flex items-center justify-center p-5">
    <div
      class="absolute inset-0 bg-[rgba(5,7,12,0.72)] backdrop-blur-[4px]"
      onclick={close}
      aria-hidden="true"
    ></div>
    <div
      bind:this={panel}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      tabindex="-1"
      class="modal-panel-gold relative max-h-[86vh] w-full overflow-auto rounded-2xl border border-azeroth-border-strong bg-linear-to-b from-azeroth-surface-2 to-azeroth-surface p-[26px] shadow-[var(--shadow-2)] {className}"
    >
      <header class="mb-4 flex items-start justify-between gap-3">
        <h3 class="font-cinzel text-xl font-semibold text-base-content">{title}</h3>
        <button
          type="button"
          class="azeroth-focus inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg border border-azeroth-border-strong bg-transparent text-azeroth-muted hover:border-azeroth-gold-dim hover:text-azeroth-gold-bright"
          onclick={close}
          aria-label={closeLabel}
        >
          <X size={18} aria-hidden="true" />
        </button>
      </header>
      {@render children()}
      {#if footer}
        <footer class="mt-5 flex justify-end gap-2.5">
          {@render footer()}
        </footer>
      {/if}
    </div>
  </div>
{/if}

<style>
  .modal-panel-gold::before {
    content: '';
    position: absolute;
    inset-inline: 0;
    top: 0;
    height: 2px;
    background: var(--gold-hairline);
  }
</style>
