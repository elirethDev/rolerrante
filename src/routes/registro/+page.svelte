<script lang="ts">
  import { enhance } from '$app/forms';
  import { resolve } from '$app/paths';
  import AuthShell from '$lib/components/ui/AuthShell.svelte';
  import type { ActionData } from './$types';
  import Turnstile from '$lib/components/ui/Turnstile.svelte';
  import SubmitButton from '$lib/components/ui/SubmitButton.svelte';

  export let form: ActionData;

  let pending = false;
  let turnstileToken = '';
  let turnstileRef: Turnstile | undefined;
</script>

<svelte:head>
  <title>Registro — RolErrante</title>
</svelte:head>

<AuthShell title="Crear cuenta" subtitle="Únete al reino y presenta tu primer personaje.">
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
      <input id="email" name="email" type="email" class="input {form?.errors?.email ? 'invalid' : ''}" autocomplete="email" value={form?.values?.email ?? ''} required />
      {#if form?.errors?.email}
        <p class="text-error text-sm" role="alert">{form.errors.email}</p>
      {/if}
    </div>

    <div class="field">
      <label for="username">Nombre de usuario</label>
      <input id="username" name="username" type="text" class="input {form?.errors?.username ? 'invalid' : ''}" autocomplete="username" value={form?.values?.username ?? ''} required minlength="3" />
      {#if form?.errors?.username}
        <p class="text-error text-sm" role="alert">{form.errors.username}</p>
      {/if}
    </div>

    <div class="field">
      <label for="display_name">Nombre a mostrar (opcional)</label>
      <input id="display_name" name="display_name" type="text" class="input" value={form?.values?.display_name ?? ''} />
    </div>

    <div class="field">
      <label for="password">Contraseña</label>
      <input id="password" name="password" type="password" class="input {form?.errors?.password ? 'invalid' : ''}" autocomplete="new-password" required minlength="6" />
      {#if form?.errors?.password}
        <p class="text-error text-sm" role="alert">{form.errors.password}</p>
      {/if}
    </div>

    <div class="field">
      <label for="confirm_password">Confirmar contraseña</label>
      <input id="confirm_password" name="confirm_password" type="password" class="input {form?.errors?.confirm_password ? 'invalid' : ''}" autocomplete="new-password" required minlength="6" />
      {#if form?.errors?.confirm_password}
        <p class="text-error text-sm" role="alert">{form.errors.confirm_password}</p>
      {/if}
    </div>

    <div class="auth-links">
      <label class="check" data-error={form?.errors?.terms ? 'true' : undefined}>
        <input id="terms" name="terms" type="checkbox" value="on" required />
        Acepto la normativa de la comunidad
      </label>
    </div>
    {#if form?.errors?.terms}
      <p class="text-error text-sm" id="terms-error" role="alert">{form.errors.terms}</p>
    {/if}

    <div class="flex justify-center">
      <Turnstile bind:this={turnstileRef} bind:token={turnstileToken} theme="dark" />
    </div>
    <input type="hidden" name="cf-turnstile-response" value={turnstileToken} />

    <SubmitButton class="btn-lg btn-block" disabled={!turnstileToken} pending={pending}>Registrarse</SubmitButton>
  </form>

  <p class="auth-alt">
    ¿Ya tienes cuenta? <a href={resolve('/login')}>Entrar</a>
  </p>
</AuthShell>
