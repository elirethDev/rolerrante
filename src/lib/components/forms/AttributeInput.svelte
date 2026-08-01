<script lang="ts">
  import { Minus, Plus } from 'lucide-svelte';
  import { ATTR_BASE_VALUE, ATTR_MIN, ATTR_MAX } from '$lib/rules';

  interface Props {
    label: string;
    value: number;
    min?: number;
    max?: number;
    onchange?: (value: number) => void;
  }

  let { label, value, min = ATTR_MIN, max = ATTR_MAX, onchange }: Props = $props();
</script>

<div class="form-control items-center">
  <span id="attribute-input-label" class="label"><span class="label-text">{label}</span></span>
  <div class="flex items-center gap-2" role="group" aria-labelledby="attribute-input-label">
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
  <span class="text-xs text-gray-500 mt-1">base {ATTR_BASE_VALUE} · máx {max}</span>
</div>