<script lang="ts">
  import { onMount } from 'svelte';
  import { PUBLIC_TURNSTILE_SITE_KEY } from '$env/static/public';

  export let token = '';
  export let theme: 'light' | 'dark' | 'auto' = 'auto';

  let container: HTMLDivElement;
  let widgetId: string | undefined;

  onMount(() => {
    // Cargar script si no está
    if (!document.querySelector('script[src*="turnstile"]')) {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    // Esperar a que turnstile esté disponible
    const interval = setInterval(() => {
      if (window.turnstile && container) {
        clearInterval(interval);
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
      }
    }, 100);

    return () => {
      clearInterval(interval);
      if (widgetId && window.turnstile) {
        window.turnstile.remove(widgetId);
      }
    };
  });
</script>

<div bind:this={container} />