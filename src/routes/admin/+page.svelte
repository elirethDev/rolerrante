<script lang="ts">
  import AuditBanner from '$lib/components/admin/AuditBanner.svelte';
  import AuditActionBadge from '$lib/components/admin/AuditActionBadge.svelte';
  import { formatDate } from '$lib/utils';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Dashboard — RolErrante</title>
</svelte:head>

<h1 class="text-3xl font-cinzel text-azeroth-gold mb-6">Panel de administración</h1>

{#if data.lastAction}
  <AuditBanner
    actor={data.lastAction.actor?.display_name ?? data.lastAction.actor?.username ?? 'Sistema'}
    action={data.lastAction.action}
    entityType={data.lastAction.entity_type}
    entityId={data.lastAction.entity_id}
    createdAt={data.lastAction.created_at}
  />
{/if}

<div class="grid md:grid-cols-3 gap-4 mb-8">
  <div class="stat bg-base-200 border border-azeroth-border rounded-box p-4">
    <div class="stat-title text-gray-400">Usuarios</div>
    <div class="stat-value text-azeroth-gold text-2xl">{data.users}</div>
  </div>

  <div class="stat bg-base-200 border border-azeroth-border rounded-box p-4">
    <div class="stat-title text-gray-400">No administradores</div>
    <div class="stat-value text-azeroth-gold text-2xl">{data.nonAdmin}</div>
  </div>

  <div class="stat bg-base-200 border border-azeroth-border rounded-box p-4">
    <div class="stat-title text-gray-400">Eventos de auditoría</div>
    <div class="stat-value text-azeroth-gold text-2xl">{data.logs}</div>
  </div>
</div>

<div class="card bg-base-200 border border-azeroth-border">
  <div class="card-body">
    <h2 class="card-title font-cinzel text-azeroth-gold">Actividad reciente</h2>
    <div class="overflow-x-auto mt-2">
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
        <p class="text-gray-500 text-center py-4">No hay actividad reciente.</p>
      {/if}
    </div>
  </div>
</div>