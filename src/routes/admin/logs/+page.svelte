<script lang="ts">
  import { formatDate } from '$lib/utils';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let filter = $state('');

  let filtered = $derived(
    filter
      ? data.logs.filter(
          (log) => log.action.toLowerCase().includes(filter.toLowerCase()),
        )
      : data.logs,
  );
</script>

<svelte:head>
  <title>Auditoría — RolErrante</title>
</svelte:head>

<h1 class="text-3xl font-cinzel text-azeroth-gold mb-6">Registro de auditoría</h1>

<div class="card bg-base-200 border border-azeroth-border">
  <div class="card-body">
    <div class="form-control max-w-xs mb-4">
      <label class="label" for="log-filter">
        <span class="label-text">Filtrar por acción</span>
      </label>
      <input
        id="log-filter"
        type="text"
        class="input input-bordered input-sm"
        placeholder="Ej: login, create..."
        bind:value={filter}
      />
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
          {#each filtered as log}
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