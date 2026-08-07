<script lang="ts">
  import { formatRelativeTime } from '$lib/utils';
  import AuditActionBadge from './AuditActionBadge.svelte';

  let {
    actor,
    action,
    entityType,
    entityId,
    createdAt,
  }: {
    actor: string;
    action: string;
    entityType: string;
    entityId?: string;
    createdAt: string;
  } = $props();
</script>

<!-- design admin.html: .audit-banner surface with icon + last action summary -->
<div data-testid="audit-banner" role="status" class="audit-banner">
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6" />
    <path d="M12 10.5V16M12 7.8v.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
  </svg>
  <div>
    <AuditActionBadge action={action} />
    <span class="sep"> · </span><span class="font-semibold">{actor}</span>
    <span> · {entityType}</span>
    {#if entityId}<span> · {entityId.slice(0, 8)}</span>{/if}
    <span class="muted"> · {formatRelativeTime(createdAt)}</span>
  </div>
</div>
