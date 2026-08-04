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

<div data-testid="audit-banner" role="status" class="card bg-base-200 border border-azeroth-border mb-6">
  <div class="card-body py-3 px-4 flex flex-row items-center gap-3">
    <AuditActionBadge action={action} />
    <div class="text-sm text-base-content">
      <span class="font-semibold">{actor}</span>
      <span> · {entityType}</span>
      {#if entityId}<span> · {entityId.slice(0, 8)}</span>{/if}
      <span class="text-azeroth-muted"> · {formatRelativeTime(createdAt)}</span>
    </div>
  </div>
</div>
