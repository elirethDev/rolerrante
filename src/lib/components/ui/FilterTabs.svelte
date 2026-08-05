<script lang="ts">
  interface TabItem {
    value: string;
    label: string;
    count?: number;
  }

  interface Props {
    tabs: TabItem[];
    value: string;
    onchange?: (value: string) => void;
    class?: string;
    ariaLabel?: string;
  }

  let {
    tabs,
    value,
    onchange,
    class: className = '',
    ariaLabel = 'Filtrar',
  }: Props = $props();
</script>

<div class="tabs {className}" role="tablist" aria-label={ariaLabel}>
  {#each tabs as tab (tab.value)}
    <button
      type="button"
      class="tab {tab.value === value ? 'on' : ''}"
      aria-selected={tab.value === value}
      role="tab"
      onclick={() => onchange?.(tab.value)}
    >
      {tab.label}
      {#if tab.count !== undefined}
        <span class="count">{tab.count}</span>
      {/if}
    </button>
  {/each}
</div>
