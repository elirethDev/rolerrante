<script lang="ts">
  import { badgeLabel, badgeVariant, type BadgeVariant } from '$lib/audit/badges';

  let { action }: { action: string } = $props();

  const VARIANT_CLASS: Record<BadgeVariant, string> = {
    gold: 'badge-warning',
    success: 'badge-success',
    danger: 'badge-error',
    blue: 'badge-info',
    neutral: 'badge-neutral',
  };

  const variant = $derived(badgeVariant(action));
  const label = $derived(badgeLabel(action));
</script>

<span data-testid="audit-action-badge" class="badge badge-sm {VARIANT_CLASS[variant]}">
  {label}
</span>
