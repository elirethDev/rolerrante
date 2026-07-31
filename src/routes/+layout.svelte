<script lang="ts">
  import '../app.css';
  import { page } from '$app/state';
  import Navbar from '$lib/components/ui/Navbar.svelte';
</script>

<div data-theme="azeroth" class="min-h-screen bg-base-100 text-base-content overscroll-none">
  <Navbar user={page.data.user} profile={page.data.profile} />
  <main class="container mx-auto px-4 py-6">
    <slot />
  </main>
</div>
