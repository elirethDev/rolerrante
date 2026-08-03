<script lang="ts">
  import { Bell } from '@lucide/svelte';
  import { resolve } from '$app/paths';

  let {
    unreadCount = 0,
    guest = false,
  }: { unreadCount?: number; guest?: boolean } = $props();
</script>

{#if !guest}
  <a
    href={resolve('/notificaciones')}
    class="btn btn-ghost btn-sm relative"
    aria-label={unreadCount > 0 ? `Notificaciones (${unreadCount} sin leer)` : 'Notificaciones'}
    data-testid="notification-bell"
  >
    <Bell size={18} />
    {#if unreadCount > 0}
      <span class="badge badge-error badge-xs absolute -top-1 -right-1" data-testid="unread-badge">
        {unreadCount}
      </span>
    {/if}
  </a>
{/if}
