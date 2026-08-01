<script lang="ts">
  import type { Component, Snippet } from 'svelte';

  interface Props {
    icon?: Component;
    title: string;
    description?: string;
    children?: Snippet;
  }

  let { icon, title, description, children }: Props = $props();
</script>

<div class="card bg-base-200 border border-azeroth-border">
  <div class="card-body items-center text-center py-12">
    {#if icon}
      {@const Icon = icon}
      <Icon class="text-azeroth-gold mb-3" size={40} strokeWidth={1.5} />
    {/if}
    <h3 class="card-title font-cinzel text-azeroth-gold text-xl">{title}</h3>
    {#if description}
      <p class="text-gray-400 max-w-md">{description}</p>
    {/if}
    {#if children}
      <div class="mt-2">
        {@render children()}
      </div>
    {/if}
  </div>
</div>