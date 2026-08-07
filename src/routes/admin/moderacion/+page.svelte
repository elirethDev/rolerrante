<script lang="ts">
  import { enhance } from '$app/forms';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
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

<Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Moderación' }]} class="mb-2" />

<PageHeader kicker="Panel admin" title="Moderación del foro" />

{#if form?.message}
  <div class="alert alert-error text-sm mb-4">{form.message}</div>
{/if}

<!-- design admin-moderacion.html: guards note + .mod-card sections -->
<div class="sticky-note">
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6" />
    <path d="M12 10.5V16M12 7.8v.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
  </svg>
  <span>Las cuentas <b>GM</b> y <b>admin</b> no pueden ser suspendidas ni baneadas desde este panel.</span>
</div>

<section class="mod-card">
  <div class="mod-head"><h2>Hilos vinculados pendientes</h2><span class="meta">aprobación</span></div>
  <div class="mod-body">
    {#if data.pendingThreads.length === 0}
      <p class="muted" style="font-size:.9rem;padding:10px 0">No hay hilos pendientes de aprobación.</p>
    {:else}
      {#each data.pendingThreads as thread (thread.id)}
        <div class="m-row">
          <div class="m-main">
            <div class="m-title">{(thread as ThreadRow).title}</div>
            <div class="m-sub">{(thread as ThreadRow).content_type}</div>
          </div>
          <div class="m-acts">
            <form method="POST" action="?/approveThread" use:enhance>
              <input type="hidden" name="threadId" value={(thread as ThreadRow).id} />
              <button type="submit" class="btn btn-success btn-sm">Aprobar</button>
            </form>
            <form method="POST" action="?/rejectThread" use:enhance>
              <input type="hidden" name="threadId" value={(thread as ThreadRow).id} />
              <button type="submit" class="btn btn-danger btn-sm">Rechazar</button>
            </form>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</section>

<section class="mod-card">
  <div class="mod-head"><h2>Eventos (revisión al finalizar)</h2><span class="meta">revisión</span></div>
  <div class="mod-body">
    {#if data.eventThreads.length === 0}
      <p class="muted" style="font-size:.9rem;padding:10px 0">No hay hilos de evento.</p>
    {:else}
      {#each data.eventThreads as thread (thread.id)}
        <div class="m-row">
          <div class="m-main">
            <div class="m-title">{(thread as ThreadRow).title}</div>
            <div class="m-sub">Revisión al finalizar</div>
          </div>
          <div class="m-acts">
            <form method="POST" action="?/reviewEvent" use:enhance>
              <input type="hidden" name="threadId" value={(thread as ThreadRow).id} />
              <button type="submit" class="btn btn-primary btn-sm">Revisar (solo finalizado)</button>
            </form>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</section>

<section class="mod-card">
  <div class="mod-head"><h2>Reportes de mensajes</h2><span class="meta">{data.reports.length} abiertos</span></div>
  <div class="mod-body">
    {#if data.reports.length === 0}
      <p class="muted" style="font-size:.9rem;padding:10px 0">No hay reportes abiertos.</p>
    {:else}
      {#each data.reports as report (report.id)}
        {@const author = (report as ReportRow).post?.author}
        {@const sanction = (author ? data.sanctions[author.id] : undefined) as SanctionState | undefined}
        <div class="m-row">
          <div class="m-main">
            <div class="m-title">
              Reportante: {(report as ReportRow).reporter?.display_name ?? (report as ReportRow).reporter?.username ?? 'Anónimo'}
              <span class="sep" style="color:var(--text-faint)">→</span>
              <b>{author?.display_name ?? author?.username ?? 'Anónimo'}</b>
              {#if sanction}
                <span class="badge badge-warning no-dot">
                  {sanction.kind === 'ban' ? 'Baneado' : 'Suspendido'}
                </span>
              {/if}
            </div>
            <div class="m-sub">
              Motivo: {(report as ReportRow).reason}
              {#if (report as ReportRow).justification} · {(report as ReportRow).justification}{/if}
              {#if (report as ReportRow).post}
                · <a
                  href={`/foro/${(report as ReportRow).post!.thread_id}`}
                  style="color:var(--gold-soft)"
                >
                  Mensaje #{(report as ReportRow).post!.post_number}
                </a>
              {/if}
              · {formatDateTime((report as ReportRow).created_at)}
            </div>
          </div>
          {#if data.isAdmin}
            <div class="m-acts">
              <form method="POST" action="?/resolveReport" use:enhance>
                <input type="hidden" name="reportId" value={(report as ReportRow).id} />
                <input type="text" name="justification" placeholder="Justificación" class="input" required />
                <button type="submit" class="btn btn-success btn-sm">Resolver</button>
              </form>
              <form method="POST" action="?/discardReport" use:enhance>
                <input type="hidden" name="reportId" value={(report as ReportRow).id} />
                <input type="text" name="justification" placeholder="Justificación" class="input" required />
                <button type="submit" class="btn btn-danger btn-sm">Descartar</button>
              </form>

              {#if !isProtectedTarget(author)}
                <button type="button" class="btn btn-warning btn-sm" onclick={() => toggleSanction(report.id, 'suspend')}>
                  Suspender
                </button>
                <button type="button" class="btn btn-danger btn-sm" onclick={() => toggleSanction(report.id, 'ban')}>
                  Banear
                </button>
                {#if openSanction[report.id] === 'suspend'}
                  <form method="POST" action="?/suspendUser" use:enhance>
                    <input type="hidden" name="userId" value={author?.id ?? ''} />
                    <select name="duration" class="select">
                      <option value="3">3 días</option>
                      <option value="7" selected>7 días</option>
                      <option value="30">30 días</option>
                    </select>
                    <input type="text" name="justification" placeholder="Justificación" class="input" required />
                    <button type="submit" class="btn btn-warning btn-sm">Confirmar suspensión</button>
                  </form>
                {/if}
                {#if openSanction[report.id] === 'ban'}
                  <form method="POST" action="?/banUser" use:enhance>
                    <input type="hidden" name="userId" value={author?.id ?? ''} />
                    <input type="text" name="justification" placeholder="Justificación" class="input" required />
                    <button type="submit" class="btn btn-danger btn-sm">Confirmar baneo</button>
                  </form>
                {/if}
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
</section>
