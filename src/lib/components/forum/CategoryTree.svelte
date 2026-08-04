<script lang="ts">
  import { FolderOpen, ChevronRight } from '@lucide/svelte';
  import type { CategoryNode } from '$lib/forum';
  import type { LastPostInfo } from '$lib/forum';

  let { categories }: { categories: CategoryNode[] } = $props();

  function lastPostBlock(last: LastPostInfo | null | undefined) {
    if (!last?.author_display_name) return null;
    return {
      author: last.author_display_name,
      avatar: last.avatar_url ?? '',
      alt: `Último mensaje de ${last.author_display_name}`,
    };
  }
</script>

<div class="grid gap-4 md:grid-cols-2">
  {#each categories as cat (cat.id)}
    <div
      class="card bg-base-200 border border-azeroth-border"
      data-category-hidden={cat.flags.can_view ? undefined : 'true'}
    >
      <div class="card-body">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h3 class="card-title font-cinzel text-azeroth-gold text-lg">
              <FolderOpen size={18} class="text-azeroth-gold" />
              {cat.name}
            </h3>
            {#if cat.description}
              <p class="text-sm text-azeroth-muted mt-1">{cat.description}</p>
            {/if}
          </div>
        </div>

        {#if cat.children.length > 0}
          <ul class="menu bg-base-100 rounded-box border border-azeroth-border mt-3 w-full">
            {#each cat.children.filter((c) => c.flags.can_view) as child (child.id)}
              {@const last = lastPostBlock(child.lastPost)}
              <li>
                <span class="flex items-center gap-2 w-full">
                  <ChevronRight size={14} class="text-azeroth-faint shrink-0" />
                  <span class="font-medium">{child.name}</span>
                  <span class="ml-auto text-xs text-azeroth-muted">
                    Temas {child.threads_count ?? 0}
                  </span>
                  <span class="text-xs text-azeroth-muted">Mensajes {child.posts_count ?? 0}</span>
                  {#if last}
                    <span
                      class="flex items-center gap-1 text-xs text-azeroth-text-soft"
                      title={`Último mensaje: ${last.author}`}
                    >
                      <img
                        src={last.avatar}
                        alt={last.alt}
                        class="w-5 h-5 rounded-full object-cover bg-azeroth-border"
                      />
                      {last.author}
                    </span>
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
