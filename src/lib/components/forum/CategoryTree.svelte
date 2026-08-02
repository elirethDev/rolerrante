<script lang="ts">
  import { FolderOpen, ChevronRight } from '@lucide/svelte';
  import type { CategoryNode } from '$lib/forum';

  let { categories }: { categories: CategoryNode[] } = $props();
</script>

<div class="grid gap-4 md:grid-cols-2">
  {#each categories as cat (cat.id)}
    <div
      class="card bg-base-200 border border-azeroth-border"
      data-category-hidden={cat.flags.can_view ? undefined : 'true'}
    >
      <div class="card-body">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="card-title font-cinzel text-azeroth-gold text-lg">
              <FolderOpen size={18} class="text-azeroth-gold" />
              {cat.name}
            </h3>
            {#if cat.description}
              <p class="text-sm text-gray-400 mt-1">{cat.description}</p>
            {/if}
          </div>
          {#if (cat.threads ?? []).length > 0}
            <span class="badge badge-neutral badge-sm">{(cat.threads ?? []).length}</span>
          {/if}
        </div>

        {#if cat.children.length > 0}
          <ul class="menu bg-base-100 rounded-box border border-azeroth-border mt-3 w-full">
            {#each cat.children.filter((c) => c.flags.can_view) as child (child.id)}
              <li>
                <span class="flex items-center gap-2">
                  <ChevronRight size={14} class="text-gray-500" />
                  {child.name}
                  {#if (child.threads ?? []).length > 0}
                    <span class="badge badge-ghost badge-xs ml-auto">{(child.threads ?? []).length}</span>
                  {/if}
                </span>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    </div>
  {/each}
</div>
