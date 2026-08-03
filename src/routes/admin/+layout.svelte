<script lang="ts">
  import { Crown } from '@lucide/svelte';
  import type { Snippet } from 'svelte';
  import Sidebar from '$lib/components/navigation/Sidebar.svelte';

  let { children }: { children: Snippet } = $props();

  const nav = [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/usuarios', label: 'Usuarios' },
    { href: '/admin/catalogos', label: 'Catálogos' },
    { href: '/admin/foro', label: 'Foro' },
    { href: '/admin/moderacion', label: 'Moderación' },
    { href: '/admin/auditoria', label: 'Auditoría' },
    { href: '/admin/ajustes', label: 'Ajustes' },
  ];
</script>

<Sidebar title="Panel Admin" icon={Crown} {nav} drawerId="admin-drawer">
  {@render children?.()}
</Sidebar>