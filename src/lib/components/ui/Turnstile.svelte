<script lang="ts">
  import { onMount } from 'svelte';
  import { PUBLIC_TURNSTILE_SITE_KEY } from '$env/static/public';

  export let token = '';
  export let theme: 'light' | 'dark' | 'auto' = 'auto';

  let container: HTMLDivElement;
  let widgetId: string | undefined;

  function loadScript(): Promise<void> {
    return new Promise((resolve) => {
      if (document.querySelector('script[src*="turnstile"]')) {
        if (window.turnstile) { resolve(); return; }
      }
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      document.head.appendChild(script);
    });
  }

  onMount(() => {
    loadScript().then(() => {
      if (!container || !window.turnstile) return;
      widgetId = window.turnstile.render(container, {
        sitekey: PUBLIC_TURNSTILE_SITE_KEY,
        theme,
        callback: (t: string) => {
          token = t;
        },
        'expired-callback': () => {
          token = '';
        },
      });
    });

    return () => {
      if (widgetId && window.turnstile) {
        window.turnstile.remove(widgetId);
      }
    };
  });
</script>

<div bind:this={container}></div>