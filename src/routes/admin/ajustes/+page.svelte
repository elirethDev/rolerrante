<script lang="ts">
  import { enhance } from '$app/forms';
  import Field from '$lib/components/forms/Field.svelte';
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  function stringify(value: unknown) {
    return typeof value === 'string' ? value : JSON.stringify(value);
  }
</script>

<svelte:head>
  <title>Ajustes — RolErrante</title>
</svelte:head>

<h1 class="text-3xl font-cinzel text-azeroth-gold mb-6">Ajustes del sistema</h1>

{#if form?.message}
  <div class="alert alert-error mb-4">{form.message}</div>
{/if}

<div class="card bg-base-200 border border-azeroth-border">
  <div class="card-body">
    <h2 class="card-title font-cinzel text-azeroth-gold">Configuración</h2>
    <div class="space-y-3 mt-2">
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