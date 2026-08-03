<script lang="ts">
  import Select from './Select.svelte';

  interface Props {
    value?: string;
    disabled?: boolean;
    required?: boolean;
    invalid?: boolean;
    name?: string;
    'aria-label'?: string;
  }

  let {
    value = 'a',
    disabled = false,
    required = false,
    invalid = false,
    name,
    'aria-label': ariaLabel,
  }: Props = $props();
</script>

<Select bind:value {name} {disabled} {required} {invalid} aria-label={ariaLabel}>
  <option value="a">Azeroth</option>
  <option value="b">Horda</option>
</Select>
