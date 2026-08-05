<script lang="ts">
  import { Shield, Clock } from '@lucide/svelte';
  import type { Snippet } from 'svelte';
  import Sidebar from '$lib/components/navigation/Sidebar.svelte';

  let { children }: { children: Snippet } = $props();

  // GM unificado (decisión 2026-08-05): las sub-páginas legacy
  // (/gm/fichas, /gm/eventos, /gm/historias, /gm/habilidades) se eliminaron
  // y redirigen 307 a /gm. La cola unificada es la única entrada del panel.
  const nav = [
    { href: '/gm', label: 'Cola de revisión', icon: Clock, section: 'Revisión' },
  ];
</script>

<Sidebar title="Panel GM" icon={Shield} {nav}>
  {@render children?.()}
</Sidebar>
