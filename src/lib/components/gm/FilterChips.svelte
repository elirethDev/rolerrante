<script lang="ts">
  import { applyFilter } from './filter';
  import { FILTER_OPTIONS, type FilterKey, type WorklistItem } from './types';

  let {
    items = [],
    onFilter,
  }: {
    items: WorklistItem[];
    onFilter?: (filtered: WorklistItem[], selected: FilterKey) => void;
  } = $props();

  let selected: FilterKey = $state('todas');

  const filtered = $derived(applyFilter(items, selected));

  function select(key: FilterKey) {
    selected = key;
  }

  // Push the filtered queue reactively so upstream (PR 3 gm +page) stays in sync
  // when a chip is selected or the injected `items` array changes.
  $effect(() => {
    onFilter?.(filtered, selected);
  });
</script>

<div data-testid="filter-chips" class="filter-row" role="group" aria-label="Filtrar cola">
  {#each FILTER_OPTIONS as option (option.key)}
    <button
      type="button"
      class="fchip"
      aria-pressed={selected === option.key}
      data-filter={option.key}
      onclick={() => select(option.key)}
    >
      {option.label}
    </button>
  {/each}
</div>
