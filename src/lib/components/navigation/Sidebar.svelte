<script lang="ts">
  import { page } from '$app/state';
  import type { Component, Snippet } from 'svelte';

  interface NavItem {
    href: string;
    label: string;
  }

  interface Props {
    title: string;
    icon: Component;
    nav: NavItem[];
    drawerId: string;
    children?: Snippet;
  }

  let { title, icon, nav, drawerId, children }: Props = $props();
</script>

<div class="drawer lg:drawer-open">
  <div class="drawer-content p-6">
    {@render children?.()}
  </div>
  <div class="drawer-side">
    <label for={drawerId} class="drawer-overlay"></label>
    <aside class="bg-base-200 w-64 min-h-full p-4 border-r border-azeroth-border">
      <div class="flex items-center gap-2 mb-6 px-2">
        {#if icon}
          {@const Icon = icon}
          <Icon class="text-azeroth-gold" size={24} />
        {/if}
        <span class="font-cinzel text-xl text-azeroth-gold">{title}</span>
      </div>
      <ul class="menu gap-1">
        {#each nav as item (item.href)}
          <li>
            <a
              href={item.href}
              class:active={page.url.pathname === item.href}
              aria-current={page.url.pathname === item.href ? 'page' : undefined}
            >
              {item.label}
            </a>
          </li>
        {/each}
      </ul>
    </aside>
  </div>
</div>