<script lang="ts">
  import { enhance } from '$app/forms';
  import { resolve } from '$app/paths';
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
    class="auth-form"
  >
    <div class="field">
      <label for="email">Correo electrónico</label>
      <input id="email" name="email" type="email" class="input" autocomplete="username" required />
    </div>

    <div class="field">
      <label for="password">Contraseña</label>
      <input id="password" name="password" type="password" class="input" autocomplete="current-password" required />
    </div>

    <div class="auth-links">
      <label class="check"><input type="checkbox" name="remember" checked /> Recordarme</label>
      <a href={resolve('/forgot-password')} style="color:var(--link-blue);font-weight:500">¿Olvidaste tu contraseña?</a>
    </div>
    <div class="flex justify-center">
      <Turnstile bind:this={turnstileRef} bind:token={turnstileToken} theme="dark" />
    </div>
    <input type="hidden" name="cf-turnstile-response" value={turnstileToken} />

    <SubmitButton class="btn-lg btn-block" disabled={!turnstileToken} pending={pending}>Entrar</SubmitButton>
  </form>

  <p class="auth-alt">
    ¿No tienes cuenta? <a href={resolve('/registro')}>Crear cuenta</a>
  </p>
</AuthShell>
