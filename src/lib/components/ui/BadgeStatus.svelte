<script lang="ts">
  import { statusColor, statusLabel } from '$lib/utils';

  let { status, label }: { status: string; label?: string } = $props();
</script>

<span class="badge {statusColor(status)}">{label ?? statusLabel(status)}</span>