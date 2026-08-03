<script lang="ts">
  /* eslint-disable svelte/no-navigation-without-resolve -- page-number hrefs are same-route ?page= query links, not named routes */
  let {
    currentPage,
    totalPages,
  }: {
    currentPage: number;
    totalPages: number;
  } = $props();
</script>

{#if totalPages > 1}
  <nav aria-label="Paginación del hilo" class="join">
    <a
      class="btn btn-sm join-item"
      class:btn-disabled={currentPage <= 1}
      aria-disabled={currentPage <= 1}
      href={`?page=${Math.max(1, currentPage - 1)}`}
    >
      Anterior
    </a>
    {#each Array.from({ length: totalPages }, (_, i) => i + 1) as page (page)}
      <a
        class="btn btn-sm join-item"
        class:btn-active={page === currentPage}
        aria-current={page === currentPage ? 'page' : undefined}
        href={`?page=${page}`}
      >
        {page}
      </a>
    {/each}
    <a
      class="btn btn-sm join-item"
      class:btn-disabled={currentPage >= totalPages}
      aria-disabled={currentPage >= totalPages}
      href={`?page=${Math.min(totalPages, currentPage + 1)}`}
    >
      Siguiente
    </a>
  </nav>
{/if}
