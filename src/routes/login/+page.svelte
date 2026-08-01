<script lang="ts">
  import { enhance } from '$app/forms';
  import Turnstile from '$lib/components/ui/Turnstile.svelte';
  import SubmitButton from '$lib/components/ui/SubmitButton.svelte';
  import type { ActionData, PageData } from './$types';

  export let data: PageData;
  export let form: ActionData;

  let pending = false;
  let turnstileToken = '';
</script>

<svelte:head>
  <title>Iniciar sesión — RolErrante</title>
</svelte:head>

<section class="max-w-md mx-auto mt-10">
  <div class="card bg-base-200 border border-azeroth-border shadow-xl">
    <div class="card-body">
      <h1 class="card-title text-2xl font-cinzel text-azeroth-gold justify-center">Iniciar sesión</h1>

      {#if data.registrado}
        <div class="alert alert-success text-sm mt-2">Cuenta creada. Ahora puedes iniciar sesión.</div>
      {/if}
      {#if form?.message}
        <div class="alert alert-error text-sm mt-2">{form.message}</div>
      {/if}

      <form
        method="POST"
        use:enhance={() => {
          pending = true;
          return async ({ result, update }) => {
            pending = false;
            await update();
          };
        }}
        class="space-y-4 mt-4"
      >
        <fieldset class="fieldset">
          <legend class="fieldset-legend">Correo electrónico</legend>
          <input id="email" name="email" type="email" class="input" required />
        </fieldset>

        <fieldset class="fieldset">
          <legend class="fieldset-legend">Contraseña</legend>
          <input id="password" name="password" type="password" class="input" required />
        </fieldset>

        <div class="flex justify-center">
          <Turnstile bind:token={turnstileToken} theme="dark" />
        </div>
        <input type="hidden" name="cf-turnstile-response" value={turnstileToken} />

        <SubmitButton class="w-full font-cinzel" disabled={!turnstileToken} pending={pending}>Entrar</SubmitButton>
      </form>

      <div class="text-center text-sm mt-4">
        ¿No tienes cuenta? <a href="/registro" class="link link-primary">Crear cuenta</a>
      </div>
    </div>
  </div>
</section>