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

<div class="empty" data-testid="empty-state">
  {#if icon}
    {@const Icon = icon}
    <span class="sig" aria-hidden="true"><Icon size={64} strokeWidth={1.2} /></span>
  {/if}
  <h3>{title}</h3>
  {#if description}
    <p>{description}</p>
  {/if}
  {#if children}
    <div class="empty-cta">
      {@render children()}
    </div>
  {/if}
</div>