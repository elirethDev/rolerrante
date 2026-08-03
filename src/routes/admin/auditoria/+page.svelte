<script lang="ts">
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

<h1 class="text-3xl font-cinzel text-azeroth-gold mb-6">Auditoría del foro</h1>

<div class="card bg-base-200 border border-azeroth-border">
  <div class="card-body">
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <input
        id="audit-filter"
        type="text"
        class="input input-sm w-64"
        placeholder="Filtrar por acción..."
        bind:value={filter}
      />
      <button
        class="btn {forumOnly ? 'btn-primary' : 'btn-ghost'} btn-sm"
        onclick={() => (forumOnly = !forumOnly)}
      >
        {forumOnly ? '▼ Solo foro' : 'Solo foro'}
      </button>
    </div>

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
          {#each filtered as log (log.id ?? log.created_at)}
            <tr>
              <td>{formatDate(log.created_at)}</td>
              <td>{log.actor?.display_name ?? log.actor?.username ?? 'Sistema'}</td>
              <td>{log.action}</td>
              <td>{log.entity_type}{#if log.entity_id} · {log.entity_id.slice(0, 8)}{/if}</td>
              <td class="text-xs">{JSON.stringify(log.details)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
      {#if filtered.length === 0}
        <p class="text-gray-500 text-center py-4">No se encontraron registros.</p>
      {/if}
    </div>
  </div>
</div>
