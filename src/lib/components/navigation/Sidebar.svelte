<script lang="ts">
  /* eslint-disable @typescript-eslint/no-explicit-any -- resolve() is typed for literal paths; nav hrefs are runtime strings */
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import type { Component, Snippet } from 'svelte';

  interface NavItem {
    href: string;
    label: string;
    icon?: Component;
    count?: number;
    section?: string;
  }

  interface Props {
    title: string;
    icon: Component;
    nav: NavItem[];
    children?: Snippet;
  }

  let { title, icon: TitleIcon, nav, children }: Props = $props();
</script>

<div class="side-layout">
  <nav class="side-nav" aria-label={title}>
    <span class="side-sec">
      <span class="inline-flex items-center gap-2">
        {#if TitleIcon}
          {@const Icon = TitleIcon}
          <Icon size={16} />
        {/if}
        {title}
      </span>
    </span>
    {#each nav as item, i (item.href)}
      {@const Icon = item.icon}
      {#if item.section && (i === 0 || nav[i - 1].section !== item.section)}
        <span class="side-sec">{item.section}</span>
      {/if}
      <a
        href={resolve(item.href as any)}
        class="side-item"
        aria-current={page.url.pathname === item.href ? 'page' : undefined}
      >
        {#if Icon}
          <Icon size={18} />
        {/if}
        {item.label}
        {#if item.count !== undefined}
          <span class="side-count">{item.count}</span>
        {/if}
      </a>
    {/each}
  </nav>

  <div class="min-w-0">
    {@render children?.()}
  </div>
</div>
