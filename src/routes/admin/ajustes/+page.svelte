<script lang="ts">
  import { enhance } from '$app/forms';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  function stringify(value: unknown) {
    return typeof value === 'string' ? value : JSON.stringify(value);
  }
</script>

<svelte:head>
  <title>Ajustes — RolErrante</title>
</svelte:head>

<Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Ajustes' }]} class="mb-2" />

<PageHeader kicker="Panel admin" title="Ajustes del sistema" />

{#if form?.message}
  <div class="alert alert-error mb-4">{form.message}</div>
{/if}

<!-- design admin-ajustes.html: .set-card with .set-row per setting -->
<div class="set-card">
  <div class="set-head"><h2>Configuración</h2></div>
  <div class="set-body">
    {#each data.settings as setting, i (setting.key)}
      <form method="POST" action="?/saveSetting" use:enhance class="set-row">
        <input type="hidden" name="key" value={setting.key} />
        <div class="field">
          <label for="val_{setting.key}">{setting.key}</label>
          <input
            id="val_{setting.key}"
            name="value"
            type="text"
            class="input"
            value={stringify(setting.value)}
          />
        </div>
        <button type="submit" class="btn btn-primary btn-sm">Guardar</button>
      </form>
      {#if i < data.settings.length - 1}
        <hr class="set-divider" />
      {/if}
    {/each}
  </div>
</div>
