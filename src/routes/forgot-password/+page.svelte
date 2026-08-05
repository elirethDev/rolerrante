<script lang="ts">
  import { enhance } from '$app/forms';
  import { resolve } from '$app/paths';
  import Field from '$lib/components/ui/Field.svelte';
  import AuthShell from '$lib/components/ui/AuthShell.svelte';
  import Turnstile from '$lib/components/ui/Turnstile.svelte';
  import SubmitButton from '$lib/components/ui/SubmitButton.svelte';
  import type { ActionData } from './$types';

  export let form: ActionData;

  let pending = false;
  let turnstileToken = '';
  let turnstileRef: Turnstile | undefined;
</script>

<svelte:head>
  <title>¿Olvidaste tu contraseña? — RolErrante</title>
</svelte:head>

<AuthShell title="¿Olvidaste tu contraseña?" subtitle="Ingresá el correo de tu cuenta y te enviaremos un enlace para restablecerla.">
  {#if form?.message && !form?.success}
    <div class="alert alert-error text-sm mb-3">{form.message}</div>
  {/if}
  {#if form?.success}
    <div class="alert alert-success text-sm mb-3">{form.message}</div>
  {/if}

  <form
    method="POST"
    use:enhance={() => {
      pending = true;
      return async ({ result, update }) => {
        await update();
        pending = false;
        turnstileRef?.reset();
      };
    }}
    class="space-y-4"
  >
    <Field label="Correo electrónico" required>
      {#snippet ctrl()}
        <input id="email" name="email" type="email" class="input" autocomplete="email" required />
      {/snippet}
    </Field>

    <div class="flex justify-center">
      <Turnstile bind:this={turnstileRef} bind:token={turnstileToken} theme="dark" />
    </div>
    <input type="hidden" name="cf-turnstile-response" value={turnstileToken} />

    <SubmitButton class="w-full font-cinzel" disabled={!turnstileToken} pending={pending}>Enviar enlace</SubmitButton>
  </form>

  <p class="text-center text-sm mt-4">
    ¿Recordás tu contraseña? <a href={resolve('/login')} class="link link-primary">Iniciar sesión</a>
  </p>
</AuthShell>
