<script lang="ts">
  import '../app.css';
  import '@fontsource/cinzel/400.css';
  import '@fontsource/cinzel/600.css';
  import '@fontsource/cinzel/700.css';
  import '@fontsource/inter/300.css';
  import '@fontsource/inter/400.css';
  import '@fontsource/inter/500.css';
  import '@fontsource/inter/600.css';
  import { page } from '$app/state';
  import Navbar from '$lib/components/ui/Navbar.svelte';
</script>

<div data-theme="azeroth" class="min-h-screen bg-base-100 text-base-content overscroll-none">
  <Navbar user={page.data.user} profile={page.data.profile} />
  <main class="container mx-auto px-4 py-6">
    <slot />
  </main>
</div>
