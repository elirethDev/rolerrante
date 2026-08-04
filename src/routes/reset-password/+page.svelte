<script lang="ts">
  import { enhance } from '$app/forms';
  import { resolve } from '$app/paths';
  import Field from '$lib/components/ui/Field.svelte';
  import SubmitButton from '$lib/components/ui/SubmitButton.svelte';
  import type { ActionData } from './$types';

  export let form: ActionData;

  let pending = false;
</script>

<svelte:head>
  <title>Nueva contraseña — RolErrante</title>
</svelte:head>

<section class="max-w-md mx-auto mt-10">
  <div class="card bg-base-200 border border-azeroth-border shadow-xl">
    <div class="card-body">
<svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true" class="mx-auto mb-3" style="filter:drop-shadow(0 0 12px rgba(248,183,0,0.35))"><defs><linearGradient id="rps" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFC940"/><stop offset="0.5" stop-color="#F8B700"/><stop offset="1" stop-color="#C8941A"/></linearGradient></defs><circle cx="32" cy="32" r="27.5" stroke="url(#rps)" stroke-width="2"/><circle cx="32" cy="32" r="22.5" stroke="url(#rps)" stroke-width="0.75" opacity="0.45"/><path d="M32 13.5 L36.2 27.8 L50.5 32 L36.2 36.2 L32 50.5 L27.8 36.2 L13.5 32 L27.8 27.8 Z" fill="url(#rps)"/><path d="M18.5 48 C 25 41, 41 26, 47 19.5" stroke="url(#rps)" stroke-width="2.4" stroke-linecap="round" opacity="0.85"/><circle cx="18.5" cy="48" r="2.5" fill="url(#rps)"/><circle cx="47" cy="19.5" r="2" fill="url(#rps)"/></svg>
      <h1 class="card-title text-2xl font-cinzel text-azeroth-gold justify-center">Nueva contraseña</h1>
      <p class="text-sm text-azeroth-muted text-center mt-1">Elegí una nueva contraseña para tu cuenta del salón.</p>

      {#if form?.message}
        <div class="alert alert-error text-sm mt-2">{form.message}</div>
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
        class="space-y-4 mt-4"
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

      <div class="text-center text-sm mt-4">
        ¿Ya la recordaste? <a href={resolve('/login')} class="link link-primary">Iniciar sesión</a>
      </div>
    </div>
  </div>
</section>
