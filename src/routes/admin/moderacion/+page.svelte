<script lang="ts">
  import { enhance } from '$app/forms';
  import { formatDateTime } from '$lib/utils';
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData | null } = $props();

  type ThreadRow = {
    id: string;
    title: string;
    content_type: string;
    status: string;
  };

  type ReportRow = {
    id: string;
    reason: string;
    justification: string | null;
    status: string;
    created_at: string;
    reporter: { id: string; display_name: string | null; username: string } | null;
    post: { id: string; thread_id: string; post_number: number } | null;
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

<section class="card bg-base-200 border border-azeroth-border mt-6">
  <div class="card-body">
    <h2 class="card-title font-cinzel text-azeroth-gold">Reportes de mensajes</h2>
    {#if data.reports.length === 0}
      <p class="text-gray-400">No hay reportes abiertos.</p>
    {:else}
      <div class="overflow-x-auto">
        <table class="table table-sm">
          <thead>
            <tr>
              <th>Reportante</th>
              <th>Motivo</th>
              <th>Mensaje</th>
              <th>Fecha</th>
              <th class="w-64">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {#each data.reports as report (report.id)}
              <tr>
                <td>{(report as ReportRow).reporter?.display_name ?? (report as ReportRow).reporter?.username ?? 'Anónimo'}</td>
                <td>
                  {(report as ReportRow).reason}
                  {#if (report as ReportRow).justification}
                    <span class="text-xs text-gray-400 block">{(report as ReportRow).justification}</span>
                  {/if}
                </td>
                <td>
                  {#if (report as ReportRow).post}
                    <a
                      href={`/foro/${(report as ReportRow).post!.thread_id}`}
                      class="text-azeroth-gold underline"
                    >
                      Mensaje #{(report as ReportRow).post!.post_number}
                    </a>
                  {/if}
                </td>
                <td class="text-xs text-gray-400">{formatDateTime((report as ReportRow).created_at)}</td>
                <td>
                  <div class="flex gap-2 items-center">
                    <form method="POST" action="?/resolveReport" use:enhance class="flex gap-1 items-center">
                      <input type="hidden" name="reportId" value={(report as ReportRow).id} />
                      <input
                        type="text"
                        name="justification"
                        placeholder="Justificación"
                        class="input input-xs input-bordered w-40"
                        required
                      />
                      <button type="submit" class="btn btn-success btn-xs">Resolver</button>
                    </form>
                    <form method="POST" action="?/discardReport" use:enhance class="flex gap-1 items-center">
                      <input type="hidden" name="reportId" value={(report as ReportRow).id} />
                      <input
                        type="text"
                        name="justification"
                        placeholder="Justificación"
                        class="input input-xs input-bordered w-40"
                        required
                      />
                      <button type="submit" class="btn btn-error btn-xs">Descartar</button>
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
