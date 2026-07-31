<script lang="ts">
  import { page } from '$app/state';
  import { Crown } from 'lucide-svelte';
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();

  const nav = [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/usuarios', label: 'Usuarios' },
    { href: '/admin/catalogos', label: 'Catálogos' },
    { href: '/admin/logs', label: 'Auditoría' },
    { href: '/admin/ajustes', label: 'Ajustes' },
  ];
</script>

<div class="drawer lg:drawer-open">
  <div class="drawer-content p-6">
    {@render children?.()}
  </div>
  <div class="drawer-side">
    <label for="admin-drawer" class="drawer-overlay"></label>
    <aside class="bg-base-200 w-64 min-h-full p-4 border-r border-azeroth-border">
      <div class="flex items-center gap-2 mb-6 px-2">
        <Crown class="text-azeroth-gold" size={24} />
        <span class="font-cinzel text-xl text-azeroth-gold">Panel Admin</span>
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