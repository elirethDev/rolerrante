<script lang="ts">
  interface Props {
    value?: string;
    type?: string;
    name?: string;
    id?: string;
    label?: string;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    invalid?: boolean;
    autocomplete?: HTMLInputElement['autocomplete'];
    maxlength?: number;
    inputmode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search';
    'aria-label'?: string;
    'aria-describedby'?: string;
    class?: string;
  }

  let {
    value = $bindable(''),
    type = 'text',
    name,
    id,
    label,
    placeholder,
    required = false,
    disabled = false,
    invalid = false,
    autocomplete,
    maxlength,
    inputmode,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    class: className = '',
  }: Props = $props();
</script>

<input
  {type}
  {name}
  {id}
  aria-label={ariaLabel}
  aria-describedby={ariaDescribedBy}
  {placeholder}
  {required}
  {disabled}
  {autocomplete}
  {maxlength}
  {inputmode}
  bind:value
  aria-invalid={invalid || undefined}
  class="azeroth-focus min-h-10 w-full rounded-lg border border-azeroth-border bg-azeroth-sunken px-3 py-2.5 font-sans text-sm text-base-content transition placeholder:text-azeroth-faint {invalid
    ? 'border-azeroth-danger bg-[rgba(170,36,9,0.06)]'
    : ''} {className}"
/>
