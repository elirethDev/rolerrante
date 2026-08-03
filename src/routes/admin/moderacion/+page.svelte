<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData | null } = $props();

  type ThreadRow = {
    id: string;
    title: string;
    content_type: string;
    status: string;
  };
</script>

<svelte:head>
  <title>Moderación del foro — Panel Admin</title>
</svelte:head>

<h1 class="text-3xl font-cinzel text-azeroth-gold mb-6">Moderación del foro</h1>

{#if form?.message}
  <div class="alert alert-error text-sm mb-4">{form.message}</div>
{/if}

<section class="card bg-base-200 border border-azeroth-border mb-6">
  <div class="card-body">
    <h2 class="card-title font-cinzel text-azeroth-gold">Hilos vinculados pendientes</h2>
    {#if data.pendingThreads.length === 0}
      <p class="text-gray-400">No hay hilos pendientes de aprobación.</p>
    {:else}
      <div class="overflow-x-auto">
        <table class="table table-sm">
          <thead>
            <tr>
              <th>Título</th>
              <th>Tipo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {#each data.pendingThreads as thread (thread.id)}
              <tr>
                <td>{(thread as ThreadRow).title}</td>
                <td>{(thread as ThreadRow).content_type}</td>
                <td>
                  <div class="flex gap-1">
                    <form method="POST" action="?/approveThread" use:enhance>
                      <input type="hidden" name="threadId" value={(thread as ThreadRow).id} />
                      <button type="submit" class="btn btn-success btn-xs">Aprobar</button>
                    </form>
                    <form method="POST" action="?/rejectThread" use:enhance>
                      <input type="hidden" name="threadId" value={(thread as ThreadRow).id} />
                      <button type="submit" class="btn btn-error btn-xs">Rechazar</button>
                    </form>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</section>

<section class="card bg-base-200 border border-azeroth-border">
  <div class="card-body">
    <h2 class="card-title font-cinzel text-azeroth-gold">Eventos (revisión al finalizar)</h2>
    {#if data.eventThreads.length === 0}
      <p class="text-gray-400">No hay hilos de evento.</p>
    {:else}
      <div class="overflow-x-auto">
        <table class="table table-sm">
          <thead>
            <tr>
              <th>Evento</th>
              <th>Revisión</th>
            </tr>
          </thead>
          <tbody>
            {#each data.eventThreads as thread (thread.id)}
              <tr>
                <td>{(thread as ThreadRow).title}</td>
                <td>
                  <form method="POST" action="?/reviewEvent" use:enhance>
                    <input type="hidden" name="threadId" value={(thread as ThreadRow).id} />
                    <button type="submit" class="btn btn-primary btn-xs">Revisar (solo finalizado)</button>
                  </form>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</section>
