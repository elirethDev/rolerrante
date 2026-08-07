<script lang="ts">
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
  import { formatDate } from '$lib/utils';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const FORUM_ACTIONS = [
    'crear_hilo',
    'editar_post',
    'eliminar_post',
    'bloquear_hilo',
    'desbloquear_hilo',
    'editar_permisos',
  ];

  let filter = $state('');
  let forumOnly = $state(false);

  let filtered = $derived(
    data.logs.filter(
      (log) =>
        (!forumOnly || FORUM_ACTIONS.includes(log.action)) &&
        (!filter || log.action.toLowerCase().includes(filter.toLowerCase())),
    ),
  );
</script>

<svelte:head>
  <title>Auditoría del foro — Panel Admin</title>
</svelte:head>

<Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Auditoría' }]} class="mb-2" />

<PageHeader kicker="Panel admin" title="Auditoría del foro" />

<!-- design admin-auditoria.html: .audit-card with filters + .log-table -->
<div class="audit-card">
  <div class="filters">
    <div class="search-wrap" style="flex:1;min-width:220px">
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.8" />
        <path d="M20 20l-3.2-3.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
      </svg>
      <input
        id="audit-filter"
        class="input"
        type="search"
        placeholder="Filtrar por acción..."
        bind:value={filter}
      />
    </div>
    <button class="btn btn-secondary btn-sm" onclick={() => (forumOnly = !forumOnly)}>
      {forumOnly ? '▼ Solo foro' : 'Solo foro'}
    </button>
  </div>

  <div class="log-body">
    <table class="log-table">
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
        {#each filtered as log (log.id ?? log.created_at)}
          <tr>
            <td class="date">{formatDate(log.created_at)}</td>
            <td class="actor">
              {#if log.actor?.display_name ?? log.actor?.username}
                <b>{log.actor?.display_name ?? log.actor?.username}</b>
              {:else}
                <span class="muted">Sistema</span>
              {/if}
            </td>
            <td><span class="tag-action">{log.action}</span></td>
            <td class="ent">{log.entity_type}{#if log.entity_id} · {log.entity_id.slice(0, 8)}{/if}</td>
            <td class="det">{JSON.stringify(log.details)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
    {#if filtered.length === 0}
      <p class="muted" style="padding:var(--s-4);font-size:.9rem">No se encontraron registros.</p>
    {/if}
  </div>
</div>
