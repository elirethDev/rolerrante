<script lang="ts">
  import { enhance } from '$app/forms';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
  import { roleLabel } from '$lib/utils';
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
  <title>Usuarios — RolErrante</title>
</svelte:head>

<Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Usuarios' }]} class="mb-2" />

<PageHeader kicker="Panel admin" title="Gestión de usuarios" />

{#if form?.message}
  <div class="alert alert-error mb-4">{form.message}</div>
{/if}

<!-- design admin-usuarios.html: .u-row list with role select + Guardar -->
<div data-testid="lista-usuarios" class="stack max-h-[70vh] overflow-y-auto">
  {#each data.users as u (u.id)}
    <form method="POST" action="?/setRole" use:enhance class="u-row">
      <input type="hidden" name="user_id" value={u.id} />
      <div class="who">
        <b>@{u.username}</b>
        {#if u.display_name}<span>{u.display_name}</span>{/if}
      </div>
      <div class="role">
        <label class="field-hint" for="rk-{u.id}" style="margin:0">Rol</label>
        <select id="rk-{u.id}" name="role" class="select">
          <option value="pendiente" selected={u.role === 'pendiente'}>{roleLabel('pendiente')}</option>
          <option value="rolero" selected={u.role === 'rolero'}>{roleLabel('rolero')}</option>
          <option value="gm" selected={u.role === 'gm'}>{roleLabel('gm')}</option>
          <option value="admin" selected={u.role === 'admin'}>{roleLabel('admin')}</option>
        </select>
        <button type="submit" class="btn btn-primary btn-sm">Guardar</button>
      </div>
    </form>
  {/each}
</div>
