<script lang="ts">
  import { Shield } from '@lucide/svelte';
  import type { Snippet } from 'svelte';
  import Sidebar from '$lib/components/navigation/Sidebar.svelte';

  let { children }: { children: Snippet } = $props();

  const nav = [{ href: '/gm', label: 'Cola de revisión' }];
</script>

<Sidebar title="Panel GM" icon={Shield} {nav} drawerId="gm-drawer">
  {@render children?.()}
</Sidebar>