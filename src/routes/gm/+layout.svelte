<script lang="ts">
  import { Shield } from '@lucide/svelte';
  import type { Snippet } from 'svelte';
  import Sidebar from '$lib/components/navigation/Sidebar.svelte';

  let { children }: { children: Snippet } = $props();

  const nav = [
    { href: '/gm', label: 'Dashboard' },
    { href: '/gm/historias', label: 'Historias' },
    { href: '/gm/fichas', label: 'Fichas' },
    { href: '/gm/habilidades', label: 'Habilidades' },
    { href: '/gm/eventos', label: 'Eventos' },
  ];
</script>

<Sidebar title="Panel GM" icon={Shield} {nav} drawerId="gm-drawer">
  {@render children?.()}
</Sidebar>