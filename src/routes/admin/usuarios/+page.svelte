<script lang="ts">
  import { enhance } from '$app/forms';
  import { roleLabel } from '$lib/utils';
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
  <title>Usuarios — RolErrante</title>
</svelte:head>

<h1 class="text-3xl font-cinzel text-azeroth-gold mb-6">Gestión de usuarios</h1>

{#if form?.message}
  <div class="alert alert-error mb-4">{form.message}</div>
{/if}

<div class="card bg-base-200 border border-azeroth-border">
  <div class="card-body">
    <h2 class="card-title font-cinzel text-azeroth-gold">Usuarios registrados</h2>
    <div class="space-y-2 max-h-[70vh] overflow-y-auto mt-2">
      {#each data.users as u (u.id)}
        <form
          method="POST"
          action="?/setRole"
          use:enhance
          class="flex gap-2 items-end p-2 bg-base-100 rounded border border-azeroth-border"
        >
          <input type="hidden" name="user_id" value={u.id} />
          <div class="flex-1">
            <p class="font-semibold">@{u.username}</p>
            <p class="text-xs text-azeroth-muted">{u.display_name ?? ''}</p>
          </div>
          <select name="role" class="select select-sm">
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