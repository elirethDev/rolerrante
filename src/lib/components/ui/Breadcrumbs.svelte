<script lang="ts">
  interface Item {
    label: string;
    href?: string;
  }

  interface Props {
    items: Item[];
    class?: string;
  }

  let { items, class: className = '' }: Props = $props();
</script>

<nav class="flex flex-wrap items-center gap-1.5 py-2 text-sm text-azeroth-muted {className}" aria-label="Breadcrumbs">
  {#each items as item, i (item.label + i)}
    {#if item.href}
      <a href={item.href} class="transition hover:text-azeroth-gold-bright">{item.label}</a>
    {:else}
      <span aria-current={i === items.length - 1 ? 'page' : undefined}>{item.label}</span>
    {/if}
    {#if i < items.length - 1}
      <span class="text-azeroth-faint" aria-hidden="true">/</span>
    {/if}
  {/each}
</nav>
