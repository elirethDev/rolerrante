<script lang="ts">
  import { enhance } from '$app/forms';
  import { resolve } from '$app/paths';
  import Field from '$lib/components/ui/Field.svelte';
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

<section class="max-w-md mx-auto mt-10">
  <div class="card bg-base-200 border border-azeroth-border shadow-xl">
    <div class="card-body">
<svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true" class="mx-auto mb-3" style="filter:drop-shadow(0 0 12px rgba(248,183,0,0.35))"><defs><linearGradient id="fps" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFC940"/><stop offset="0.5" stop-color="#F8B700"/><stop offset="1" stop-color="#C8941A"/></linearGradient></defs><circle cx="32" cy="32" r="27.5" stroke="url(#fps)" stroke-width="2"/><circle cx="32" cy="32" r="22.5" stroke="url(#fps)" stroke-width="0.75" opacity="0.45"/><path d="M32 13.5 L36.2 27.8 L50.5 32 L36.2 36.2 L32 50.5 L27.8 36.2 L13.5 32 L27.8 27.8 Z" fill="url(#fps)"/><path d="M18.5 48 C 25 41, 41 26, 47 19.5" stroke="url(#fps)" stroke-width="2.4" stroke-linecap="round" opacity="0.85"/><circle cx="18.5" cy="48" r="2.5" fill="url(#fps)"/><circle cx="47" cy="19.5" r="2" fill="url(#fps)"/></svg>
      <h1 class="card-title text-2xl font-cinzel text-azeroth-gold justify-center">¿Olvidaste tu contraseña?</h1>
      <p class="text-sm text-azeroth-muted text-center mt-1">Ingresá el correo de tu cuenta y te vamos a enviar un enlace para restablecer tu contraseña.</p>

      {#if form?.message && !form?.success}
        <div class="alert alert-error text-sm mt-2">{form.message}</div>
      {/if}
      {#if form?.success}
        <div class="alert alert-success text-sm mt-2">{form.message}</div>
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

      <div class="text-center text-sm mt-4">
        ¿Recordás tu contraseña? <a href={resolve('/login')} class="link link-primary">Iniciar sesión</a>
      </div>
    </div>
  </div>
</section>
