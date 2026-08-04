<script lang="ts">
  import { onMount } from 'svelte';
  import { PUBLIC_TURNSTILE_SITE_KEY } from '$env/static/public';

  export let token = '';
  export let theme: 'light' | 'dark' | 'auto' = 'auto';

  export function reset(): void {
    token = '';
    if (widgetId && window.turnstile) {
      window.turnstile.reset(widgetId);
    }
  }

  let container: HTMLDivElement;
  let widgetId: string | undefined;

  // Module-level singleton — prevents duplicate script tags across component instances
  let scriptPromise: Promise<void> | null = null;

  function loadScript(): Promise<void> {
    if (scriptPromise) return scriptPromise;

    scriptPromise = new Promise((resolve, reject) => {
      // Clean up any stale Turnstile script tags first
      const stale = document.querySelectorAll('script[src*="turnstile"]');
      stale.forEach((s) => s.remove());

      // Reset turnstile global so it reinitialises clean
      delete (window as Window).turnstile;

      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error('Turnstile script failed to load'));
      };
      document.head.appendChild(script);
    });

    return scriptPromise;
  }

  onMount(() => {
    loadScript()
      .then(() => {
        if (!container || !window.turnstile) return;
        try {
          widgetId = window.turnstile.render(container, {
            sitekey: PUBLIC_TURNSTILE_SITE_KEY,
            theme,
            callback: (t: string) => {
              token = t;
            },
            'expired-callback': () => {
              token = '';
            },
            'error-callback': () => {
              token = '';
            },
          });
        } catch (e) {
          console.error('Turnstile render failed:', e);
        }
      })
      .catch((e) => {
        console.error('Turnstile load failed:', e);
      });

    return () => {
      if (widgetId && window.turnstile) {
        window.turnstile.remove(widgetId);
      }
    };
  });
</script>

<div bind:this={container}></div>