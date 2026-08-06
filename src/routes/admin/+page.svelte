<script lang="ts">
  import AuditBanner from '$lib/components/admin/AuditBanner.svelte';
  import AuditActionBadge from '$lib/components/admin/AuditActionBadge.svelte';
  import { formatDate, roleLabel } from '$lib/utils';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import type { UserRole } from '$lib/types';
  import type { Database } from '$lib/supabase/database.types';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const ROLES: UserRole[] = ['pendiente', 'rolero', 'gm', 'admin'];

  type SectionPerm = Database['public']['Tables']['section_permissions']['Row'];
  type CategoryRow = Database['public']['Tables']['categories']['Row'];

  /** Effective section permission for a category+role (read-only governance). */
  const permFor = $derived(
    (categoryId: string, role: UserRole): SectionPerm | undefined =>
      data.sectionPermissions.find(
        (p) => p.category_id === categoryId && p.role === role,
      ) as SectionPerm | undefined,
  );

  const rowSort = (a: CategoryRow, b: CategoryRow) =>
    a.sort_order - b.sort_order || String(a.id).localeCompare(String(b.id));

  const sortedCategories = $derived(data.categories.toSorted(rowSort));
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

<div class="panel" data-testid="perm-matrix">
  <div class="panel-head">
    <h2>Permisos por sección</h2>
    <span class="meta">solo lectura · se gestionan en /admin/foro</span>
  </div>
  <div class="panel-body p-0">
    <div class="overflow-x-auto">
      <table class="table table-sm">
        <thead>
          <tr>
            <th>Sección</th>
            <th>Lectura mínima</th>
            {#each ROLES as role (role)}
              <th title={role}>{roleLabel(role)}</th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each sortedCategories as cat (cat.id)}
            <tr>
              <td class="font-semibold whitespace-nowrap">{cat.name}</td>
              <td class="whitespace-nowrap">
                {#if cat.min_read_role}
                  <span class="badge badge-ghost badge-sm">{roleLabel(cat.min_read_role)}</span>
                {:else}
                  <span class="text-azeroth-faint">Público</span>
                {/if}
              </td>
              {#each ROLES as role (role)}
                {@const perm = permFor(cat.id, role)}
                <td data-testid="perm-cell" data-role={role}>
                  {#if perm}
                    {#if perm.can_view && perm.can_post}
                      <span class="badge badge-success badge-sm">Ver + Publicar</span>
                    {:else if perm.can_view}
                      <span class="badge badge-neutral badge-sm">Ver</span>
                    {:else if perm.can_post}
                      <span class="badge badge-warning badge-sm">Publicar</span>
                    {:else}
                      <span class="text-azeroth-faint">—</span>
                    {/if}
                  {:else}
                    <span class="text-azeroth-faint">—</span>
                  {/if}
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
      {#if sortedCategories.length === 0}
        <p class="text-azeroth-faint text-center py-4">No hay categorías registradas.</p>
      {/if}
    </div>
  </div>
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
