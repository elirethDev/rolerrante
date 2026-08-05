<script lang="ts">
  import AuditBanner from '$lib/components/admin/AuditBanner.svelte';
  import AuditActionBadge from '$lib/components/admin/AuditActionBadge.svelte';
  import { formatDate } from '$lib/utils';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Dashboard — RolErrante</title>
</svelte:head>

<PageHeader
  kicker="Zona del consejo · Admin"
  title="Panel de administración"
  subtitle="Gestiona usuarios, catálogos, el foro y el registro de auditoría del reino."
/>

{#if data.lastAction}
  <AuditBanner
    actor={data.lastAction.actor?.display_name ?? data.lastAction.actor?.username ?? 'Sistema'}
    action={data.lastAction.action}
    entityType={data.lastAction.entity_type}
    entityId={data.lastAction.entity_id}
    createdAt={data.lastAction.created_at}
  />
{/if}

<div class="kpi-grid">
  <div class="kpi"><span class="kpi-num">{data.users}</span><span class="kpi-label">Usuarios</span></div>
  <div class="kpi"><span class="kpi-num">{data.nonAdmin}</span><span class="kpi-label">No administradores</span></div>
  <div class="kpi"><span class="kpi-num">{data.logs}</span><span class="kpi-label">Eventos de auditoría</span></div>
</div>

<div class="panel">
  <div class="panel-head">
    <h2>Actividad reciente</h2>
    <span class="meta">{data.recentLogs.length} registros</span>
  </div>
  <div class="panel-body p-0">
    <div class="overflow-x-auto">
      <table class="table table-sm">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Actor</th>
            <th>Acción</th>
            <th>Entidad</th>
            <th>Detalles</th>
          </tr>
        </thead>
        <tbody>
          {#each data.recentLogs as log (log.id ?? log.created_at)}
            <tr>
              <td>{formatDate(log.created_at)}</td>
              <td>{log.actor?.display_name ?? log.actor?.username ?? 'Sistema'}</td>
              <td><AuditActionBadge action={log.action} /></td>
              <td>{log.entity_type}{#if log.entity_id} · {log.entity_id.slice(0, 8)}{/if}</td>
              <td class="text-xs">{JSON.stringify(log.details)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
      {#if data.recentLogs.length === 0}
        <p class="text-azeroth-faint text-center py-4">No hay actividad reciente.</p>
      {/if}
    </div>
  </div>
</div>
