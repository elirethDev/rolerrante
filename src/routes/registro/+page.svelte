<script lang="ts">
  import { enhance } from '$app/forms';
  import { resolve } from '$app/paths';
  import Field from '$lib/components/ui/Field.svelte';
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
        <Field label="Correo electrónico" required error={form?.errors?.email ?? null}>
          {#snippet ctrl()}
            <input id="email" name="email" type="email" class="input" value={form?.values?.email ?? ''} required />
          {/snippet}
        </Field>

        <Field label="Nombre de usuario" required error={form?.errors?.username ?? null}>
          {#snippet ctrl()}
            <input id="username" name="username" type="text" class="input" value={form?.values?.username ?? ''} required minlength="3" />
          {/snippet}
        </Field>

        <Field label="Nombre a mostrar (opcional)">
          {#snippet ctrl()}
            <input id="display_name" name="display_name" type="text" class="input" value={form?.values?.display_name ?? ''} />
          {/snippet}
        </Field>

        <Field label="Contraseña" required error={form?.errors?.password ?? null}>
          {#snippet ctrl()}
            <input id="password" name="password" type="password" class="input" required minlength="6" />
          {/snippet}
        </Field>

        <div class="flex justify-center">
          <Turnstile bind:token={turnstileToken} theme="dark" />
        </div>
        <input type="hidden" name="cf-turnstile-response" value={turnstileToken} />

        <SubmitButton class="w-full font-cinzel" disabled={!turnstileToken} pending={pending}>Registrarse</SubmitButton>
      </form>

      <div class="text-center text-sm mt-4">
        ¿Ya tienes cuenta? <a href={resolve('/login')} class="link link-primary">Entrar</a>
      </div>
    </div>
  </div>
</section>
