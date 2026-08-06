<script lang="ts">
  import { enhance } from '$app/forms';
  import { resolve } from '$app/paths';
  import Field from '$lib/components/ui/Field.svelte';
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
    class="space-y-4"
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

    <Field label="Confirmar contraseña" required error={form?.errors?.confirm_password ?? null}>
      {#snippet ctrl()}
        <input id="confirm_password" name="confirm_password" type="password" class="input" autocomplete="new-password" required minlength="6" />
      {/snippet}
    </Field>

    <label
      class="flex items-start gap-2 text-sm text-azeroth-muted cursor-pointer"
      data-error={form?.errors?.terms ? 'true' : undefined}
    >
      <input id="terms" name="terms" type="checkbox" value="on" class="checkbox checkbox-sm mt-0.5" required />
      <span>Acepto la normativa de la comunidad</span>
    </label>
    {#if form?.errors?.terms}
      <p class="text-error text-sm" id="terms-error" role="alert">{form.errors.terms}</p>
    {/if}

    <div class="flex justify-center">
      <Turnstile bind:this={turnstileRef} bind:token={turnstileToken} theme="dark" />
    </div>
    <input type="hidden" name="cf-turnstile-response" value={turnstileToken} />

    <SubmitButton class="w-full font-cinzel" disabled={!turnstileToken} pending={pending}>Registrarse</SubmitButton>
  </form>

  <p class="text-center text-sm mt-4">
    ¿Ya tienes cuenta? <a href={resolve('/login')} class="link link-primary">Entrar</a>
  </p>
</AuthShell>
