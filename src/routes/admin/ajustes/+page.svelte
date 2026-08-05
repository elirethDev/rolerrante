<script lang="ts">
  import { enhance } from '$app/forms';
  import Field from '$lib/components/ui/Field.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  function stringify(value: unknown) {
    return typeof value === 'string' ? value : JSON.stringify(value);
  }
</script>

<svelte:head>
  <title>Ajustes — RolErrante</title>
</svelte:head>

<PageHeader kicker="Panel admin" title="Ajustes del sistema" />

{#if form?.message}
  <div class="alert alert-error mb-4">{form.message}</div>
{/if}

<div class="panel">
  <div class="panel-head"><h2>Configuración</h2><span class="meta">claves guardadas</span></div>
  <div class="panel-body py-4">
    <div class="space-y-3">
      {#each data.settings as setting (setting.key)}
        <form
          method="POST"
          action="?/saveSetting"
          use:enhance
          class="flex gap-2 items-end"
        >
          <input type="hidden" name="key" value={setting.key} />
          <Field label={setting.key} size="sm" class="flex-1">
            {#snippet ctrl()}
              <input
                id="val_{setting.key}"
                name="value"
                type="text"
                class="input input-sm"
                value={stringify(setting.value)}
              />
            {/snippet}
          </Field>
          <button type="submit" class="btn btn-primary btn-sm">Guardar</button>
        </form>
      {/each}
    </div>
  </div>
</div>
