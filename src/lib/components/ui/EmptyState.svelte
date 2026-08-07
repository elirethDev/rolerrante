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
    <Icon class="sig" size={56} strokeWidth={1.2} />
  {/if}
  <h3>{title}</h3>
  {#if description}
    <p>{description}</p>
  {/if}
  {#if children}
    <div class="row" style="justify-content:center;margin-top:4px">
      {@render children()}
    </div>
  {/if}
</div>
