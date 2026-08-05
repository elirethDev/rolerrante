<script lang="ts">
  import { Shield, Clock, User, BookOpen, Sparkles, CalendarClock } from '@lucide/svelte';
  import type { Snippet } from 'svelte';
  import Sidebar from '$lib/components/navigation/Sidebar.svelte';

  let { children }: { children: Snippet } = $props();

  const nav = [
    { href: '/gm', label: 'Cola de revisión', icon: Clock, section: 'Revisión' },
    { href: '/gm/fichas', label: 'Fichas pendientes', icon: User },
    { href: '/gm/historias', label: 'Historias pendientes', icon: BookOpen },
    { href: '/gm/habilidades', label: 'Habilidades', icon: Sparkles },
    { href: '/gm/eventos', label: 'Eventos por finalizar', icon: CalendarClock, section: 'Operación' },
  ];
</script>

<Sidebar title="Panel GM" icon={Shield} {nav}>
  {@render children?.()}
</Sidebar>
