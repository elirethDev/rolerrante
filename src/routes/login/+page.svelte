<script lang="ts">
  import { enhance } from '$app/forms';
  import { resolve } from '$app/paths';
  import Field from '$lib/components/ui/Field.svelte';
  import AuthShell from '$lib/components/ui/AuthShell.svelte';
  import Turnstile from '$lib/components/ui/Turnstile.svelte';
  import SubmitButton from '$lib/components/ui/SubmitButton.svelte';
  import type { ActionData, PageData } from './$types';

  export let data: PageData;
  export let form: ActionData;

  let pending = false;
  let turnstileToken = '';
  let turnstileRef: Turnstile | undefined;
</script>

<svelte:head>
  <title>Iniciar sesión — RolErrante</title>
</svelte:head>

<AuthShell title="Iniciar sesión" subtitle="Bienvenido de vuelta al salón del reino.">
  {#if data.registrado}
    <div class="alert alert-success text-sm mb-3">Cuenta creada. Ahora puedes iniciar sesión.</div>
  {/if}
  {#if data.reset}
    <div class="alert alert-success text-sm mb-3">Contraseña actualizada. Ahora puedes iniciar sesión.</div>
  {/if}
  {#if form?.message}
    <div class="alert alert-error text-sm mb-3">{form.message}</div>
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
        <input id="email" name="email" type="email" class="input" autocomplete="username" required />
      {/snippet}
    </Field>

    <Field label="Contraseña" required>
      {#snippet ctrl()}
        <input id="password" name="password" type="password" class="input" autocomplete="current-password" required />
      {/snippet}
    </Field>

    <div class="flex items-center justify-between gap-2 text-sm">
      <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" name="remember" class="checkbox checkbox-sm checkbox-primary" checked /> Recordarme</label>
      <a href={resolve('/forgot-password')} class="link link-hover link-primary">¿Olvidaste tu contraseña?</a>
    </div>
    <div class="flex justify-center">
      <Turnstile bind:this={turnstileRef} bind:token={turnstileToken} theme="dark" />
    </div>
    <input type="hidden" name="cf-turnstile-response" value={turnstileToken} />

    <SubmitButton class="w-full font-cinzel" disabled={!turnstileToken} pending={pending}>Entrar</SubmitButton>
  </form>

  <p class="text-center text-sm mt-4">
    ¿No tienes cuenta? <a href={resolve('/registro')} class="link link-primary">Crear cuenta</a>
  </p>
</AuthShell>
