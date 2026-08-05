<script lang="ts">
  import { Crown, LayoutGrid, Users, Database, MessageSquare, Shield, ScrollText, Settings } from '@lucide/svelte';
  import type { Snippet } from 'svelte';
  import Sidebar from '$lib/components/navigation/Sidebar.svelte';

  let { children }: { children: Snippet } = $props();

  const nav = [
    { href: '/admin', label: 'Dashboard', icon: LayoutGrid },
    { href: '/admin/usuarios', label: 'Usuarios', icon: Users },
    { href: '/admin/catalogos', label: 'Catálogos', icon: Database },
    { href: '/admin/foro', label: 'Foro', icon: MessageSquare },
    { href: '/admin/moderacion', label: 'Moderación', icon: Shield },
    { href: '/admin/auditoria', label: 'Auditoría', icon: ScrollText },
    { href: '/admin/ajustes', label: 'Ajustes', icon: Settings },
  ];
</script>

<Sidebar title="Panel Admin" icon={Crown} {nav}>
  {@render children?.()}
</Sidebar>
