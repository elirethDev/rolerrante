<script lang="ts">
  import { Minus, Plus } from '@lucide/svelte';
  import { ATTR_BASE_VALUE, ATTR_MIN, ATTR_MAX } from '$lib/rules';
  import Field from '$lib/components/ui/Field.svelte';

  interface Props {
    label: string;
    value: number;
    min?: number;
    max?: number;
    size?: 'sm' | 'md' | 'lg';
    onchange?: (value: number) => void;
  }

  let { label, value, min = ATTR_MIN, max = ATTR_MAX, size = 'md', onchange }: Props = $props();
</script>

<Field {label} {size} hint={`base ${ATTR_BASE_VALUE} · máx ${max}`}>
  {#snippet ctrl()}
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="btn btn-sm btn-outline btn-square"
        disabled={value <= min}
        onclick={() => onchange?.(Math.max(min, value - 1))}
        aria-label="Disminuir {label}"
      >
        <Minus size={16} />
      </button>
      <span class="w-10 text-center text-lg font-semibold font-cinzel">{value}</span>
      <button
        type="button"
        class="btn btn-sm btn-outline btn-square"
        disabled={value >= max}
        onclick={() => onchange?.(Math.min(max, value + 1))}
        aria-label="Aumentar {label}"
      >
        <Plus size={16} />
      </button>
    </div>
  {/snippet}
</Field>
