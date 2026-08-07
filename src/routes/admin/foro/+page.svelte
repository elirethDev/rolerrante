<script lang="ts">
  import { enhance } from '$app/forms';
  import PermissionPanel from '$lib/components/forum/PermissionPanel.svelte';
  import Modal from '$lib/components/ui/Modal.svelte';
  import PageHeader from '$lib/components/ui/PageHeader.svelte';
  import Breadcrumbs from '$lib/components/ui/Breadcrumbs.svelte';
  import type { ActionData, PageData } from './$types';
  import type { Database } from '$lib/supabase/database.types';

  let { data, form }: { data: PageData; form: ActionData | null } = $props();

  const MIN_ROLE_OPTIONS: { value: string; label: string }[] = [
    { value: '', label: 'Público' },
    { value: 'rolero', label: 'Miembro' },
    { value: 'gm', label: 'Moderador' },
    { value: 'admin', label: 'GM' },
  ];

  // Reuse the generated Supabase Row type (RED-05) instead of duplicating the
  // categories schema by hand.
  type CategoryRow = Database['public']['Tables']['categories']['Row'];

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
    data.categories
      .filter((c) => !c.parent_id)
      .sort((a, b) => a.sort_order - b.sort_order),
  );
  const childrenOf = (id: string) =>
    data.categories
      .filter((c) => c.parent_id === id)
      .sort((a, b) => a.sort_order - b.sort_order);

  // Sort a flat list of sibling rows by (sort_order, id) for stable ordering.
  function sortSiblings(rows: CategoryRow[]) {
    return [...rows].sort(
      (a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id),
    );
  }
  const siblingsOf = (c: CategoryRow) => sortSiblings(data.categories.filter((k) => k.parent_id === c.parent_id));

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

<Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Foro' }]} class="mb-2" />

<PageHeader kicker="Panel admin" title="Gestión del foro" />

{#if form?.message}
  <div class="alert alert-error text-sm mb-4">{form.message}</div>
{/if}

<!-- design admin-foro.html: .cat-tree with .cat-root sections + per-category perms -->
<section class="cat-tree">
  <div class="cat-head">
    <h2>Categorías</h2>
    <button class="btn btn-primary btn-sm" onclick={() => (createOpen = true)}>
      Nueva categoría
    </button>
  </div>
  <div class="cat-body">
    {#each roots as root (root.id)}
      {@const siblings = siblingsOf(root)}
      <div class="cat-root">
        <div class="r-top">
          <div>
            <b>{root.name}</b>
            <span class="meta"> · orden {root.sort_order}</span>
            {#if !root.is_visible}<span class="tag">oculta</span>{/if}
            {#if root.requires_approval}<span class="tag">aprob. entrada</span>{/if}
            {#if root.min_read_role}<span class="tag gold">min {root.min_read_role}</span>{/if}
          </div>
          <div class="acts">
            <form method="POST" action="?/reorder" use:enhance>
              <input type="hidden" name="id" value={root.id} />
              <input type="hidden" name="direction" value="up" />
              <button
                type="submit"
                aria-label="Subir"
                title="Subir"
                disabled={root.id === siblings[0]?.id}
              >↑</button>
            </form>
            <form method="POST" action="?/reorder" use:enhance>
              <input type="hidden" name="id" value={root.id} />
              <input type="hidden" name="direction" value="down" />
              <button
                type="submit"
                aria-label="Bajar"
                title="Bajar"
                disabled={root.id === siblings[siblings.length - 1]?.id}
              >↓</button>
            </form>
            <button type="button" aria-label="Editar" title="Editar" onclick={() => openEdit(root)}>
              Editar
            </button>
            <form method="POST" action="?/toggleVisibility" use:enhance>
              <input type="hidden" name="id" value={root.id} />
              <input type="hidden" name="is_visible" value={root.is_visible ? '' : 'on'} />
              <button type="submit">{root.is_visible ? 'Ocultar' : 'Mostrar'}</button>
            </form>
            <form method="POST" action="?/deleteCategory" use:enhance>
              <input type="hidden" name="id" value={root.id} />
              <button
                type="submit"
                class="danger"
                onclick={(e: MouseEvent) => { if (!confirm('¿Eliminar esta categoría?')) e.preventDefault(); }}
              >
                Eliminar
              </button>
            </form>
          </div>
        </div>

        {#if childrenOf(root.id).length > 0}
          {@const childSiblings = childrenOf(root.id)}
          <ul>
            {#each childSiblings as child (child.id)}
              <li>
                <span>
                  {child.name}
                  {#if !child.is_visible}<span class="tag">oculta</span>{/if}
                  {#if child.requires_approval}<span class="tag">aprob. entrada</span>{/if}
                  {#if child.min_read_role}<span class="tag gold">min {child.min_read_role}</span>{/if}
                </span>
                <span class="ch-acts">
                  <form method="POST" action="?/reorder" use:enhance>
                    <input type="hidden" name="id" value={child.id} />
                    <input type="hidden" name="direction" value="up" />
                    <button
                      type="submit"
                      aria-label="Subir"
                      title="Subir"
                      disabled={child.id === childSiblings[0]?.id}
                    >↑</button>
                  </form>
                  <form method="POST" action="?/reorder" use:enhance>
                    <input type="hidden" name="id" value={child.id} />
                    <input type="hidden" name="direction" value="down" />
                    <button
                      type="submit"
                      aria-label="Bajar"
                      title="Bajar"
                      disabled={child.id === childSiblings[childSiblings.length - 1]?.id}
                    >↓</button>
                  </form>
                  <button type="button" aria-label="Editar" title="Editar" onclick={() => openEdit(child)}>
                    Editar
                  </button>
                  <form method="POST" action="?/toggleVisibility" use:enhance>
                    <input type="hidden" name="id" value={child.id} />
                    <input type="hidden" name="is_visible" value={child.is_visible ? '' : 'on'} />
                    <button type="submit">{child.is_visible ? 'Ocultar' : 'Mostrar'}</button>
                  </form>
                  <form method="POST" action="?/deleteCategory" use:enhance>
                    <input type="hidden" name="id" value={child.id} />
                    <button
                      type="submit"
                      onclick={(e: MouseEvent) => { if (!confirm('¿Eliminar esta categoría?')) e.preventDefault(); }}
                    >
                      Eliminar
                    </button>
                  </form>
                </span>
              </li>
            {/each}
          </ul>
        {/if}

        <PermissionPanel
          action="/admin/foro?/setSectionPermissions"
          targetName="categoryId"
          targetValue={root.id}
          permissions={data.sectionPermissions.filter((p) => p.category_id === root.id)}
          form={form}
        />
      </div>
    {/each}
    {#if roots.length === 0}
      <p class="muted" style="font-size:.9rem;padding:8px 0">
        Aún no hay categorías. Creá la primera con «Nueva categoría».
      </p>
    {/if}
  </div>
</section>

{#snippet categoryFields(v: CategoryForm, showVisibility: boolean)}
  <div class="field">
    <label for="cat-name">Nombre</label>
    <input id="cat-name" name="name" class="input" required value={v.name} />
  </div>
  <div class="field">
    <label for="cat-desc">Descripción</label>
    <textarea id="cat-desc" name="description" class="textarea" rows="2">{v.description}</textarea>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
    <div class="field">
      <label for="cat-parent">Categoría padre</label>
      <select id="cat-parent" name="parent_id" class="select">
        <option value="">(raíz)</option>
        {#each roots as root (root.id)}
          <option value={root.id} selected={v.parent_id === root.id}>{root.name}</option>
        {/each}
      </select>
    </div>
    <div class="field">
      <label for="cat-order">Orden</label>
      <input id="cat-order" name="sort_order" type="number" class="input" value={v.sort_order} />
    </div>
  </div>
  {#if showVisibility}
    <label class="check"><input type="checkbox" name="is_visible" checked={v.is_visible} /> Visible</label>
  {/if}
  <div class="field">
    <label for="cat-minrole">Rol mínimo de lectura</label>
    <select id="cat-minrole" name="min_read_role" class="select">
      {#each MIN_ROLE_OPTIONS as opt (opt.value)}
        <option value={opt.value} selected={v.min_read_role === opt.value}>{opt.label}</option>
      {/each}
    </select>
  </div>
  <label class="check"><input type="checkbox" name="requires_approval" checked={v.requires_approval} /> Requiere aprobación de entrada</label>
{/snippet}

<Modal bind:open={createOpen} title="Nueva categoría">
  {@const v = emptyForm()}
  <form method="POST" action="?/createCategory" use:enhance>
    <input type="hidden" name="id" value="" />
    {@render categoryFields(v, false)}
    <div class="modal-foot" style="margin-top:var(--s-5)">
      <button type="button" class="btn btn-ghost" onclick={() => (createOpen = false)}>Cancelar</button>
      <button type="submit" class="btn btn-primary">Crear</button>
    </div>
  </form>
</Modal>

{#if editForm}
  {@const v = editForm}
  <Modal bind:open={editOpen} title="Editar categoría">
    <form method="POST" action="?/updateCategory" use:enhance>
      <input type="hidden" name="id" value={v.id ?? ''} />
      {@render categoryFields(v, true)}
      <div class="modal-foot" style="margin-top:var(--s-5)">
        <button type="button" class="btn btn-ghost" onclick={() => (editOpen = false)}>Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar</button>
      </div>
    </form>
  </Modal>
{/if}
