<script lang="ts">
  import { enhance } from '$app/forms';
  import type { UserRole } from '$lib/types';

  type PermRow = {
    role: UserRole;
    can_view: boolean;
    can_post: boolean;
    can_edit: boolean;
    can_lock: boolean;
  };

  const ROLES: UserRole[] = ['pendiente', 'rolero', 'gm', 'admin'];
  const FLAGS = [
    { key: 'can_view', label: 'Ver' },
    { key: 'can_post', label: 'Publicar' },
    { key: 'can_edit', label: 'Editar' },
    { key: 'can_lock', label: 'Bloquear' },
  ] as const;

  interface Props {
    action: string;
    targetName: 'categoryId' | 'threadId';
    targetValue: string;
    permissions?: PermRow[];
    form?: { message?: string } | null;
  }

  let { action, targetName, targetValue, permissions = [], form = null }: Props = $props();

  function flagsFor(role: UserRole) {
    const row = permissions.find((p) => p.role === role);
    return {
      can_view: row?.can_view ?? false,
      can_post: row?.can_post ?? false,
      can_edit: row?.can_edit ?? false,
      can_lock: row?.can_lock ?? false,
    };
  }
</script>

<!-- design admin-foro.html: one .perm-row form per role with .check toggles -->
<div data-testid="perm-panel">
  {#if form?.message}
    <div class="alert alert-error text-sm">{form.message}</div>
  {/if}
  {#each ROLES as role (role)}
    {@const flags = flagsFor(role)}
    <form
      method="POST"
      action={action}
      use:enhance
      class="perm-row"
      style="gap:10px"
    >
      <input type="hidden" name={targetName} value={targetValue} />
      <input type="hidden" name="role" value={role} />
      <b style="width:76px;flex:none;color:var(--text-soft)">{role}</b>
      {#each FLAGS as f (f.key)}
        <label class="check">
          <input type="checkbox" name={f.key} checked={flags[f.key]} />
          {f.label}
        </label>
      {/each}
      <button type="submit" class="btn btn-primary btn-sm" style="margin-left:auto">
        Guardar
      </button>
    </form>
  {/each}
</div>
