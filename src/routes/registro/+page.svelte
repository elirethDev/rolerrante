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
  let turnstileRef: Turnstile | undefined;
</script>

<svelte:head>
  <title>Registro — RolErrante</title>
</svelte:head>

<section class="max-w-md mx-auto mt-10">
  <div class="card bg-base-200 border border-azeroth-border shadow-xl">
    <div class="card-body">
<svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true" class="mx-auto mb-3" style="filter:drop-shadow(0 0 12px rgba(248,183,0,0.35))"><defs><linearGradient id="rgs" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFC940"/><stop offset="0.5" stop-color="#F8B700"/><stop offset="1" stop-color="#C8941A"/></linearGradient></defs><circle cx="32" cy="32" r="27.5" stroke="url(#rgs)" stroke-width="2"/><circle cx="32" cy="32" r="22.5" stroke="url(#rgs)" stroke-width="0.75" opacity="0.45"/><path d="M32 13.5 L36.2 27.8 L50.5 32 L36.2 36.2 L32 50.5 L27.8 36.2 L13.5 32 L27.8 27.8 Z" fill="url(#rgs)"/><path d="M18.5 48 C 25 41, 41 26, 47 19.5" stroke="url(#rgs)" stroke-width="2.4" stroke-linecap="round" opacity="0.85"/><circle cx="18.5" cy="48" r="2.5" fill="url(#rgs)"/><circle cx="47" cy="19.5" r="2" fill="url(#rgs)"/></svg>
      <h1 class="card-title text-2xl font-cinzel text-azeroth-gold justify-center">Crear cuenta</h1>

      {#if form?.message}
        <div class="alert alert-error text-sm mt-2">{form.message}</div>
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
        class="space-y-4 mt-4"
      >
        <Field label="Correo electrónico" required error={form?.errors?.email ?? null}>
          {#snippet ctrl()}
            <input id="email" name="email" type="email" class="input" autocomplete="email" value={form?.values?.email ?? ''} required />
          {/snippet}
        </Field>

        <Field label="Nombre de usuario" required error={form?.errors?.username ?? null}>
          {#snippet ctrl()}
            <input id="username" name="username" type="text" class="input" autocomplete="username" value={form?.values?.username ?? ''} required minlength="3" />
          {/snippet}
        </Field>

        <Field label="Nombre a mostrar (opcional)">
          {#snippet ctrl()}
            <input id="display_name" name="display_name" type="text" class="input" value={form?.values?.display_name ?? ''} />
          {/snippet}
        </Field>

        <Field label="Contraseña" required error={form?.errors?.password ?? null}>
          {#snippet ctrl()}
            <input id="password" name="password" type="password" class="input" autocomplete="new-password" required minlength="6" />
          {/snippet}
        </Field>

        <div class="flex justify-center">
          <Turnstile bind:this={turnstileRef} bind:token={turnstileToken} theme="dark" />
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
