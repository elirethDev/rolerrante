<script lang="ts">
  import { enhance } from '$app/forms';
  import { Calendar, Pencil, Trash2 } from '@lucide/svelte';
  import { formatDate } from '$lib/utils';
  import Field from '$lib/components/ui/Field.svelte';
  import Checkbox from '$lib/components/ui/Checkbox.svelte';

  interface SessionShape {
    id: string;
    title: string | null;
    summary: string | null;
    session_date: string;
    counts_as_masteo: boolean;
  }

  interface Props {
    sessions: SessionShape[];
  }

  let { sessions }: Props = $props();
  let editingId = $state<string | null>(null);

  function cancelEdit() {
    editingId = null;
  }
</script>

<div class="panel">
  <div class="panel-head">
    <Calendar size={18} />
    <h2>
      Sesiones <span class="text-azeroth-faint font-medium">({sessions.length})</span>
    </h2>
    <span class="meta">gestión</span>
  </div>
  <div class="panel-body">
    <form
      method="POST"
      action="?/createSession"
      use:enhance
      class="border-t border-azeroth-border pt-4 grid gap-3"
    >
      <div class="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <Field label="Fecha" required>
          {#snippet ctrl()}
            <input id="session_date" name="session_date" type="date" class="input" required />
          {/snippet}
        </Field>
        <Field label="Título">
          {#snippet ctrl()}
            <input id="title" name="title" type="text" class="input" placeholder="Título de la sesión" />
          {/snippet}
        </Field>
        <Field label="Resumen" class="sm:col-span-2">
          {#snippet ctrl()}
            <textarea
              id="summary"
              name="summary"
              class="textarea"
              rows="2"
              placeholder="¿Qué pasó en la sesión?"
            ></textarea>
          {/snippet}
        </Field>
      </div>
      <div class="flex flex-wrap items-center gap-4">
        <Checkbox name="counts_as_masteo" value="on" label="Cuenta como masterización" />
        <button type="submit" class="btn btn-primary btn-sm">Añadir sesión</button>
      </div>
    </form>

    <div class="overflow-x-auto">
      <table class="table w-full">
        <thead>
          <tr class="text-azeroth-muted text-sm">
            <th>Fecha</th>
            <th>Título</th>
            <th>Resumen</th>
            <th>Masteo</th>
            <th class="text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {#if sessions.length === 0}
            <tr>
              <td colspan="5" class="text-center text-azeroth-muted py-4">
                Aún no hay sesiones. Añadí la primera con el formulario.
              </td>
            </tr>
          {:else}
            {#each sessions as s (s.id)}
              {#if editingId === s.id}
                <tr>
                  <td colspan="5">
                    <form
                      method="POST"
                      action="?/updateSession"
                      use:enhance
                      class="grid gap-3 py-2"
                    >
                      <input type="hidden" name="session_id" value={s.id} />
                      <div class="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                        <Field label="Fecha" required>
                          {#snippet ctrl()}
                            <input
                              id="edit_session_date_{s.id}"
                              name="session_date"
                              type="date"
                              class="input"
                              value={s.session_date}
                              required
                            />
                          {/snippet}
                        </Field>
                        <Field label="Título">
                          {#snippet ctrl()}
                            <input
                              id="edit_title_{s.id}"
                              name="title"
                              type="text"
                              class="input"
                              value={s.title ?? ''}
                            />
                          {/snippet}
                        </Field>
                        <Field label="Resumen" class="sm:col-span-2">
                          {#snippet ctrl()}
                            <textarea
                              id="edit_summary_{s.id}"
                              name="summary"
                              class="textarea"
                              rows="2"
                            >{s.summary ?? ''}</textarea>
                          {/snippet}
                        </Field>
                      </div>
                      <div class="flex flex-wrap items-center gap-4">
                        <Checkbox
                          name="counts_as_masteo"
                          value="on"
                          checked={s.counts_as_masteo}
                          label="Cuenta como masterización"
                        />
                        <button type="submit" class="btn btn-primary btn-sm">Guardar</button>
                        <button type="button" class="btn btn-ghost btn-sm" onclick={cancelEdit}>
                          Cancelar
                        </button>
                      </div>
                    </form>
                  </td>
                </tr>
              {:else}
                <tr class="border-t border-azeroth-border">
                  <td class="whitespace-nowrap">{formatDate(s.session_date)}</td>
                  <td>{s.title ?? '-'}</td>
                  <td class="text-sm text-azeroth-muted max-w-xs truncate">{s.summary ?? '-'}</td>
                  <td>
                    {#if s.counts_as_masteo}
                      <span class="badge badge-success">Sí</span>
                    {:else}
                      <span class="badge badge-neutral">No</span>
                    {/if}
                  </td>
                  <td class="text-right whitespace-nowrap">
                    <button
                      type="button"
                      class="btn btn-ghost btn-xs"
                      onclick={() => (editingId = s.id)}
                    >
                      <Pencil size={14} />
                      Editar
                    </button>
                    <form
                      method="POST"
                      action="?/deleteSession"
                      use:enhance
                      class="inline-block"
                      onsubmit={(e) => {
                        if (!confirm('¿Eliminar esta sesión?')) e.preventDefault();
                      }}
                    >
                      <input type="hidden" name="session_id" value={s.id} />
                      <button type="submit" class="btn btn-ghost btn-xs text-error">
                        <Trash2 size={14} />
                        Eliminar
                      </button>
                    </form>
                  </td>
                </tr>
              {/if}
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</div>
