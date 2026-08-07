<script lang="ts">
  import { enhance } from '$app/forms';
  import { resolve } from '$app/paths';
  import AuthShell from '$lib/components/ui/AuthShell.svelte';
  import SubmitButton from '$lib/components/ui/SubmitButton.svelte';
  import type { ActionData } from './$types';

  export let form: ActionData;

  let pending = false;
  let password = '';

  // Live strength preview (OD reset-password.html:62): "Débil / Buena / Fuerte".
  function strength(value: string) {
    let score = 0;
    if (value.length >= 8) score += 1;
    if (/[A-Z]/.test(value)) score += 1;
    if (/\d/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value)) score += 1;
    if (score < 2) return { label: 'Débil', width: 33, bar: 'bg-azeroth-danger-fg', text: 'text-azeroth-danger-fg' };
    if (score < 4) return { label: 'Buena', width: 66, bar: 'bg-azeroth-gold', text: 'text-azeroth-gold' };
    return { label: 'Fuerte', width: 100, bar: 'bg-azeroth-success-fg', text: 'text-azeroth-success-fg' };
  }
</script>

<svelte:head>
  <title>Nueva contraseña — RolErrante</title>
</svelte:head>

<AuthShell title="Nueva contraseña" subtitle="Elegí una nueva contraseña para tu cuenta del salón.">
  {#if form?.message}
    <div class="alert alert-error text-sm mb-3">{form.message}</div>
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
    class="auth-form"
  >
    <div class="field">
      <label for="password">Nueva contraseña</label>
      <input
        id="password"
        name="password"
        type="password"
        class="input"
        autocomplete="new-password"
        required
        minlength="6"
        bind:value={password}
      />
    </div>

    {#if password}
      {@const st = strength(password)}
      <div class="-mt-2" data-testid="pw-strength">
        <div
          class="h-1.5 w-full overflow-hidden rounded-full bg-azeroth-surface-3"
          aria-hidden="true"
          role="presentation"
        >
          <div class="h-full rounded-full transition-all duration-300 {st.bar}" style="width: {st.width}%;"></div>
        </div>
        <p class="mt-1 text-xs text-azeroth-muted" data-testid="pw-strength-label">
          Seguridad: <span class="font-semibold {st.text}">{st.label}</span>
        </p>
      </div>
    {/if}

    <div class="field">
      <label for="confirm_password">Confirmar contraseña</label>
      <input id="confirm_password" name="confirm_password" type="password" class="input" autocomplete="new-password" required minlength="6" />
    </div>

    <SubmitButton class="btn-lg btn-block" pending={pending}>Guardar contraseña</SubmitButton>
  </form>

  <p class="auth-alt">
    ¿Ya la recordaste? <a href={resolve('/login')}>Iniciar sesión</a>
  </p>
</AuthShell>
