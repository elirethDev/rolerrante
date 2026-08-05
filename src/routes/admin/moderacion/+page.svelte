<script lang="ts">
  import { enhance } from '$app/forms';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import { formatDateTime } from '$lib/utils';
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData | null } = $props();

  type ThreadRow = {
    id: string;
    title: string;
    content_type: string;
    status: string;
  };

  type ReportAuthor = {
    id: string;
    display_name: string | null;
    username: string;
    role: string;
  };

  type ReportRow = {
    id: string;
    reason: string;
    justification: string | null;
    status: string;
    created_at: string;
    reporter: { id: string; display_name: string | null; username: string } | null;
    post: {
      id: string;
      thread_id: string;
      post_number: number;
      author: ReportAuthor | null;
    } | null;
  };

  type SanctionState = { kind: string; active_until: string | null };

  // Which enforcement form is open per report row ('suspend' | 'ban' | null).
  // The inline reveal acts as a dedicated confirm step before any sanction.
  let openSanction = $state<Record<string, 'suspend' | 'ban' | null>>({});

  const toggleSanction = (reportId: string, kind: 'suspend' | 'ban') => {
    openSanction[reportId] = openSanction[reportId] === kind ? null : kind;
  };

  // Admin/GM targets are protected (REQ-MOD-ENF-04): no sanction controls.
  const isProtectedTarget = (author: ReportAuthor | null | undefined) =>
    author ? author.role === 'admin' || author.role === 'gm' : false;
</script>

<svelte:head>
  <title>Moderación del foro — Panel Admin</title>
</svelte:head>

<PageHeader kicker="Panel admin" title="Moderación del foro" />

{#if form?.message}
  <div class="alert alert-error text-sm mb-4">{form.message}</div>
{/if}

<section class="panel mb-6">
  <div class="panel-head"><h2>Hilos vinculados pendientes</h2></div>
  <div class="panel-body">
    {#if data.pendingThreads.length === 0}
      <p class="text-azeroth-muted">No hay hilos pendientes de aprobación.</p>
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

<section class="panel">
  <div class="panel-head"><h2>Eventos (revisión al finalizar)</h2></div>
  <div class="panel-body">
    {#if data.eventThreads.length === 0}
      <p class="text-azeroth-muted">No hay hilos de evento.</p>
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

<section class="panel mt-6">
  <div class="panel-head"><h2>Reportes de mensajes</h2></div>
  <div class="panel-body">
    {#if data.reports.length === 0}
      <p class="text-azeroth-muted">No hay reportes abiertos.</p>
    {:else}
      <div class="overflow-x-auto">
        <table class="table table-sm">
          <thead>
            <tr>
              <th>Reportante</th>
              <th>Usuario reportado</th>
              <th>Motivo</th>
              <th>Mensaje</th>
              <th>Fecha</th>
              {#if data.isAdmin}
                <th class="w-72">Acciones</th>
              {/if}
            </tr>
          </thead>
          <tbody>
            {#each data.reports as report (report.id)}
              {@const author = (report as ReportRow).post?.author}
              {@const sanction = (author ? data.sanctions[author.id] : undefined) as SanctionState | undefined}
              <tr>
                <td>
                  {(report as ReportRow).reporter?.display_name ??
                    (report as ReportRow).reporter?.username ??
                    'Anónimo'}
                </td>
                <td>
                  {author?.display_name ?? author?.username ?? 'Anónimo'}
                  {#if sanction}
                    <span class="badge badge-warning badge-xs ml-1">
                      {sanction.kind === 'ban' ? 'Baneado' : 'Suspendido'}
                    </span>
                  {/if}
                </td>
                <td>
                  {(report as ReportRow).reason}
                  {#if (report as ReportRow).justification}
                    <span class="text-xs text-azeroth-muted block">
                      {(report as ReportRow).justification}
                    </span>
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
                <td class="text-xs text-azeroth-muted">
                  {formatDateTime((report as ReportRow).created_at)}
                </td>
                {#if data.isAdmin}
                  <td>
                    <div class="flex flex-col gap-2">
                      <div class="flex gap-2 items-center">
                        <form method="POST" action="?/resolveReport" use:enhance class="flex gap-1 items-center">
                          <input type="hidden" name="reportId" value={(report as ReportRow).id} />
                          <input
                            type="text"
                            name="justification"
                            placeholder="Justificación"
                            class="input input-xs input-bordered w-28"
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
                            class="input input-xs input-bordered w-28"
                            required
                          />
                          <button type="submit" class="btn btn-error btn-xs">Descartar</button>
                        </form>
                      </div>

                      {#if !isProtectedTarget(author)}
                        <div class="flex gap-2 items-center">
                          <button
                            type="button"
                            class="btn btn-warning btn-xs"
                            onclick={() => toggleSanction(report.id, 'suspend')}
                          >
                            Suspender
                          </button>
                          <button
                            type="button"
                            class="btn btn-error btn-xs"
                            onclick={() => toggleSanction(report.id, 'ban')}
                          >
                            Banear
                          </button>
                        </div>
                        {#if openSanction[report.id] === 'suspend'}
                          <form method="POST" action="?/suspendUser" use:enhance class="flex gap-1 items-center">
                            <input type="hidden" name="userId" value={author?.id ?? ''} />
                            <select name="duration" class="select select-xs select-bordered">
                              <option value="3">3 días</option>
                              <option value="7" selected>7 días</option>
                              <option value="30">30 días</option>
                            </select>
                            <input
                              type="text"
                              name="justification"
                              placeholder="Justificación"
                              class="input input-xs input-bordered w-32"
                              required
                            />
                            <button type="submit" class="btn btn-warning btn-xs">
                              Confirmar suspensión
                            </button>
                          </form>
                        {/if}
                        {#if openSanction[report.id] === 'ban'}
                          <form method="POST" action="?/banUser" use:enhance class="flex gap-1 items-center">
                            <input type="hidden" name="userId" value={author?.id ?? ''} />
                            <input
                              type="text"
                              name="justification"
                              placeholder="Justificación"
                              class="input input-xs input-bordered w-32"
                              required
                            />
                            <button type="submit" class="btn btn-error btn-xs">
                              Confirmar baneo
                            </button>
                          </form>
                        {/if}
                      {/if}
                    </div>
                  </td>
                {/if}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</section>
