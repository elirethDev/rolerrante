<script lang="ts">
  import { enhance } from '$app/forms';
  import PermissionPanel from '$lib/components/forum/PermissionPanel.svelte';
  import Field from '$lib/components/ui/Field.svelte';
  import type { ActionData, PageData } from './$types';

  let { data, form }: { data: PageData; form: ActionData | null } = $props();

  let showCreate = $state(false);

  type CategoryRow = {
    id: string;
    name: string;
    description: string | null;
    parent_id: string | null;
    sort_order: number;
    is_visible: boolean;
  };

  const roots = $derived<CategoryRow[]>(
    (data.categories as CategoryRow[]).filter((c) => !c.parent_id),
  );
  const childrenOf = (id: string) =>
    (data.categories as CategoryRow[]).filter((c) => c.parent_id === id);
</script>

<svelte:head>
  <title>Foro — Panel Admin</title>
</svelte:head>

<h1 class="text-3xl font-cinzel text-azeroth-gold mb-6">Gestión del foro</h1>

{#if form?.message}
  <div class="alert alert-error text-sm mb-4">{form.message}</div>
{/if}

<section class="card bg-base-200 border border-azeroth-border mb-6">
  <div class="card-body">
    <div class="flex items-center justify-between">
      <h2 class="card-title font-cinzel text-azeroth-gold">Categorías</h2>
      <button class="btn btn-primary btn-sm" onclick={() => (showCreate = !showCreate)}>
        {showCreate ? 'Cancelar' : 'Nueva categoría'}
      </button>
    </div>

    {#if showCreate}
      <form method="POST" action="?/createCategory" use:enhance class="space-y-3 mt-3 p-3 bg-base-100 rounded border border-azeroth-border">
        <Field label="Nombre" required size="sm">
          {#snippet ctrl()}
            <input name="name" class="input input-sm" required />
          {/snippet}
        </Field>
        <Field label="Descripción" size="sm">
          {#snippet ctrl()}
            <textarea name="description" class="textarea textarea-sm" rows="2"></textarea>
          {/snippet}
        </Field>
        <Field label="Categoría padre" size="sm">
          {#snippet ctrl()}
            <select name="parent_id" class="select select-sm">
              <option value="">(raíz)</option>
              {#each roots as root (root.id)}
                <option value={root.id}>{root.name}</option>
              {/each}
            </select>
          {/snippet}
        </Field>
        <Field label="Orden" size="sm">
          {#snippet ctrl()}
            <input name="sort_order" type="number" class="input input-sm" value={0} />
          {/snippet}
        </Field>
        <button type="submit" class="btn btn-primary btn-sm">Crear</button>
      </form>
    {/if}

    <div class="space-y-2 mt-2">
      {#each roots as root (root.id)}
        <div class="border border-azeroth-border rounded p-3">
          <div class="flex items-center justify-between gap-2">
            <div>
              <span class="font-semibold">{root.name}</span>
              {#if !root.is_visible}
                <span class="badge badge-warning badge-sm ml-2">oculta</span>
              {/if}
              <span class="text-xs text-gray-500 ml-2">orden {root.sort_order}</span>
            </div>
            <div class="flex gap-1">
              <form method="POST" action="?/toggleVisibility" use:enhance>
                <input type="hidden" name="id" value={root.id} />
                <input type="hidden" name="is_visible" value={root.is_visible ? '' : 'on'} />
                <button type="submit" class="btn btn-ghost btn-xs">
                  {root.is_visible ? 'Ocultar' : 'Mostrar'}
                </button>
              </form>
              <form method="POST" action="?/deleteCategory" use:enhance>
                <input type="hidden" name="id" value={root.id} />
                <button type="submit" class="btn btn-error btn-xs"
                  onclick={(e: MouseEvent) => { if (!confirm('¿Eliminar esta categoría?')) e.preventDefault(); }}>
                  Eliminar
                </button>
              </form>
            </div>
          </div>

          {#if childrenOf(root.id).length > 0}
            <ul class="mt-2 pl-4 space-y-1">
              {#each childrenOf(root.id) as child (child.id)}
                <li class="flex items-center justify-between gap-2">
                  <span class="text-sm">
                    {child.name}
                    {#if !child.is_visible}
                      <span class="badge badge-warning badge-sm ml-1">oculta</span>
                    {/if}
                  </span>
                  <div class="flex gap-1">
                    <form method="POST" action="?/toggleVisibility" use:enhance>
                      <input type="hidden" name="id" value={child.id} />
                      <input type="hidden" name="is_visible" value={child.is_visible ? '' : 'on'} />
                      <button type="submit" class="btn btn-ghost btn-xs">
                        {child.is_visible ? 'Ocultar' : 'Mostrar'}
                      </button>
                    </form>
                    <form method="POST" action="?/deleteCategory" use:enhance>
                      <input type="hidden" name="id" value={child.id} />
                      <button type="submit" class="btn btn-error btn-xs"
                        onclick={(e: MouseEvent) => { if (!confirm('¿Eliminar esta categoría?')) e.preventDefault(); }}>
                        Eliminar
                      </button>
                    </form>
                  </div>
                </li>
              {/each}
            </ul>
          {/if}

          <div class="mt-3">
            <PermissionPanel
              action="/admin/foro?/setSectionPermissions"
              targetName="categoryId"
              targetValue={root.id}
              permissions={data.sectionPermissions.filter((p) => p.category_id === root.id)}
              form={form}
            />
          </div>
        </div>
      {/each}
    </div>
  </div>
</section>
