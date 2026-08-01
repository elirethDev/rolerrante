<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData } from './$types';
  import Turnstile from '$lib/components/ui/Turnstile.svelte';
  import SubmitButton from '$lib/components/ui/SubmitButton.svelte';

  export let form: ActionData;

  let pending = false;
  let turnstileToken = '';
</script>

<svelte:head>
  <title>Registro — RolErrante</title>
</svelte:head>

<section class="max-w-md mx-auto mt-10">
  <div class="card bg-base-200 border border-azeroth-border shadow-xl">
    <div class="card-body">
      <h1 class="card-title text-2xl font-cinzel text-azeroth-gold justify-center">Crear cuenta</h1>

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
        <div class="form-control">
          <label class="label" for="email"><span class="label-text">Correo electrónico</span></label>
          <input id="email" name="email" type="email" class="input input-bordered" value={form?.values?.email ?? ''} required />
          {#if form?.errors?.email}<span class="text-error text-xs mt-1">{form.errors.email}</span>{/if}
        </div>

        <div class="form-control">
          <label class="label" for="username"><span class="label-text">Nombre de usuario</span></label>
          <input id="username" name="username" type="text" class="input input-bordered" value={form?.values?.username ?? ''} required minlength="3" />
          {#if form?.errors?.username}<span class="text-error text-xs mt-1">{form.errors.username}</span>{/if}
        </div>

        <div class="form-control">
          <label class="label" for="display_name"><span class="label-text">Nombre a mostrar (opcional)</span></label>
          <input id="display_name" name="display_name" type="text" class="input input-bordered" value={form?.values?.display_name ?? ''} />
        </div>

        <div class="form-control">
          <label class="label" for="password"><span class="label-text">Contraseña</span></label>
          <input id="password" name="password" type="password" class="input input-bordered" required minlength="6" />
          {#if form?.errors?.password}<span class="text-error text-xs mt-1">{form.errors.password}</span>{/if}
        </div>

        <div class="flex justify-center">
          <Turnstile bind:token={turnstileToken} theme="dark" />
        </div>
        <input type="hidden" name="cf-turnstile-response" value={turnstileToken} />

        <SubmitButton class="w-full font-cinzel" disabled={!turnstileToken} pending={pending}>Registrarse</SubmitButton>
      </form>

      <div class="text-center text-sm mt-4">
        ¿Ya tienes cuenta? <a href="/login" class="link link-primary">Entrar</a>
      </div>
    </div>
  </div>
</section>
