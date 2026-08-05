<script lang="ts">
  import { enhance } from '$app/forms';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import { roleLabel } from '$lib/utils';
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
  <title>Usuarios — RolErrante</title>
</svelte:head>

<PageHeader kicker="Panel admin" title="Gestión de usuarios" />

{#if form?.message}
  <div class="alert alert-error mb-4">{form.message}</div>
{/if}

<div class="panel">
  <div class="panel-head"><h2>Usuarios registrados</h2></div>
  <div class="panel-body p-0">
    <div class="space-y-2 max-h-[70vh] overflow-y-auto">
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