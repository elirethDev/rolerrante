<script lang="ts">
  import { page } from '$app/state';
  import { Shield } from 'lucide-svelte';
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();

  const nav = [
    { href: '/gm', label: 'Dashboard' },
    { href: '/gm/historias', label: 'Historias' },
    { href: '/gm/fichas', label: 'Fichas' },
    { href: '/gm/habilidades', label: 'Habilidades' },
    { href: '/gm/eventos', label: 'Eventos' },
  ];
</script>

<div class="drawer lg:drawer-open">
  <div class="drawer-content p-6">
    {@render children?.()}
  </div>
  <div class="drawer-side">
    <label for="gm-drawer" class="drawer-overlay"></label>
    <aside class="bg-base-200 w-64 min-h-full p-4 border-r border-azeroth-border">
      <div class="flex items-center gap-2 mb-6 px-2">
        <Shield class="text-azeroth-gold" size={24} />
        <span class="font-cinzel text-xl text-azeroth-gold">Panel GM</span>
      </div>
      <ul class="menu gap-1">
        {#each nav as item}
          <li>
            <a
              href={item.href}
              class:active={page.url.pathname === item.href}
            >
              {item.label}
            </a>
          </li>
        {/each}
      </ul>
    </aside>
  </div>
</div>