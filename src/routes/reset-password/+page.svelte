<script lang="ts">
  import { enhance } from '$app/forms';
  import { resolve } from '$app/paths';
  import Field from '$lib/components/ui/Field.svelte';
  import AuthShell from '$lib/components/ui/AuthShell.svelte';
  import SubmitButton from '$lib/components/ui/SubmitButton.svelte';
  import type { ActionData } from './$types';

  export let form: ActionData;

  let pending = false;
</script>

<svelte:head>
  <title>Nueva contraseña — RolErrante</title>
</svelte:head>

<AuthShell title="Nueva contraseña" subtitle="Elegí una nueva contraseña para tu cuenta del salón.">
  {#if form?.message}
    <div class="alert alert-error text-sm mb-3">{form.message}</div>
  {/if}

  <form
    method="POST"
    use:enhance={() => {
      pending = true;
      return async ({ update }) => {
        await update();
        pending = false;
      };
    }}
    class="space-y-4"
  >
    <Field label="Nueva contraseña" required>
      {#snippet ctrl()}
        <input id="password" name="password" type="password" class="input" autocomplete="new-password" required minlength="6" />
      {/snippet}
    </Field>

    <Field label="Confirmar contraseña" required>
      {#snippet ctrl()}
        <input id="confirm_password" name="confirm_password" type="password" class="input" autocomplete="new-password" required minlength="6" />
      {/snippet}
    </Field>

    <SubmitButton class="w-full font-cinzel" pending={pending}>Guardar contraseña</SubmitButton>
  </form>

  <p class="text-center text-sm mt-4">
    ¿Ya la recordaste? <a href={resolve('/login')} class="link link-primary">Iniciar sesión</a>
  </p>
</AuthShell>
