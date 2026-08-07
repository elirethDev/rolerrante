<script lang="ts">
  import { enhance } from '$app/forms';
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

  // Read-only cell glyph (design admin.html: .perm-grid). Compact markers
  // keep the grid narrow; the title carries the full meaning.
  function permMark(perm: SectionPerm | undefined) {
    if (!perm) return '—';
    if (perm.can_view && perm.can_post) return 'VP';
    if (perm.can_view) return 'V';
    if (perm.can_post) return 'P';
    return '—';
  }

  function permTitle(perm: SectionPerm | undefined) {
    if (!perm) return 'Sin permiso asignado';
    if (perm.can_view && perm.can_post) return 'Ver + Publicar';
    if (perm.can_view) return 'Ver';
    if (perm.can_post) return 'Publicar';
    return 'Acceso denegado';
  }
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

<!-- design admin.html section-permisos: editable .perm-grid (click para ciclar) -->
<section data-testid="perm-matrix" class="perm-cat" id="permisos">
  <div class="perm-cat-head">
    <b>Permisos por sección</b>
    <span class="meta faint" style="margin-left:auto;font-size:.76rem">click en una celda para alternar Ver / Ver+Publicar · detalle (editar/bloquear) en /admin/foro</span>
  </div>
  <div class="perm-grid">
    <div class="head">Sección</div>
    {#each ROLES as role (role)}
      <div class="head">{roleLabel(role)}</div>
    {/each}
    {#each sortedCategories as cat (cat.id)}
      <div class="cell-title">
        {cat.name}
        {#if cat.min_read_role}
          <span class="tag gold">min {roleLabel(cat.min_read_role)}</span>
        {:else}
          <span class="tag">Público</span>
        {/if}
      </div>
      {#each ROLES as role (role)}
        {@const perm = permFor(cat.id, role)}
        {@const label = `${cat.name} — ${roleLabel(role)}: ${permTitle(perm)}`}
        <div data-testid="perm-cell" data-role={role} title={label}>
          <form method="POST" action="?/setSectionPerm" use:enhance class="perm-cell-form">
            <input type="hidden" name="categoryId" value={cat.id} />
            <input type="hidden" name="role" value={role} />
            <button type="submit" class="perm-cell-btn" aria-label={label}>
              {permMark(perm)}
            </button>
          </form>
        </div>
      {/each}
    {/each}
  </div>
  {#if sortedCategories.length === 0}
    <p class="muted" style="padding:var(--s-4);font-size:.9rem">No hay categorías registradas.</p>
  {/if}
</section>

<!-- design admin.html section-auditoria: recent audit as .table -->
<section style="margin-top:var(--s-8)" id="auditoria">
  <div class="thread-toolbar">
    <div><span class="kicker">Registro</span><h2 style="margin:8px 0 0">Auditoría de moderación</h2></div>
    <span class="meta muted" style="font-size:.82rem">{data.recentLogs.length} registros recientes</span>
  </div>
  <div class="table-wrap">
    <table class="table">
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
            <td data-th="Fecha" class="mono faint">{formatDate(log.created_at)}</td>
            <td data-th="Actor" class="audit-actor">
              {log.actor?.display_name ?? log.actor?.username ?? 'Sistema'}
            </td>
            <td data-th="Acción" class="cell-title"><AuditActionBadge action={log.action} /></td>
            <td data-th="Entidad" class="audit-entry">{log.entity_type}{#if log.entity_id} · {log.entity_id.slice(0, 8)}{/if}</td>
            <td data-th="Detalles" class="mono faint" style="font-size:.76rem">{JSON.stringify(log.details)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
    {#if data.recentLogs.length === 0}
      <p class="muted" style="padding:var(--s-4);font-size:.9rem">No hay actividad reciente.</p>
    {/if}
  </div>
</section>
