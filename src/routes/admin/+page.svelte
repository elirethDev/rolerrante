<script lang="ts">
  import { enhance } from '$app/forms';
  import { roleLabel, formatDate } from '$lib/utils';
  import type { ActionData, PageData } from './$types';

  export let data: PageData;
  export let form: ActionData;

  function stringify(value: unknown) {
    return typeof value === 'string' ? value : JSON.stringify(value);
  }
</script>

<svelte:head>
  <title>Panel Admin — RolErrante</title>
</svelte:head>

<h1 class="text-3xl font-cinzel text-azeroth-gold mb-6">Panel de administración</h1>

{#if form?.message}<div class="alert alert-error mb-4">{form.message}</div>{/if}

<div class="grid lg:grid-cols-2 gap-6">
  <div class="card bg-base-200 border border-azeroth-border">
    <div class="card-body">
      <h2 class="card-title font-cinzel text-azeroth-gold">Usuarios</h2>
      <div class="space-y-2 max-h-96 overflow-y-auto mt-2">
        {#each data.users as u}
          <form method="POST" action="?/setRole" use:enhance class="flex gap-2 items-end p-2 bg-base-100 rounded border border-azeroth-border">
            <input type="hidden" name="user_id" value={u.id} />
            <div class="flex-1">
              <p class="font-semibold">@{u.username}</p>
              <p class="text-xs text-gray-400">{u.display_name ?? ''}</p>
            </div>
            <select name="role" class="select select-bordered select-sm">
              <option value="pendiente" selected={u.role === 'pendiente'}>{roleLabel('pendiente')}</option>
              <option value="rolero" selected={u.role === 'rolero'}>{roleLabel('rolero')}</option>
              <option value="gm" selected={u.role === 'gm'}>{roleLabel('gm')}</option>
              <option value="admin" selected={u.role === 'admin'}>{roleLabel('admin')}</option>
            </select>
            <button type="submit" class="btn btn-primary btn-sm">Guardar</button>
          </form>
        {/each}
      </div>
    </div>
  </div>

  <div class="card bg-base-200 border border-azeroth-border">
    <div class="card-body">
      <h2 class="card-title font-cinzel text-azeroth-gold">Configuración</h2>
      <div class="space-y-3 mt-2">
        {#each data.settings as setting}
          <form method="POST" action="?/saveSetting" use:enhance class="flex gap-2 items-end">
            <input type="hidden" name="key" value={setting.key} />
            <div class="form-control flex-1">
              <label class="label" for="val_{setting.key}"><span class="label-text text-xs">{setting.key}</span></label>
              <input id="val_{setting.key}" name="value" type="text" class="input input-bordered input-sm" value={stringify(setting.value)} />
            </div>
            <button type="submit" class="btn btn-primary btn-sm">Guardar</button>
          </form>
        {/each}
      </div>
    </div>
  </div>

  <div class="card bg-base-200 border border-azeroth-border lg:col-span-2">
    <div class="card-body">
      <h2 class="card-title font-cinzel text-azeroth-gold">Audit log</h2>
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
            {#each data.logs as log}
              <tr>
                <td>{formatDate(log.created_at)}</td>
                <td>{log.actor?.display_name ?? log.actor?.username ?? 'Sistema'}</td>
                <td>{log.action}</td>
                <td>{log.entity_type} · {log.entity_id.slice(0, 8)}</td>
                <td class="text-xs">{JSON.stringify(log.details)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>
