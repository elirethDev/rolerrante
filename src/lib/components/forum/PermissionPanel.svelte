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

<div class="card bg-base-200 border border-azeroth-border">
  <div class="card-body">
    <h3 class="card-title font-cinzel text-azeroth-gold">Permisos</h3>
    {#if form?.message}
      <div class="alert alert-error text-sm">{form.message}</div>
    {/if}
    <div class="space-y-3">
      {#each ROLES as role (role)}
        {@const flags = flagsFor(role)}
        <form
          method="POST"
          action={action}
          use:enhance
          class="flex flex-wrap items-center gap-3 rounded border border-azeroth-border p-3"
        >
          <input type="hidden" name={targetName} value={targetValue} />
          <input type="hidden" name="role" value={role} />
          <span class="w-24 font-semibold text-sm">{role}</span>
          {#each FLAGS as f (f.key)}
            <label class="label cursor-pointer">
              <span class="label-text mr-1">{f.label}</span>
              <input
                type="checkbox"
                name={f.key}
                class="checkbox checkbox-sm"
                checked={flags[f.key]}
              />
            </label>
          {/each}
          <button type="submit" class="btn btn-primary btn-sm ml-auto">Guardar</button>
        </form>
      {/each}
    </div>
  </div>
</div>
