<script lang="ts">
  import { enhance } from '$app/forms';
  import PermissionPanel from '$lib/components/forum/PermissionPanel.svelte';
  import Modal from '$lib/components/ui/Modal.svelte';
  import Field from '$lib/components/ui/Field.svelte';
  import type { ActionData, PageData } from './$types';
  import type { UserRole } from '$lib/types';

  let { data, form }: { data: PageData; form: ActionData | null } = $props();

  const MIN_ROLE_OPTIONS: { value: string; label: string }[] = [
    { value: '', label: 'Público' },
    { value: 'rolero', label: 'Miembro' },
    { value: 'gm', label: 'Moderador' },
    { value: 'admin', label: 'GM' },
  ];

  type CategoryRow = {
    id: string;
    name: string;
    description: string | null;
    parent_id: string | null;
    sort_order: number;
    is_visible: boolean;
    min_read_role: UserRole | null;
    requires_approval: boolean;
  };

  type CategoryForm = {
    id: string | null;
    name: string;
    description: string;
    parent_id: string;
    sort_order: number;
    is_visible: boolean;
    min_read_role: string;
    requires_approval: boolean;
  };

  const emptyForm = (): CategoryForm => ({
    id: null,
    name: '',
    description: '',
    parent_id: '',
    sort_order: 0,
    is_visible: true,
    min_read_role: '',
    requires_approval: false,
  });

  let createOpen = $state(false);
  let editOpen = $state(false);
  let editForm = $state<CategoryForm | null>(null);

  const roots = $derived<CategoryRow[]>(
    (data.categories as unknown as CategoryRow[])
      .filter((c) => !c.parent_id)
      .sort((a, b) => a.sort_order - b.sort_order),
  );
  const childrenOf = (id: string) =>
    (data.categories as unknown as CategoryRow[])
      .filter((c) => c.parent_id === id)
      .sort((a, b) => a.sort_order - b.sort_order);

  // Sort a flat list of sibling rows by (sort_order, id) for stable ordering.
  function sortSiblings(rows: CategoryRow[]) {
    return [...rows].sort(
      (a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id),
    );
  }
  const siblingsOf = (c: CategoryRow) => sortSiblings((data.categories as unknown as CategoryRow[]).filter((k) => k.parent_id === c.parent_id));

  function openEdit(c: CategoryRow) {
    editForm = {
      id: c.id,
      name: c.name,
      description: c.description ?? '',
      parent_id: c.parent_id ?? '',
      sort_order: c.sort_order,
      is_visible: c.is_visible,
      min_read_role: c.min_read_role ?? '',
      requires_approval: c.requires_approval,
    };
    editOpen = true;
  }
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
      <button class="btn btn-primary btn-sm" onclick={() => (createOpen = true)}>
        Nueva categoría
      </button>
    </div>

    <div class="space-y-2 mt-2">
      {#each roots as root (root.id)}
        {@const siblings = siblingsOf(root)}
        <div class="border border-azeroth-border rounded p-3">
          <div class="flex items-center justify-between gap-2">
            <div>
              <span class="font-semibold">{root.name}</span>
              {#if !root.is_visible}
                <span class="badge badge-warning badge-sm ml-2">oculta</span>
              {/if}
              {#if root.requires_approval}
                <span class="badge badge-info badge-sm ml-1">aprob. entrada</span>
              {/if}
              {#if root.min_read_role}
                <span class="badge badge-ghost badge-sm ml-1">min {root.min_read_role}</span>
              {/if}
              <span class="text-xs text-azeroth-faint ml-2">orden {root.sort_order}</span>
            </div>
            <div class="flex items-center gap-1">
              <form method="POST" action="?/reorder" use:enhance>
                <input type="hidden" name="id" value={root.id} />
                <input type="hidden" name="direction" value="up" />
                <button
                  type="submit"
                  class="btn btn-ghost btn-xs"
                  aria-label="Subir"
                  disabled={root.id === siblings[0]?.id}
                >↑</button>
              </form>
              <form method="POST" action="?/reorder" use:enhance>
                <input type="hidden" name="id" value={root.id} />
                <input type="hidden" name="direction" value="down" />
                <button
                  type="submit"
                  class="btn btn-ghost btn-xs"
                  aria-label="Bajar"
                  disabled={root.id === siblings[siblings.length - 1]?.id}
                >↓</button>
              </form>
              <button
                class="btn btn-ghost btn-xs"
                onclick={() => openEdit(root)}
                aria-label="Editar"
              >
                Editar
              </button>
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
            {@const childSiblings = childrenOf(root.id)}
            <ul class="mt-2 pl-4 space-y-1">
              {#each childSiblings as child (child.id)}
                <li class="flex items-center justify-between gap-2">
                  <span class="text-sm">
                    {child.name}
                    {#if child.requires_approval}
                      <span class="badge badge-info badge-sm ml-1">aprob. entrada</span>
                    {/if}
                    {#if child.min_read_role}
                      <span class="badge badge-ghost badge-sm ml-1">min {child.min_read_role}</span>
                    {/if}
                    {#if !child.is_visible}
                      <span class="badge badge-warning badge-sm ml-1">oculta</span>
                    {/if}
                  </span>
                  <div class="flex items-center gap-1">
                    <form method="POST" action="?/reorder" use:enhance>
                      <input type="hidden" name="id" value={child.id} />
                      <input type="hidden" name="direction" value="up" />
                      <button
                        type="submit"
                        class="btn btn-ghost btn-xs"
                        aria-label="Subir"
                        disabled={child.id === childSiblings[0]?.id}
                      >↑</button>
                    </form>
                    <form method="POST" action="?/reorder" use:enhance>
                      <input type="hidden" name="id" value={child.id} />
                      <input type="hidden" name="direction" value="down" />
                      <button
                        type="submit"
                        class="btn btn-ghost btn-xs"
                        aria-label="Bajar"
                        disabled={child.id === childSiblings[childSiblings.length - 1]?.id}
                      >↓</button>
                    </form>
                    <button class="btn btn-ghost btn-xs" aria-label="Editar" onclick={() => openEdit(child)}>
                      Editar
                    </button>
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
      {#if roots.length === 0}
        <p class="text-azeroth-faint text-sm py-2">Aún no hay categorías. Creá la primera con «Nueva categoría».</p>
      {/if}
    </div>
  </div>
</section>

{#snippet categoryFields(v: CategoryForm, showVisibility: boolean)}
  <Field label="Nombre" required size="sm">
    {#snippet ctrl()}
      <input name="name" class="input input-sm" required value={v.name} />
    {/snippet}
  </Field>
  <Field label="Descripción" size="sm">
    {#snippet ctrl()}
      <textarea name="description" class="textarea textarea-sm" rows="2">{v.description}</textarea>
    {/snippet}
  </Field>
  <Field label="Categoría padre" size="sm">
    {#snippet ctrl()}
      <select name="parent_id" class="select select-sm">
        <option value="">(raíz)</option>
        {#each roots as root (root.id)}
          <option value={root.id} selected={v.parent_id === root.id}>{root.name}</option>
        {/each}
      </select>
    {/snippet}
  </Field>
  <Field label="Orden" size="sm">
    {#snippet ctrl()}
      <input name="sort_order" type="number" class="input input-sm" value={v.sort_order} />
    {/snippet}
  </Field>
  {#if showVisibility}
    <label class="label cursor-pointer justify-start gap-2">
      <input type="checkbox" name="is_visible" class="checkbox checkbox-sm" checked={v.is_visible} />
      <span class="label-text text-sm">Visible</span>
    </label>
  {/if}
  <Field label="Rol mínimo de lectura" hint="Público lo ve cualquiera; Miembro/Moderador/GM restringen" size="sm">
    {#snippet ctrl()}
      <select name="min_read_role" class="select select-sm">
        {#each MIN_ROLE_OPTIONS as opt (opt.value)}
          <option value={opt.value} selected={v.min_read_role === opt.value}>{opt.label}</option>
        {/each}
      </select>
    {/snippet}
  </Field>
  <label class="label cursor-pointer justify-start gap-2">
    <input type="checkbox" name="requires_approval" class="checkbox checkbox-sm" checked={v.requires_approval} />
    <span class="label-text text-sm">Requiere aprobación de entrada</span>
  </label>
{/snippet}

<Modal bind:open={createOpen} title="Nueva categoría">
  {@const v = emptyForm()}
  <div class="space-y-3">
    <form method="POST" action="?/createCategory" use:enhance class="space-y-3">
      <input type="hidden" name="id" value="" />
      {@render categoryFields(v, false)}
      <button type="submit" class="btn btn-primary btn-sm">Crear</button>
    </form>
  </div>
</Modal>

{#if editForm}
  {@const v = editForm}
  <Modal bind:open={editOpen} title="Editar categoría">
    <div class="space-y-3">
      <form method="POST" action="?/updateCategory" use:enhance class="space-y-3">
        <input type="hidden" name="id" value={v.id ?? ''} />
        {@render categoryFields(v, true)}
        <button type="submit" class="btn btn-primary btn-sm">Guardar</button>
      </form>
    </div>
  </Modal>
{/if}
